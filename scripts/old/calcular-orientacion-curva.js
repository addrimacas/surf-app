#!/usr/bin/env node
/**
 * Curva de exposición angular (visibility map) — paralelo a calcular-orientacion-v3.js
 *
 * En vez de un solo ángulo "ganador", modela distance_to_land(θ) en 0–360° y deriva:
 *   - orientation: ángulo con mayor distancia libre de tierra
 *   - window: rango de ángulos con distancia ≥ umbral × máximo (p. ej. 75%)
 *   - exposureScore: media de distancias / MAX_KM (0–1, indica "apertura" global)
 *   - opcional: pistas de segundo pico (doble exposición)
 *
 * Requiere: scripts/ne_10m_land.geojson (mismo origen que v3)
 * Uso:
 *   node scripts/calcular-orientacion-curva.js
 *   node scripts/calcular-orientacion-curva.js --solo=Riazor
 *   node scripts/calcular-orientacion-curva.js --json > curva-export.json
 */

const fs = require('fs');
const path = require('path');
const turf = require('@turf/turf');

// ─── Tierra (Natural Earth, recorte Galicia) — idéntico a v3 ─────────────────
const landPath = path.join(__dirname, 'ne_10m_land.geojson');
if (!fs.existsSync(landPath)) {
  console.error('❌ Falta ne_10m_land.geojson en scripts/');
  console.error('   Ver calcular-orientacion-v3.js (descarga Natural Earth ne_10m_land).');
  process.exit(1);
}

const landRaw = JSON.parse(fs.readFileSync(landPath, 'utf8'));
const BBOX = [-10.5, 41.5, -7.5, 44.5];
const land = turf.featureCollection(
  landRaw.features.filter(f => {
    const bb = turf.bbox(f);
    return bb[0] < BBOX[2] && bb[2] > BBOX[0] && bb[1] < BBOX[3] && bb[3] > BBOX[1];
  })
);

/** Bbox por polígono (evita booleanPointInPolygon en 1k+ features por punto) */
const LAND_BB = land.features.map(f => ({ f, bb: turf.bbox(f) }));

function esTierra(lon, lat) {
  const pt = turf.point([lon, lat]);
  for (const { f, bb } of LAND_BB) {
    if (lon < bb[0] || lon > bb[2] || lat < bb[1] || lat > bb[3]) continue;
    if (turf.booleanPointInPolygon(pt, f)) return true;
  }
  return false;
}

// ─── Parámetros curva (ajustables: más fino = más lento) ─────────────────────
// 5° ≈ mismo paso que orientacion-v3.js — suficiente para la curva; 2° es más fino pero ~2.5× rayos
const STEP_ANGLE = parseInt(process.env.SALITRE_CURVE_STEP || '5', 10);
const STEP_KM = Number(process.env.SALITRE_CURVE_STEP_KM || '1'); // km; 0.5 = más preciso
const MAX_KM = 25; // foco en "mar delante de la playa"
const WINDOW_RATIO = 0.75; // ángulos con dist ≥ 75% del máximo

/**
 * Distancia máxima recorrible en dirección bearing (0=N, horario) sin tocar tierra.
 */
function distanciaLibreKm(lat, lon, bearingDeg) {
  const origin = turf.point([lon, lat]);
  let libre = 0;
  for (let d = STEP_KM; d <= MAX_KM; d += STEP_KM) {
    const p = turf.destination(origin, d, bearingDeg, { units: 'kilometers' });
    const [pLon, pLat] = p.geometry.coordinates;
    if (esTierra(pLon, pLat)) break;
    libre = d;
  }
  return libre;
}

function computeExposureCurve(lat, lon) {
  const curve = [];
  for (let angle = 0; angle < 360; angle += STEP_ANGLE) {
    curve.push({
      angle,
      distance: distanciaLibreKm(lat, lon, angle),
    });
  }
  return curve;
}

