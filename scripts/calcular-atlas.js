#!/usr/bin/env node
// scripts/calcular-atlas.js
// Genera el atlas de exposición de cada playa (especificación v1.1, puntos 1 y 5):
//   - origen de los rayos: punto en el agua frente a la playa (~400 m mar adentro)
//   - distancia al primer obstáculo en 720 direcciones (cada 0,5°), hasta 150 km
//   - normal de la playa calculada (centro de su ventana abierta al mar)
//   - punto offshore donde pedir la previsión de oleaje
//
// Entrada:  beach-data.js + data/costa-galicia-gshhs-f.geojson (GSHHG full)
// Salida:   atlas-playas.js  (lo carga la app; define ATLAS_PLAYAS)
//           docs/atlas-revision.html (gráficos polares para revisar las 60 playas)
//
// Uso: node scripts/calcular-atlas.js
// Sin dependencias. Tarda ~1 minuto.

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RAIZ = path.join(__dirname, '..');
const VERSION = 1;
const PASO_GRADOS = 0.5;
const N_RAYOS = 360 / PASO_GRADOS;     // 720
const ALCANCE_KM = 150;
const ABIERTO = 255;                   // distancia codificada = "sin obstáculo en 150 km"
const ISLOTE_MIN_KM = 0.1;             // islotes más pequeños se ignoran (la ola los rodea)
const OFFSET_ORIGEN_KM = 0.4;
const PERIODOS = [6, 8, 10, 12, 14, 16, 18];   // rejilla de períodos de la tabla K²(θ, T)
// Atenuación por recorrido en aguas confinadas (rías, bahías): K × exp(−ATEN_KM · L), con L = km
// desde la playa hasta un punto a ≥4 km de cualquier costa. Parámetro GLOBAL (no por playa):
// ajustado una vez contra la exposición calibrada a mano de las 60 playas (RMSE 0,33 → 0,17).
const ATEN_KM = 0.05;

// ---------------------------------------------------------------- proyección local (km)
const LAT0 = 43.0;
const KX = 111.32 * Math.cos(LAT0 * Math.PI / 180);
const KY = 110.57;
const aXY = (lon, lat) => [lon * KX, lat * KY];
const aLonLat = (x, y) => [x / KX, y / KY];

// ---------------------------------------------------------------- costa
function cargarSegmentos() {
  const geo = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data', 'costa-galicia-gshhs-f.geojson'), 'utf8'));
  const g = geo.features[0].geometry;
  const polis = g.type === 'MultiPolygon' ? g.coordinates : [g.coordinates];
  const segs = [];       // [x1,y1,x2,y2]
  let ignorados = 0;
  for (const poli of polis) {
    const ext = poli[0].map(([lo, la]) => aXY(lo, la));
    const xs = ext.map(p => p[0]), ys = ext.map(p => p[1]);
    const diag = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    if (diag < ISLOTE_MIN_KM) { ignorados++; continue; }
    for (const anillo of poli) {
      const pts = anillo.map(([lo, la]) => aXY(lo, la));
      for (let i = 0; i + 1 < pts.length; i++) segs.push([pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]]);
    }
  }
  return { segs: Float64Array.from(segs.flat()), n: segs.length, ignorados };
}

// Índice en rejilla para acelerar consultas de distancia y "dentro de tierra"
function crearIndice(S) {
  const CEL = 2; // km
  const mapa = new Map();
  const clave = (i, j) => i * 100000 + j;
  for (let k = 0; k < S.n; k++) {
    const o = k * 4;
    const x0 = Math.min(S.segs[o], S.segs[o + 2]), x1 = Math.max(S.segs[o], S.segs[o + 2]);
    const y0 = Math.min(S.segs[o + 1], S.segs[o + 3]), y1 = Math.max(S.segs[o + 1], S.segs[o + 3]);
    for (let i = Math.floor(x0 / CEL); i <= Math.floor(x1 / CEL); i++)
      for (let j = Math.floor(y0 / CEL); j <= Math.floor(y1 / CEL); j++) {
        const c = clave(i, j);
        if (!mapa.has(c)) mapa.set(c, []);
        mapa.get(c).push(k);
      }
  }
  return { CEL, mapa, clave };
}

