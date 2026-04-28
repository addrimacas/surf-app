#!/usr/bin/env node
/**
 * Matriz de comparación: mismas playas × varios perfiles → métricas agregadas.
 *
 * Uso:
 *   node scripts/experiments/orientacion/compare-matrix.js
 *   node scripts/experiments/orientacion/compare-matrix.js --solo=Nemiña
 *   node scripts/experiments/orientacion/compare-matrix.js --limit=8
 *   node scripts/experiments/orientacion/compare-matrix.js --profiles=baseline-5deg-1km-25km,offshore-nudge-5deg-1km-25km
 *   node scripts/experiments/orientacion/compare-matrix.js --json > resultados.json
 */

const fs = require('fs');
const path = require('path');
const { loadNaturalEarthGalicia } = require('./lib/natural-earth');
const { runFull, angleDiff } = require('./lib/exposure-curve');
const { resolveOffshoreOrigin } = require('./lib/offshore-origin');
const { EXPERIMENT_PROFILES } = require('./profiles-registry');

const NE_PATH = path.join(__dirname, '../../ne_10m_land.geojson');
const BEACH_PATH = path.join(__dirname, '../../../beach-data.js');

function loadPlayas() {
  const src = fs.readFileSync(BEACH_PATH, 'utf8');
  const getSpots = new Function(
    `${src}; return typeof todasLasPlayas === 'function' ? todasLasPlayas() : [];`
  );
  return getSpots();
}

function parseArgs() {
  const a = process.argv.slice(2);
  let solo = null;
  let limit = null;
  let json = false;
  let profileFilter = null;
  for (const x of a) {
    if (x.startsWith('--solo=')) solo = x.slice(7).trim();
    else if (x.startsWith('--limit=')) limit = parseInt(x.slice(8), 10);
    else if (x === '--json') json = true;
    else if (x.startsWith('--profiles='))
      profileFilter = x.slice(11).split(',').map(s => s.trim()).filter(Boolean);
  }
  return { solo, limit, json, profileFilter };
}

function runProfile(playa, profile, esTierra, turf) {
  const rayOpts = {
    stepAngle: profile.stepAngle,
    stepKm: profile.stepKm,
    maxKm: profile.maxKm,
    windowRatio: profile.windowRatio,
  };

  const t0 = Date.now();
  let lat = playa.lat;
  let lon = playa.lon;
  let meta = {};

  if (profile.offshore) {
    const off = resolveOffshoreOrigin(lat, lon, esTierra, turf, rayOpts, {});
    lat = off.lat;
    lon = off.lon;
    meta = { offshoreKm: off.offshoreKm, coarseBestBearing: off.coarseBestBearing };
  }

  const { stats } = runFull(lat, lon, esTierra, turf, rayOpts);
  const ms = Date.now() - t0;
  const diff = angleDiff(stats.orientation, playa.orient);

  return {
    profileId: profile.id,
    nombre: playa.nombre,
    orientData: playa.orient,
    orientation: stats.orientation,
    diffDeg: Math.round(diff),
    maxDistanceKm: stats.maxDistanceKm,
    windowDeg: stats.window,
    exposureScore: stats.exposureScore,
    ms,
    meta,
  };
}

function median(arr) {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function main() {
  if (!fs.existsSync(NE_PATH)) {
    console.error('Falta scripts/ne_10m_land.geojson');
    process.exit(1);
  }

  const { solo, limit, json, profileFilter } = parseArgs();
  const { esTierra, featureCount, turf } = loadNaturalEarthGalicia(NE_PATH);

  let profiles = EXPERIMENT_PROFILES;
  if (profileFilter && profileFilter.length)
    profiles = profiles.filter(p => profileFilter.includes(p.id));
  if (profiles.length === 0) {
    console.error('Ningún perfil coincide con --profiles');
    process.exit(1);
  }

  let playas = loadPlayas();
  if (solo)
    playas = playas.filter(
      p => p.nombre.toLowerCase() === solo.toLowerCase()
    );
  if (solo && playas.length === 0) {
    console.error('Playa no encontrada:', solo);
    process.exit(1);
  }
  if (limit != null && !solo) playas = playas.slice(0, limit);

  const rows = [];
  for (const playa of playas) {
    for (const profile of profiles) {
      rows.push(runProfile(playa, profile, esTierra, turf));
    }
  }

  const byProfile = {};
  for (const p of profiles) {
    const subset = rows.filter(r => r.profileId === p.id);
    const diffs = subset.map(r => r.diffDeg);
    const ms = subset.map(r => r.ms);
    byProfile[p.id] = {
      label: p.label,
      n: subset.length,
      meanDiffDeg:
        Math.round(diffs.reduce((a, b) => a + b, 0) / Math.max(diffs.length, 1)),
      medianDiffDeg: Math.round(median(diffs)),
      within30: subset.filter(r => r.diffDeg <= 30).length,
      meanMs: Math.round(ms.reduce((a, b) => a + b, 0) / Math.max(ms.length, 1)),
    };
  }

  if (json) {
    console.log(JSON.stringify({ landPolygons: featureCount, profiles, rows, aggregate: byProfile }, null, 2));
    return;
  }

  console.error(`Natural Earth polígonos: ${featureCount} | playas: ${playas.length} | perfiles: ${profiles.length}\n`);

  console.log(
    'Perfil'.padEnd(38) +
      'Δº media'.padEnd(12) +
      'Δº med'.padEnd(10) +
      '≤30°'.padEnd(8) +
      'ms Ø'
  );
  console.log('-'.repeat(82));
  for (const p of profiles) {
    const a = byProfile[p.id];
    console.log(
      p.id.padEnd(38) +
        String(a.meanDiffDeg).padEnd(12) +
        String(a.medianDiffDeg).padEnd(10) +
        `${a.within30}/${a.n}`.padEnd(8) +
        a.meanMs
    );
  }

  console.log('\n--- Detalle (primera playa × perfil, si hay varias playas revisar JSON) ---\n');
  const names = [...new Set(playas.map(p => p.nombre))];
  for (const nombre of names.slice(0, 3)) {
    console.log(`▸ ${nombre}`);
    for (const p of profiles) {
      const r = rows.find(x => x.nombre === nombre && x.profileId === p.id);
      if (!r) continue;
      console.log(
        `   ${p.id.padEnd(34)} orient:${r.orientation} Δ${r.diffDeg}° max:${r.maxDistanceKm}km ${r.ms}ms`
      );
    }
    console.log('');
  }
}

main();
