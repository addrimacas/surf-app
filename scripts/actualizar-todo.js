#!/usr/bin/env node
/**
 * Recalcula orient (grados de cara al mar) desde polígonos natural=beach OSM Overpass,
 * actualiza beach-data.js línea orient por playa (resto intacto).
 * Skips manual (rías cerradas — no automatizar bien): Patos, Prado, Vao, Santa Cristina, Bastiagueiro
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const BEACH_PATH = path.join(__dirname, '..', 'beach-data.js');

const SKIP = new Set(['Patos', 'Prado', 'Vao', 'Santa Cristina', 'Bastiagueiro']);

const DELAY_MS = 1500;
const OVERPASS_HOST = 'lz4.overpass-api.de';

function toRad(d) {
  return (d * Math.PI) / 180;
}
function toDeg(r) {
  return (r * 180) / Math.PI;
}

function angleDiff(a, b) {
  const d = Math.abs(((a - b) + 360) % 360);
  return d > 180 ? 360 - d : d;
}

function distM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = toRad(lat2 - lon1),
    dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function centroide(nodos) {
  const lat = nodos.reduce((s, n) => s + n.lat, 0) / nodos.length;
  const lon = nodos.reduce((s, n) => s + n.lon, 0) / nodos.length;
  return { lat, lon };
}

function ejePrincipal(nodos) {
  const c = centroide(nodos);
  let sxx = 0,
    syy = 0,
    sxy = 0;
  for (const n of nodos) {
    const dx = (n.lon - c.lon) * Math.cos(toRad(c.lat)) * 111320;
    const dy = (n.lat - c.lat) * 111320;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }
  const angle = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  return (toDeg(angle) + 360) % 360;
}

function puntoEn(lat, lon, angulo, dm) {
  const R = 6371000;
  const ang = toRad(angulo);
  const d = dm / R;
  const lat1 = toRad(lat),
    lon1 = toRad(lon);
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(ang));
  const lon2 = lon1 + Math.atan2(Math.sin(ang) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return { lat: toDeg(lat2), lon: toDeg(lon2) };
}

function normalMarina(ejeLargo, playaLat, playaLon) {
  const n1 = (ejeLargo + 90) % 360;
  const n2 = (ejeLargo - 90 + 360) % 360;
  const p1 = puntoEn(playaLat, playaLon, n1, 30000);
  const p2 = puntoEn(playaLat, playaLon, n2, 30000);
  const d1 = distM(p1.lat, p1.lon, 43, -20);
  const d2 = distM(p2.lat, p2.lon, 43, -20);
  return d1 < d2 ? Math.round(n1) : Math.round(n2);
}

function overpass(query) {
  return new Promise((resolve, reject) => {
    const postData = 'data=' + encodeURIComponent(query);
    const req = https.request(
      {
        hostname: OVERPASS_HOST,
        path: '/api/interpreter',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData),
          'User-Agent': 'salitre-actualizar-todo/1.0',
          Accept: '*/*',
        },
      },
      res => {
        let data = '';
        res.on('data', c => (data += c));
        res.on('end', () => {
          if (res.statusCode !== 200) return reject(new Error(`Overpass ${res.statusCode}`));
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      },
    );
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function orientDesdePolygon(lat, lon) {
  const query = `[out:json][timeout:15];
way["natural"="beach"](around:800,${lat},${lon});
out geom;`;
  let data = await overpass(query);
  if (!data.elements || data.elements.length === 0) {
    const query2 = `[out:json][timeout:15];
way["natural"="beach"](around:2000,${lat},${lon});
out geom;`;
    data = await overpass(query2);
  }
  if (!data.elements || data.elements.length === 0) {
    throw new Error('sin polígono de playa en OSM');
  }
  let mejorWay = null,
    mejorDist = Infinity;
  for (const way of data.elements) {
    if (!way.geometry || way.geometry.length < 3) continue;
    const c = centroide(way.geometry.map(n => ({ lat: n.lat, lon: n.lon })));
    const d = distM(lat, lon, c.lat, c.lon);
    if (d < mejorDist) {
      mejorDist = d;
      mejorWay = way;
    }
  }
  if (!mejorWay) throw new Error('polígono sin geometría');
  const geo = mejorWay.geometry.map(n => ({ lat: n.lat, lon: n.lon }));
  const eje = ejePrincipal(geo);
  return normalMarina(eje, lat, lon);
}

function cargarPlayas() {
  const code = fs.readFileSync(BEACH_PATH, 'utf8');
  const fn = new Function(code + '\n;return todasLasPlayas();');
  return fn();
}

function escReg(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function reemplazarOrient(raw, nombre, nuevoOrient) {
  const esc = escReg(nombre);
  const r = new RegExp(`(\\{\\s*nombre:\\s*'${esc}'[\\s\\S]{0,4800}?),\\s*orient\\s*:\\s*\\d+`);
  if (!r.test(raw)) throw new Error('nombre no encontrado o sin orient:, ' + nombre);
  const n = Math.round(nuevoOrient);
  return raw.replace(r, (_, pre) => `${pre}, orient:${n}`);
}

async function pausa(ms) {
  await new Promise(r => setTimeout(r, ms));
}

async function main() {
  const playas = cargarPlayas();
  console.log(`Playas cargadas: ${playas.length}`);

  let raw = fs.readFileSync(BEACH_PATH, 'utf8');
  let ok = 0,
    noop = 0,
    errores = 0;
  const notasGranDiff = [];

  for (let p = 0; p < playas.length; p++) {
    const pl = playas[p];
    if (SKIP.has(pl.nombre)) {
      console.log(`[SKIP] ${pl.nombre} (rías / manual)`);
      noop++;
      await pausa(DELAY_MS);
      continue;
    }
    await pausa(DELAY_MS);
    const antes = pl.orient;
    try {
      const calc = await orientDesdePolygon(pl.lat, pl.lon);
      const dd = angleDiff(calc, antes);
      raw = reemplazarOrient(raw, pl.nombre, calc);
      if (dd > 60) notasGranDiff.push({ nombre: pl.nombre, antes, calc, dd: Math.round(dd) });
      console.log(`[OK] ${pl.nombre}: ${antes}° → ${calc}° (Δ${Math.round(dd)}°)`);
      ok++;
    } catch (e) {
      errores++;
      console.log(`[ERR] ${pl.nombre}: ${e.message} — mantener ${antes}°`);
    }
  }

  fs.writeFileSync(BEACH_PATH, raw, 'utf8');
  console.log('\n=== Resumen ===');
  console.log(`Actualizado orient: ~${ok} | Skip: ${noop} | Error (sin cambiar): ${errores}`);
  if (notasGranDiff.length) {
    console.log('\n[NOTA manual >60° Δ respecto antes]:');
    notasGranDiff.forEach(n => console.log(`  ${n.nombre}: ${n.antes}° → ${n.calc}° (Δ ${n.dd}°)`));
  }

  const { spawnSync } = require('child_process');
  const r = spawnSync(process.execPath, ['--check', BEACH_PATH], { encoding: 'utf8' });
  if (r.status !== 0) {
    console.error('❌ Sintaxis Inválida', r.stderr || r.stdout);
    process.exit(1);
  }
  console.log('✓ node --check beach-data.js OK');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