// Distancia (km) desde (ox,oy) en el rumbo dado hasta el primer segmento de costa.
// Recorre la rejilla del índice celda a celda (Amanatides-Woo) y para en cuanto encuentra
// un corte dentro de la celda actual: mucho más rápido que probar los 15.000 segmentos.
function distanciaRayo(S, I, ox, oy, rumboDeg, maxKm = ALCANCE_KM) {
  const r = rumboDeg * Math.PI / 180;
  const dx = Math.sin(r), dy = Math.cos(r);   // rumbo náutico: 0 = norte, 90 = este
  const C = I.CEL, s = S.segs;
  let i = Math.floor(ox / C), j = Math.floor(oy / C);
  const pasoI = dx > 0 ? 1 : -1, pasoJ = dy > 0 ? 1 : -1;
  const tDeltaX = dx !== 0 ? Math.abs(C / dx) : Infinity;
  const tDeltaY = dy !== 0 ? Math.abs(C / dy) : Infinity;
  let tMaxX = dx !== 0 ? (((dx > 0 ? i + 1 : i) * C) - ox) / dx : Infinity;
  let tMaxY = dy !== 0 ? (((dy > 0 ? j + 1 : j) * C) - oy) / dy : Infinity;
  let mejor = Infinity, tCelda = 0;
  const vistos = new Set();
  while (tCelda <= maxKm) {
    const lista = I.mapa.get(I.clave(i, j));
    if (lista) for (const k of lista) {
      if (vistos.has(k)) continue;
      vistos.add(k);
      const o = k * 4;
      const ax = s[o] - ox, ay = s[o + 1] - oy, ex = s[o + 2] - s[o], ey = s[o + 3] - s[o + 1];
      const den = dx * ey - dy * ex;
      if (Math.abs(den) < 1e-12) continue;
      const t = (ax * ey - ay * ex) / den;
      const u = (ax * dy - ay * dx) / den;
      if (t > 1e-6 && u >= 0 && u <= 1 && t < mejor) mejor = t;
    }
    const tSalida = Math.min(tMaxX, tMaxY);
    if (mejor <= tSalida) return mejor;      // el corte está en esta celda: no hay nada antes
    if (tMaxX < tMaxY) { tCelda = tMaxX; tMaxX += tDeltaX; i += pasoI; }
    else               { tCelda = tMaxY; tMaxY += tDeltaY; j += pasoJ; }
  }
  return mejor <= maxKm ? mejor : Infinity;
}

// Versión de fuerza bruta (solo para comprobar la de rejilla)
function distanciaRayoBruta(S, ox, oy, rumboDeg) {
  const r = rumboDeg * Math.PI / 180;
  const dx = Math.sin(r), dy = Math.cos(r);
  let mejor = Infinity;
  const s = S.segs;
  for (let k = 0; k < S.n; k++) {
    const o = k * 4;
    const ax = s[o] - ox, ay = s[o + 1] - oy, ex = s[o + 2] - s[o], ey = s[o + 3] - s[o + 1];
    const den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-12) continue;
    const t = (ax * ey - ay * ex) / den;
    const u = (ax * dy - ay * dx) / den;
    if (t > 1e-6 && u >= 0 && u <= 1 && t < mejor) mejor = t;
  }
  return mejor;
}

