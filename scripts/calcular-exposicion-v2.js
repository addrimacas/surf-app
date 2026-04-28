#!/usr/bin/env node
// calcular-exposicion-v2.js
// Uso: node calcular-exposicion-v2.js
// Requiere Node 18+. Sin dependencias externas.
//
// Lee playas de ../surf-app/beach-data.js y calcula exposición con 7 factores:
//   F1 fetch direccional  (peso 0.25)
//   F2 fetch máximo       (peso 0.10)
//   F3 profundidad 5km    (peso 0.20)
//   F4 gradiente bati.    (peso 0.20)
//   F5 sector angular     (peso 0.10)
//   F6 factor ría         (peso 0.10)
//   F7 obstáculos         (peso 0.05)

import { readFileSync } from 'fs';
import { createRequire } from 'module';

// ─── Cargar playas desde beach-data.js ───────────────────────────────────────
// beach-data.js no es un módulo ES, pero define SPOTS y todasLasPlayas en scope.
// Lo ejecutamos con Function() para extraer SPOTS sin require ni import.
const beachDataSrc = readFileSync(
  new URL('../beach-data.js', import.meta.url),
  'utf8'
);
// Inyectamos el código y extraemos SPOTS
const getSpots = new Function(`${beachDataSrc}; return typeof todasLasPlayas === 'function' ? todasLasPlayas() : [];`);
const PLAYAS = getSpots();

if (PLAYAS.length === 0) {
  console.error('ERROR: No se pudieron cargar las playas de beach-data.js');
  process.exit(1);
}
console.log(`Playas cargadas: ${PLAYAS.length}`);

const LS_KEY = process.env.SALITRE_EXPOS_LS || 'salitre_exposicion_v2';
const LABEL_VERSION = process.env.SALITRE_EXPOS_VERSION || 'v2';

// ─── Constantes ──────────────────────────────────────────────────────────────
const PASOS_FETCH  = [10, 25, 50, 100, 150, 200]; // km
const RAYOS_OFFSET = [0, -22.5, +22.5, -45, +45]; // grados desde orient
const DIRS_SECTOR  = [0, 45, 90, 135, 180, 225, 270, 315]; // 8 rosas
const DELAY_MS     = 1100;

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── Geometría ───────────────────────────────────────────────────────────────
function puntoOffset(lat, lon, orientDeg, km) {
  const rad    = ((orientDeg % 360) + 360) % 360 * Math.PI / 180;
  const latOff = (km / 111) * Math.cos(rad);
  const lonOff = (km / (111 * Math.cos(lat * Math.PI / 180))) * Math.sin(rad);
  return { lat: lat + latOff, lon: lon + lonOff };
}

// ─── API: GEBCO batch (hasta 100 puntos por petición) ────────────────────────
async function gebcoBatch(puntos) {
  const locs = puntos.map(p => `${p.lat.toFixed(6)},${p.lon.toFixed(6)}`).join('|');
  const url  = `https://api.opentopodata.org/v1/gebco2020?locations=${locs}`;
  const res  = await fetch(url);
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`opentopodata HTTP ${res.status}: ${txt.slice(0, 100)}`);
  }
  const data = await res.json();
  if (data.status !== 'OK') throw new Error(`opentopodata: ${data.status}`);
  return data.results.map(r => r.elevation ?? 0);
}

// ─── API: Overpass — detecta tierra en un punto (elev >= 0 via GEBCO también) ─
// Usamos el mismo GEBCO: elevación >= 0 → tierra
async function fetchKmEnDireccion(lat, lon, orientDeg) {
  const puntos = PASOS_FETCH.map(km => puntoOffset(lat, lon, orientDeg, km));
  const elevs  = await gebcoBatch(puntos);
  for (let i = 0; i < PASOS_FETCH.length; i++) {
    if (elevs[i] >= 0) return PASOS_FETCH[i]; // tierra encontrada
  }
  return 200; // mar abierto hasta 200 km
}

