#!/usr/bin/env node
/**
 * Genera sectores angulares sugeridos (orientArcMin / orientArcMax / métricas)
 * usando el mismo motor que compare-matrix (perfil baseline por defecto).
 * Volcar resultado en beach-data.js a mano o con script propio — esto NO modifica datos.
 *
 * Uso:
 *   node scripts/experiments/orientacion/emit-beach-sectors.js --solo=Patos
 *   node scripts/experiments/orientacion/emit-beach-sectors.js --limit=12 > suggested.json
 */

const fs = require('fs');
const path = require('path');
const { loadNaturalEarthGalicia } = require('./lib/natural-earth');
const { runFull, angleDiff } = require('./lib/exposure-curve');
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
  let profileId = 'baseline-5deg-1km-25km';
  for (const x of a) {
    if (x.startsWith('--solo=')) solo = x.slice(7).trim();
    else if (x.startsWith('--limit=')) limit = parseInt(x.slice(8), 10);
    else if (x.startsWith('--profile=')) profileId = x.slice(10).trim();
  }
  return { solo, limit, profileId };
}

function main() {
  if (!fs.existsSync(NE_PATH)) {
    console.error('Falta scripts/ne_10m_land.geojson');
    process.exit(1);
  }

  const { solo, limit, profileId } = parseArgs();
  const profile = EXPERIMENT_PROFILES.find(p => p.id === profileId);
  if (!profile) {
    console.error('Perfil no encontrado:', profileId);
    process.exit(1);
  }

  const rayOpts = {
    stepAngle: profile.stepAngle,
    stepKm: profile.stepKm,
    maxKm: profile.maxKm,
    windowRatio: profile.windowRatio,
  };

  const { esTierra, turf } = loadNaturalEarthGalicia(NE_PATH);
  let playas = loadPlayas();
  if (solo)
    playas = playas.filter(p => p.nombre.toLowerCase() === solo.toLowerCase());
  if (!solo && limit != null) playas = playas.slice(0, limit);

  const out = [];
  for (const playa of playas) {
    const { stats } = runFull(playa.lat, playa.lon, esTierra, turf, rayOpts);
    const w = stats.window;
    const row = {
      nombre: playa.nombre,
      orientActualBeachData: playa.orient,
      orientComputed: stats.orientation,
      diffVsManualDeg: Math.round(angleDiff(stats.orientation, playa.orient)),
      orientArcMin: w ? Math.round(w[0]) : null,
      orientArcMax: w ? Math.round(w[1]) : null,
      exposureAngularScore: stats.exposureScore,
      maxDistanceKm: stats.maxDistanceKm,
      profileId,
      snippet: w
        ? `{ nombre:'${playa.nombre}', ..., orientArcMin:${Math.round(w[0])}, orientArcMax:${Math.round(w[1])}, orientComputed:${stats.orientation}, exposureAngular:${stats.exposureScore} },`
        : `{ nombre:'${playa.nombre}', ... sin ventana },`,
    };
    out.push(row);
  }

  console.log(JSON.stringify({ generated: new Date().toISOString(), rows: out }, null, 2));
}

main();