// ¿Punto en tierra? Paridad de cruces con un rayo hacia el este, usando el índice
function enTierra(S, I, x, y) {
  let cruces = 0;
  const j = Math.floor(y / I.CEL);
  const vistos = new Set();
  const iMax = Math.floor((x + 400) / I.CEL);
  for (let i = Math.floor(x / I.CEL); i <= iMax; i++) {
    const lista = I.mapa.get(I.clave(i, j));
    if (!lista) continue;
    for (const k of lista) {
      if (vistos.has(k)) continue;
      vistos.add(k);
      const o = k * 4, x1 = S.segs[o], y1 = S.segs[o + 1], x2 = S.segs[o + 2], y2 = S.segs[o + 3];
      if ((y1 > y) !== (y2 > y)) {
        const xc = x1 + (y - y1) * (x2 - x1) / (y2 - y1);
        if (xc > x) cruces++;
      }
    }
  }
  return cruces % 2 === 1;
}

function distSegmento(px, py, x1, y1, x2, y2) {
  const ex = x2 - x1, ey = y2 - y1;
  const l2 = ex * ex + ey * ey;
  let t = l2 > 0 ? ((px - x1) * ex + (py - y1) * ey) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * ex), py - (y1 + t * ey));
}

// Distancia a la costa más cercana, buscando en anillos de celdas
function distCosta(S, I, x, y, maxKm = 20) {
  let mejor = Infinity;
  const ci = Math.floor(x / I.CEL), cj = Math.floor(y / I.CEL);
  for (let r = 0; r * I.CEL <= maxKm + I.CEL; r++) {
    for (let i = ci - r; i <= ci + r; i++)
      for (let j = cj - r; j <= cj + r; j++) {
        if (Math.max(Math.abs(i - ci), Math.abs(j - cj)) !== r) continue;
        const lista = I.mapa.get(I.clave(i, j));
        if (!lista) continue;
        for (const k of lista) {
          const o = k * 4;
          const d = distSegmento(x, y, S.segs[o], S.segs[o + 1], S.segs[o + 2], S.segs[o + 3]);
          if (d < mejor) mejor = d;
        }
      }
    if (mejor <= (r - 1) * I.CEL) break; // ya no puede haber nada más cerca
  }
  return mejor;
}

const desplazar = (x, y, rumbo, km) => {
  const r = rumbo * Math.PI / 180;
  return [x + km * Math.sin(r), y + km * Math.cos(r)];
};
const difAng = (a, b) => { const d = ((a - b) % 360 + 360) % 360; return d > 180 ? 360 - d : d; };

function mediaCircular(angulos, pesos) {
  let sx = 0, sy = 0;
  angulos.forEach((a, i) => { const w = pesos ? pesos[i] : 1; sx += w * Math.sin(a * Math.PI / 180); sy += w * Math.cos(a * Math.PI / 180); });
  return ((Math.atan2(sx, sy) * 180 / Math.PI) + 360) % 360;
}

// ---------------------------------------------------------------- playas
function cargarPlayas() {
  const codigo = fs.readFileSync(path.join(RAIZ, 'beach-data.js'), 'utf8');
  const ctx = { console: { log() {} } };
  vm.createContext(ctx);
  vm.runInContext(codigo + '\n;this.__SPOTS = SPOTS;', ctx);
  const out = [];
  for (const regiones of Object.values(ctx.__SPOTS))
    for (const zonas of Object.values(regiones))
      for (const [zona, lista] of Object.entries(zonas))
        for (const p of lista) out.push({ ...p, zona });
  return out;
}