// ─── Procesado por playa ──────────────────────────────────────────────────────
async function procesarPlaya(playa) {
  const { lat, lon, orient } = playa;
  let llamadasAPI = 0;

  // ── GEBCO batch 1: 1km y 5km en dirección principal ──────────────────────
  const p1km = puntoOffset(lat, lon, orient, 1);
  const p5km = puntoOffset(lat, lon, orient, 5);
  await sleep(DELAY_MS); llamadasAPI++;
  const [elev1km, elev5km] = await gebcoBatch([p1km, p5km]);
  const prof1km = Math.abs(elev1km);
  const prof5km = Math.abs(elev5km);

  // ── F3: profundidad a 5km ─────────────────────────────────────────────────
  const F3 = Math.min(prof5km, 500) / 500;

  // ── F4: gradiente batimétrico ─────────────────────────────────────────────
  const gradiente = (prof5km - prof1km) / 4; // m/km
  const F4 = Math.min(Math.max(gradiente, 0), 100) / 100;

  // ── F1 + F2: fetch en 5 rayos (usa GEBCO para detección tierra) ───────────
  const fetchPorRayo = [];
  for (const offset of RAYOS_OFFSET) {
    const dir = ((orient + offset) % 360 + 360) % 360;
    const puntos = PASOS_FETCH.map(km => puntoOffset(lat, lon, dir, km));
    await sleep(DELAY_MS); llamadasAPI++;
    const elevs = await gebcoBatch(puntos);
    let km = 200;
    for (let i = 0; i < PASOS_FETCH.length; i++) {
      if (elevs[i] >= 0) { km = PASOS_FETCH[i]; break; }
    }
    fetchPorRayo.push(km);
  }
  // Rayo central (índice 0) vale el doble
  const pesoTotal = 2 + 1 + 1 + 1 + 1; // centro=2, otros=1
  const fetchDir  = (fetchPorRayo[0] * 2 + fetchPorRayo[1] + fetchPorRayo[2] + fetchPorRayo[3] + fetchPorRayo[4]) / pesoTotal;
  const F1 = fetchDir / 200;
  const F2 = Math.max(...fetchPorRayo) / 200;

  // ── F5: sector angular (8 direcciones cada 45°) ───────────────────────────
  const fetchSector = [];
  for (const dir of DIRS_SECTOR) {
    const puntos = PASOS_FETCH.map(km => puntoOffset(lat, lon, dir, km));
    await sleep(DELAY_MS); llamadasAPI++;
    const elevs = await gebcoBatch(puntos);
    let km = 200;
    for (let i = 0; i < PASOS_FETCH.length; i++) {
      if (elevs[i] >= 0) { km = PASOS_FETCH[i]; break; }
    }
    fetchSector.push(km);
  }
  const openDirs = fetchSector.filter(km => km > 50).length;
  const F5 = openDirs / 8;

  // ── F6: factor ría ────────────────────────────────────────────────────────
  let F6;
  if      (F5 < 0.4) F6 = 0;
  else if (F5 <= 0.7) F6 = (F5 - 0.4) / 0.3;
  else                F6 = 1;

  // ── F7: obstáculos (rayos con fetch < 25km de los 5 rayos direccionales) ──
  const rayosCortos = fetchPorRayo.filter(km => km < 25).length;
  const F7 = 1 - (rayosCortos / 5);

  // ── Fórmula final ─────────────────────────────────────────────────────────
  const exposicion = Math.round(
    (F1 * 0.25 + F2 * 0.10 + F3 * 0.20 + F4 * 0.20 + F5 * 0.10 + F6 * 0.10 + F7 * 0.05) * 100
  ) / 100;

  return { prof1km, prof5km, gradiente, fetchPorRayo, fetchDir, F1, F2, F3, F4, F5, F6, F7, exposicion, llamadasAPI };
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n=== CÁLCULO DE EXPOSICIÓN ${LABEL_VERSION} (7 factores) ===\n`);
  console.log(
    'Playa'.padEnd(18),
    'Exp_ant'.padEnd(8),
    'Exp_new'.padEnd(8),
    'Dif'.padEnd(6),
    'F1'.padEnd(5), 'F2'.padEnd(5), 'F3'.padEnd(5),
    'F4'.padEnd(5), 'F5'.padEnd(5), 'F6'.padEnd(5), 'F7'
  );
  console.log('-'.repeat(90));

  const resultados = [];
  let totalAPI = 0;

  for (const playa of PLAYAS) {
    process.stdout.write(`  ${playa.nombre.padEnd(16)} calculando...`);
    try {
      const r = await procesarPlaya(playa);
      totalAPI += r.llamadasAPI;
      const diff     = r.exposicion - (playa.exposicion ?? 0.5);
      const aviso    = Math.abs(diff) > 0.2 ? ' ⚠️ DIFERENCIA GRANDE' : '';
      const diffStr  = (diff >= 0 ? '+' : '') + diff.toFixed(2);

      process.stdout.write(
        `\r  ${playa.nombre.padEnd(18)}` +
        `${String(playa.exposicion ?? '?').padEnd(8)}` +
        `${String(r.exposicion).padEnd(8)}` +
        `${diffStr.padEnd(6)}` +
        `${r.F1.toFixed(2).padEnd(5)}${r.F2.toFixed(2).padEnd(5)}${r.F3.toFixed(2).padEnd(5)}` +
        `${r.F4.toFixed(2).padEnd(5)}${r.F5.toFixed(2).padEnd(5)}${r.F6.toFixed(2).padEnd(5)}${r.F7.toFixed(2)}` +
        `${aviso}\n`
      );
      resultados.push({ playa, ...r, diff });
    } catch (e) {
      process.stdout.write(`\r  ${playa.nombre.padEnd(18)} ERROR: ${e.message} → exposicion:0.50\n`);
      resultados.push({ playa, exposicion: 0.5, diff: 0.5 - (playa.exposicion ?? 0.5) });
    }
  }

  console.log(`\nTotal llamadas API: ${totalAPI}`);

  // ── Campos para beach-data.js ─────────────────────────────────────────────
  console.log('\n=== CAMPOS exposicion: para beach-data.js ===\n');
  for (const r of resultados) {
    console.log(`  { nombre:'${r.playa.nombre}',`.padEnd(30) + ` exposicion:${r.exposicion} },`);
  }

  // ── Avisos diferencia > 0.2 ───────────────────────────────────────────────
  const avisos = resultados.filter(r => Math.abs(r.diff ?? 0) > 0.2);
  if (avisos.length > 0) {
    console.log('\n=== ⚠️  DIFERENCIAS > 0.2 — REVISAR ===\n');
    for (const r of avisos) {
      console.log(
        `  ${r.playa.nombre}: anterior=${r.playa.exposicion} nueva=${r.exposicion}` +
        ` diff=${(r.diff >= 0 ? '+' : '') + r.diff.toFixed(2)}`
      );
    }
  } else {
    console.log('\n✅ Ninguna diferencia > 0.2');
  }

  // ── localStorage JSON ─────────────────────────────────────────────────────
  console.log('\n=== JSON PARA localStorage ===\n');
  const json = {};
  for (const r of resultados) {
    json[r.playa.nombre] = {
      prof1km:    r.prof1km  != null ? parseFloat(r.prof1km.toFixed(1))  : null,
      prof5km:    r.prof5km  != null ? parseFloat(r.prof5km.toFixed(1))  : null,
      exposicion: r.exposicion,
    };
  }
  console.log(`localStorage.setItem('${LS_KEY}', JSON.stringify(${JSON.stringify(json, null, 2)}));`);
}

main().catch(e => { console.error('Error fatal:', e); process.exit(1); });