function circularMeanDeg(angles) {
  if (angles.length === 0) return 0;
  let sx = 0;
  let sy = 0;
  for (const deg of angles) {
    const rad = (deg * Math.PI) / 180;
    sx += Math.sin(rad);
    sy += Math.cos(rad);
  }
  let deg = (Math.atan2(sx, sy) * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
}

function extractOrientation(curve, ratio = WINDOW_RATIO) {
  const maxD = Math.max(...curve.map(p => p.distance));
  const eps = 1e-6;
  const atMax = curve.filter(p => Math.abs(p.distance - maxD) <= eps);
  const bestAngle =
    atMax.length === 1
      ? atMax[0].angle
      : Math.round(circularMeanDeg(atMax.map(p => p.angle)));
  const best = { angle: bestAngle, distance: maxD };
  const thresh = maxD * ratio;

  const above = curve.filter(p => p.distance >= thresh && maxD > 0);
  let window = null;
  if (above.length > 0) {
    const angles = above.map(p => p.angle);
    window = angularWindowMinMax(angles, STEP_ANGLE);
  }

  const meanKm =
    curve.reduce((s, p) => s + p.distance, 0) / curve.length;
  const exposureScore = Math.min(1, meanKm / MAX_KM);

  const peaks = localMaximaIndices(curve.map(p => p.distance));
  const secondaryHints =
    peaks.length > 1
      ? peaks
          .filter(i => curve[i].distance >= maxD * 0.65 && curve[i].angle !== best.angle)
          .slice(0, 3)
          .map(i => ({ angle: curve[i].angle, distanceKm: curve[i].distance }))
      : [];

  return {
    orientation: best.angle,
    maxDistanceKm: parseFloat(maxD.toFixed(2)),
    window,
    thresholdKm: parseFloat(thresh.toFixed(2)),
    exposureScore: parseFloat(exposureScore.toFixed(3)),
    meanDistanceKm: parseFloat(meanKm.toFixed(2)),
    peakHints: secondaryHints,
    curve,
  };
}

/**
 * Arco angular mínimo que cubre todos los ángulos (complemento del mayor hueco entre puntos ordenados).
 * Si min > max, el arco cruza el norte (ej. [350, 20]).
 */
function angularWindowMinMax(angles) {
  if (angles.length === 0) return null;
  const s = [...new Set(angles)].sort((a, b) => a - b);
  if (s.length === 1) return [s[0], s[0]];
  let maxGap = 0;
  let maxIdx = 0;
  for (let i = 0; i < s.length; i++) {
    const gap =
      i === s.length - 1 ? s[0] + 360 - s[i] : s[i + 1] - s[i];
    if (gap > maxGap) {
      maxGap = gap;
      maxIdx = i;
    }
  }
  const start = s[(maxIdx + 1) % s.length];
  const end = s[maxIdx];
  return [start, end];
}

/** Máximos locales en serie circular */
function localMaximaIndices(distances) {
  const n = distances.length;
  const peaks = [];
  for (let i = 0; i < n; i++) {
    const prev = distances[(i - 1 + n) % n];
    const next = distances[(i + 1) % n];
    const v = distances[i];
    if (v >= prev && v >= next && (v > prev || v > next)) peaks.push(i);
  }
  return peaks;
}

function angleDiff(a, b) {
  const d = Math.abs(((a - b) + 360) % 360);
  return d > 180 ? 360 - d : d;
}

// ─── Playas desde beach-data.js ──────────────────────────────────────────────
const beachPath = path.join(__dirname, '..', 'beach-data.js');
const beachSrc = fs.readFileSync(beachPath, 'utf8');
const getSpots = new Function(
  `${beachSrc}; return typeof todasLasPlayas === 'function' ? todasLasPlayas() : [];`
);
const TODAS = getSpots();
if (TODAS.length === 0) {
  console.error('ERROR: No se pudieron cargar playas desde beach-data.js');
  process.exit(1);
}

const args = process.argv.slice(2);
const soloArg = args.find(a => a.startsWith('--solo='));
const solo = soloArg ? soloArg.slice('--solo='.length).trim() : null;
const wantJson = args.includes('--json');
const noCurve = args.includes('--no-curve');

let playas = solo
  ? TODAS.filter(p => p.nombre.toLowerCase() === solo.toLowerCase())
  : TODAS;
if (solo && playas.length === 0) {
  console.error(`No hay playa con nombre: ${solo}`);
  process.exit(1);
}

console.error(
  `Land: ${land.features.length} polígonos | curva: cada ${STEP_ANGLE}° hasta ${MAX_KM} km por ${STEP_KM} km\n`
);

const out = [];

for (const playa of playas) {
  const curve = computeExposureCurve(playa.lat, playa.lon);
  const stats = extractOrientation(curve);
  const diff = angleDiff(stats.orientation, playa.orient);
  const row = {
    nombre: playa.nombre,
    orientActual: playa.orient,
    orientation: stats.orientation,
    diffDeg: Math.round(diff),
    maxDistanceKm: stats.maxDistanceKm,
    windowDeg: stats.window,
    exposureScore: stats.exposureScore,
    meanDistanceKm: stats.meanDistanceKm,
    peakHints: stats.peakHints,
    curve: noCurve ? undefined : stats.curve.map(p => ({ angle: p.angle, distance: p.distance })),
  };
  out.push(row);

  if (!wantJson) {
    const w =
      stats.window != null ? `[${stats.window[0]}°–${stats.window[1]}°]` : '[—]';
    const ok = diff <= 30 ? '✅' : '⚠️';
    console.log(
      `${playa.nombre.padEnd(22)} actual:${String(playa.orient).padEnd(4)} ` +
        `curva:${String(stats.orientation).padEnd(4)} Δ${String(Math.round(diff)).padEnd(3)}° ${w} ` +
        `max:${stats.maxDistanceKm}km score:${stats.exposureScore} ${ok}`
    );
  }
}

if (wantJson) {
  console.log(JSON.stringify(out, null, 2));
}

if (!wantJson && playas.length > 1) {
  const ok = out.filter(r => r.diffDeg <= 30).length;
  console.log(`\nCoincidencia orient ±30° respecto beach-data: ${ok}/${out.length}`);
}