// ---------------------------------------------------------------- cálculo por playa
function procesarPlaya(S, I, p) {
  const avisos = [];
  const n0 = p.orientComputed ?? p.orient ?? 270;   // primera estimación de hacia dónde mira
  let [x, y] = aXY(p.lon, p.lat);

  // 1. Si la coordenada cae en tierra (la costa GSHHG está simplificada), buscar el agua más cercana
  if (enTierra(S, I, x, y)) {
    let encontrado = null;
    for (let r = 0.1; r <= 2.0 && !encontrado; r += 0.1) {
      const rumbos = [];
      for (let d = 0; d < 360; d += 10) rumbos.push(d);
      rumbos.sort((a, b) => difAng(a, n0) - difAng(b, n0));
      for (const d of rumbos) {
        const [qx, qy] = desplazar(x, y, d, r);
        if (!enTierra(S, I, qx, qy)) { encontrado = [qx, qy]; break; }
      }
    }
    if (!encontrado) avisos.push('coordenada en tierra y sin agua a menos de 2 km');
    else { [x, y] = encontrado; avisos.push('coordenada en tierra según GSHHG; origen movido al agua'); }
  }
  // 2. Origen de los rayos: ~400 m mar adentro siguiendo la normal aproximada
  let [ox, oy] = desplazar(x, y, n0, OFFSET_ORIGEN_KM);
  if (enTierra(S, I, ox, oy)) { ox = x; oy = y; avisos.push('origen a pie de playa (a 400 m hay tierra)'); }

  // 3. Rayos cada 0,5°
  const dist = new Uint8Array(N_RAYOS);
  for (let k = 0; k < N_RAYOS; k++) {
    const d = distanciaRayo(S, I, ox, oy, k * PASO_GRADOS);
    dist[k] = d >= ALCANCE_KM ? ABIERTO : Math.max(0, Math.min(ALCANCE_KM - 1, Math.round(d)));
  }
  const abierto = k => dist[k] === ABIERTO;
  const fraccionAbierta = [...dist].filter(v => v === ABIERTO).length / N_RAYOS;

  // 4. Transferencia direccional K²(θ, T): fracción de energía que llega desde cada dirección
  //    de mar abierto θ (cada 1°) para cada período T de la rejilla.
  //    - Directa: el rayo desde el origen llega a mar abierto (K² = 1).
  //    - Indirecta (aproximación de refracción/difracción, un solo giro): la ola entra por un
  //      punto Q del agua visible desde la playa que sí ve mar abierto, y gira un ángulo Δ hasta
  //      la playa. Atenuación 2^-(Δ/w(T))², con w(T) creciente con el período (los períodos
  //      largos rodean más los cabos), y un 20 % de pérdida fija por el giro.
  //    Son priors físicos a calibrar con el panel, no una propagación espectral tipo SWAN.
  const directo = new Float32Array(360);
  for (let g = 0; g < 360; g++) {
    const k0 = (2 * g - 1 + N_RAYOS) % N_RAYOS, k1 = 2 * g, k2 = (2 * g + 1) % N_RAYOS;
    directo[g] = 0.25 * abierto(k0) + 0.5 * abierto(k1) + 0.25 * abierto(k2);
  }
  // Puntos Q y sus direcciones abiertas
  const cacheQ = new Map();
  const abiertasDesde = (qx, qy) => {
    const key = Math.round(qx * 5) + ',' + Math.round(qy * 5);
    if (cacheQ.has(key)) return cacheQ.get(key);
    const ab = [];
    for (let g = 0; g < 360; g += 2) if (distanciaRayo(S, I, qx, qy, g) === Infinity) ab.push(g);
    cacheQ.set(key, ab);
    return ab;
  };
  const giros = new Float32Array(360).fill(180);   // menor giro Δ necesario para cada θ
  for (let b = 0; b < 360; b += 2) {
    const d = dist[b * 2] === ABIERTO ? ALCANCE_KM : dist[b * 2];
    if (d < 1.5 || dist[b * 2] === ABIERTO) continue;
    const paso = Math.max(1, (d - 1) / 12);
    for (let t = 1; t <= d - 0.5; t += paso) {
      const [qx, qy] = desplazar(ox, oy, b, t);
      for (const g of abiertasDesde(qx, qy)) {
        const delta = difAng(g, b);
        for (const gg of [g, (g + 1) % 360]) if (delta < giros[gg]) giros[gg] = delta;
      }
    }
  }
  const k2 = new Uint8Array(360 * PERIODOS.length);
  PERIODOS.forEach((T, it) => {
    const w = 15 + 2.5 * (T - 6);
    for (let g = 0; g < 360; g++) {
      const ind = giros[g] < 180 ? 0.8 * Math.pow(2, -Math.pow(giros[g] / w, 2)) : 0;
      k2[it * 360 + g] = Math.round(255 * Math.max(directo[g], ind));
    }
  });

  // 5. Normal calculada: media circular de la transferencia a 12 s dentro de ±90° de n0
  const it12 = PERIODOS.indexOf(12);
  const angs = [], pesos = [];
  for (let g = 0; g < 360; g++) if (difAng(g, n0) <= 90 && k2[it12 * 360 + g] > 0) { angs.push(g); pesos.push(k2[it12 * 360 + g]); }
  let normal = angs.length ? Math.round(mediaCircular(angs, pesos)) : Math.round(n0);
  if (!angs.length) avisos.push('sin entrada de oleaje a ±90° de la orientación de beach-data');
  if (fraccionAbierta === 0) avisos.push('sin línea directa a mar abierto: solo entrada indirecta');

  // 6. Punto offshore: avanzar por un rayo abierto (sin tierra en 150 km), el más próximo a la
  //    normal, hasta un punto a ≥5 km de costa con ≥90 % de mar abierto en ±60°.
  //    Si la playa no ve mar abierto, se parte del punto Q más prometedor.
  let offshore = null;
  const candidatos = [];
  for (let k = 0; k < N_RAYOS; k += 2) if (abierto(k)) candidatos.push({ x: ox, y: oy, b: k * PASO_GRADOS });
  if (!candidatos.length) {
    for (let b = 0; b < 360 && candidatos.length < 40; b += 2) {
      const d = dist[b * 2];
      if (d === ABIERTO || d < 1.5) continue;
      const [qx, qy] = desplazar(ox, oy, b, d - 0.5);
      for (const g of abiertasDesde(qx, qy)) candidatos.push({ x: qx, y: qy, b: g });
    }
  }
  candidatos.sort((u, v) => difAng(u.b, normal) - difAng(v.b, normal));
  for (const c of candidatos.slice(0, 60)) {
    for (let km = 3; km <= 40 && !offshore; km += 1) {
      const [qx, qy] = desplazar(c.x, c.y, c.b, km);
      if (enTierra(S, I, qx, qy)) continue;
      if (distCosta(S, I, qx, qy, 6) < 5) continue;
      let ab = 0, tot = 0;
      for (let d = -60; d <= 60; d += 2) { tot++; if (distanciaRayo(S, I, qx, qy, (c.b + d + 360) % 360) === Infinity) ab++; }
      if (ab / tot >= 0.9) offshore = { x: qx, y: qy, km: Math.round(Math.hypot(qx - ox, qy - oy)), c };
    }
    if (offshore) break;
  }
  // 7. Confinamiento: km recorridos (por el camino del punto offshore) hasta tener ≥4 km de mar alrededor
  let confinamientoKm = null;
  if (offshore) {
    const c = offshore.c;
    const previo = Math.hypot(c.x - ox, c.y - oy);
    for (let t = 0; t <= 40; t += 0.5) {
      const [qx, qy] = desplazar(c.x, c.y, c.b, t);
      if (distCosta(S, I, qx, qy, 6) >= 4) { confinamientoKm = +(previo + t).toFixed(1); break; }
    }
  }
  if (confinamientoKm == null) confinamientoKm = 15;
  if (!offshore) avisos.push('sin punto offshore válido a menos de 40 km: revisar a mano');

  const [olon, olat] = aLonLat(ox, oy);
  const res = {
    origen: [+olat.toFixed(5), +olon.toFixed(5)],
    normal,
    fraccionAbierta: +fraccionAbierta.toFixed(3),
    dist: Buffer.from(dist).toString('base64'),
    k2: Buffer.from(k2).toString('base64'),
    confinamientoKm,
    factorConfinamiento: +Math.exp(-ATEN_KM * confinamientoKm).toFixed(3),
    avisos,
  };
  if (offshore) {
    const [flon, flat] = aLonLat(offshore.x, offshore.y);
    res.offshore = [+flat.toFixed(4), +flon.toFixed(4)];
    res.offshoreKm = offshore.km;
  }
  return res;
}

// ---------------------------------------------------------------- revisión visual
function htmlRevision(atlas, playas) {
  const tarjetas = playas.map(p => {
    const a = atlas.playas[p.nombre];
    const dist = Buffer.from(a.dist, 'base64');
    const R = 70, C = 80;
    let sectores = '';
    // un sector cada 2° (máximo de los 4 rayos de 0,5°); sectores contiguos iguales se fusionan
    const sec = [];
    for (let g = 0; g < 360; g += 2) {
      const vals = [0, 1, 2, 3].map(i => dist[(g * 2 + i) % N_RAYOS]);
      const ab = vals.some(v => v === ABIERTO);
      const v = ab ? 1 : Math.min(1, Math.max(...vals) / ALCANCE_KM) * 0.5;
      const ult = sec[sec.length - 1];
      if (ult && ult.ab === ab && Math.abs(ult.v - v) < 0.02) ult.g1 = g + 2; else sec.push({ g0: g, g1: g + 2, v, ab });
    }
    for (const sct of sec) {
      const r = R * sct.v, a0 = sct.g0 * Math.PI / 180, a1 = sct.g1 * Math.PI / 180;
      const col = sct.ab ? 'var(--abierto)' : 'var(--tierra)';
      sectores += `<path d="M${C},${C}L${(C + r * Math.sin(a0)).toFixed(1)},${(C - r * Math.cos(a0)).toFixed(1)}A${r.toFixed(1)},${r.toFixed(1)} 0 0 1 ${(C + r * Math.sin(a1)).toFixed(1)},${(C - r * Math.cos(a1)).toFixed(1)}Z" fill="${col}"/>`;
    }
    const nr = a.normal * Math.PI / 180;
    const ori = (p.orientComputed ?? p.orient) * Math.PI / 180;
    return `<figure><svg viewBox="0 0 160 160" role="img" aria-label="Exposición de ${p.nombre}">
      <circle cx="${C}" cy="${C}" r="${R}" fill="none" class="aro"/>${sectores}
      <line x1="${C}" y1="${C}" x2="${(C + R * Math.sin(nr)).toFixed(1)}" y2="${(C - R * Math.cos(nr)).toFixed(1)}" class="normal"/>
      <line x1="${C}" y1="${C}" x2="${(C + R * 0.8 * Math.sin(ori)).toFixed(1)}" y2="${(C - R * 0.8 * Math.cos(ori)).toFixed(1)}" class="orient"/>
      <text x="${C}" y="10" class="n">N</text></svg>
      <figcaption><b>${p.nombre}</b><span>${p.zona} · abierta ${(a.fraccionAbierta * 100).toFixed(0)} % · normal ${a.normal}° (antes ${p.orientComputed ?? p.orient}°)</span>
      ${a.offshore ? `<span>offshore a ${a.offshoreKm} km</span>` : '<span class="aviso">sin punto offshore</span>'}
      ${a.avisos.map(t => `<span class="aviso">${t}</span>`).join('')}</figcaption></figure>`;
  }).join('\n');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Atlas de exposición</title><style>
:root{--bg:#f7f8fa;--fg:#1d2733;--sub:#5b6b7c;--abierto:#2b7fd1;--tierra:#c9a46b;--aro:#d5dbe2;--normal:#d1342b;--orient:#222}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#0f1720;--fg:#e6edf3;--sub:#9fb0c1;--abierto:#4da3ff;--tierra:#8a6e44;--aro:#2a3644;--normal:#ff6b62;--orient:#e6edf3}}
body{margin:0;padding:16px;background:var(--bg);color:var(--fg);font:14px/1.4 system-ui,sans-serif}
h1{font-size:20px;margin:0 0 4px}p{color:var(--sub);margin:0 0 16px;max-width:70ch}
.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}
figure{margin:0;padding:10px;border:1px solid var(--aro);border-radius:10px}svg{width:100%;max-width:200px;display:block;margin:auto}
.aro{stroke:var(--aro)}.normal{stroke:var(--normal);stroke-width:2}.orient{stroke:var(--orient);stroke-width:1;stroke-dasharray:3 2}
.n{font-size:9px;fill:var(--sub);text-anchor:middle}figcaption{display:flex;flex-direction:column;gap:2px;font-size:12px}
figcaption span{color:var(--sub)}.aviso{color:var(--normal)!important}</style></head><body>
<h1>Atlas de exposición · ${playas.length} playas</h1>
<p>Azul: direcciones con mar abierto a 150 km. Ocre: tierra (más largo = obstáculo más lejos). Línea roja: normal calculada. Línea discontinua: orientación de beach-data.js. Costa GSHHG full; generado ${atlas.generado}.</p>
<div class="g">${tarjetas}</div></body></html>`;
}

// ---------------------------------------------------------------- main
function main() {
  const t0 = Date.now();
  const S = cargarSegmentos();
  const I = crearIndice(S);
  const playas = cargarPlayas();
  console.log(`Costa: ${S.n} segmentos (${S.ignorados} islotes ignorados). Playas: ${playas.length}`);
  const atlas = {
    version: VERSION,
    generado: new Date().toISOString().slice(0, 10),
    fuente: 'GSHHG full (data/costa-galicia-gshhs-f.geojson)',
    pasoGrados: PASO_GRADOS,
    alcanceKm: ALCANCE_KM,
    abierto: ABIERTO,
    periodos: PERIODOS,
    atenuacionKm: ATEN_KM,
    playas: {},
  };
  for (const p of playas) {
    atlas.playas[p.nombre] = procesarPlaya(S, I, p);
    const a = atlas.playas[p.nombre];
    console.log(`${p.nombre.padEnd(16)} normal ${String(a.normal).padStart(3)}° (bd ${p.orientComputed ?? p.orient}°)  abierta ${(a.fraccionAbierta * 100).toFixed(0).padStart(3)}%  conf ${String(a.confinamientoKm).padStart(4)} km  offshore ${a.offshoreKm ?? '—'} km ${a.avisos.length ? '· ' + a.avisos.join('; ') : ''}`);
  }
  fs.writeFileSync(path.join(RAIZ, 'data', 'atlas-completo.json'), JSON.stringify(atlas));
  const runtime = { ...atlas, playas: Object.fromEntries(Object.entries(atlas.playas).map(([n, a]) => {
    const { dist, ...resto } = a; return [n, resto];
  })) };
  const js = `// atlas-playas.js — GENERADO por scripts/calcular-atlas.js (no editar a mano)\n` +
    `// Exposición por dirección de cada playa: distancia (km) al primer obstáculo cada ${PASO_GRADOS}°, ` +
    `codificada en base64 (${ABIERTO} = mar abierto a ${ALCANCE_KM} km), normal calculada y punto offshore.\n` +
    `const ATLAS_PLAYAS = ${JSON.stringify(runtime)};\n` +
    `if (typeof module !== 'undefined') module.exports = ATLAS_PLAYAS;\n`;
  fs.writeFileSync(path.join(RAIZ, 'atlas-playas.js'), js);
  fs.writeFileSync(path.join(RAIZ, 'docs', 'atlas-revision.html'), htmlRevision(atlas, playas));
  console.log(`Listo en ${((Date.now() - t0) / 1000).toFixed(0)} s → atlas-playas.js, data/atlas-completo.json, docs/atlas-revision.html`);
}

main();
