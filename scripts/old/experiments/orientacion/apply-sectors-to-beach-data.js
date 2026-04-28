#!/usr/bin/env node
/**
 * Calcula sector angular (perfil baseline NE) para todas las playas y escribe beach-data.js.
 * Copia de seguridad: beach-data.js.bak antes de sobrescribir (solo si --write).
 *
 *   node scripts/experiments/orientacion/apply-sectors-to-beach-data.js --dry-run
 *   node scripts/experiments/orientacion/apply-sectors-to-beach-data.js --write
 */

const fs = require('fs');
const path = require('path');
const { loadNaturalEarthGalicia } = require('./lib/natural-earth');
const { runFull } = require('./lib/exposure-curve');
const { EXPERIMENT_PROFILES } = require('./profiles-registry');

const ROOT = path.join(__dirname, '../../..');
const BEACH = path.join(ROOT, 'beach-data.js');
const NE_PATH = path.join(ROOT, 'scripts/ne_10m_land.geojson');

function loadPlayasFn() {
  const src = fs.readFileSync(BEACH, 'utf8');
  return new Function(`${src}; return typeof todasLasPlayas === 'function' ? todasLasPlayas() : [];`);
}

function computeAll(esTierra, turf, rayOpts, onProgress) {
  const playas = loadPlayasFn()();
  const map = {};
  let i = 0;
  for (const playa of playas) {
    i++;
    if (onProgress) onProgress(i, playas.length, playa.nombre);
    const { stats } = runFull(playa.lat, playa.lon, esTierra, turf, rayOpts);
    const w = stats.window;
    map[playa.nombre] = {
      orientComputed: stats.orientation,
      exposureAngular: stats.exposureScore,
      orientArcMin: w ? Math.round(w[0]) : null,
      orientArcMax: w ? Math.round(w[1]) : null,
    };
  }
  return map;
}

function injectLine(line, patch) {
  if (!patch) return line;
  const hasArc =
    patch.orientArcMin != null &&
    patch.orientArcMax != null &&
    line.includes('exposicion:');
  const suffix = hasArc
    ? `, orientArcMin:${patch.orientArcMin}, orientArcMax:${patch.orientArcMax}, orientComputed:${patch.orientComputed}, exposureAngular:${patch.exposureAngular}`
    : `, orientComputed:${patch.orientComputed}, exposureAngular:${patch.exposureAngular}`;
  return line.replace(/(exposicion:[\d.]+)(\s*\},\s*)$/, `$1${suffix}$2`);
}

function applyPatch(text, map) {
  return text
    .split('\n')
    .map(line => {
      const m = line.match(/\{ nombre:'([^']+)'/);
      if (!m || !line.includes('exposicion:')) return line;
      const nombre = m[1];
      return injectLine(line, map[nombre]);
    })
    .join('\n');
}

function main() {
  const write = process.argv.includes('--write');
  const dry = process.argv.includes('--dry-run') || !write;

  if (!fs.existsSync(NE_PATH)) {
    console.error('Falta scripts/ne_10m_land.geojson');
    process.exit(1);
  }

  const profile = EXPERIMENT_PROFILES.find(p => p.id === 'baseline-5deg-1km-25km');
  const rayOpts = {
    stepAngle: profile.stepAngle,
    stepKm: profile.stepKm,
    maxKm: profile.maxKm,
    windowRatio: profile.windowRatio,
  };

  const { esTierra, turf } = loadNaturalEarthGalicia(NE_PATH);

  console.error('Calculando sectores (baseline NE)...');
  const map = computeAll(esTierra, turf, rayOpts, (i, n, name) => {
    console.error(`  [${i}/${n}] ${name}`);
  });

  let text = fs.readFileSync(BEACH, 'utf8');

  const dupLines = text.split('\n').filter(l => /^\s*\{\s*nombre:/.test(l) && /orientArcMin:/.test(l));
  if (dupLines.length > 0) {
    console.error('beach-data ya tiene orientArcMin en filas de playa; abortando para no duplicar.');
    process.exit(1);
  }

  text = applyPatch(text, map);

  if (dry) {
    const prev = BEACH.replace(/\.js$/, '.preview.js');
    fs.writeFileSync(prev, text, 'utf8');
    console.error(`Vista previa: ${prev} (${Object.keys(map).length} playas). Revisa y ejecuta con --write.`);
    return;
  }

  fs.copyFileSync(BEACH, BEACH + '.bak');
  fs.writeFileSync(BEACH, text, 'utf8');
  console.error(`Escrito ${BEACH} (backup: beach-data.js.bak)`);

  const { execSync } = require('child_process');
  try {
    execSync(`node --check "${BEACH}"`, { stdio: 'pipe' });
    console.error('Syntax OK: node --check beach-data.js');
  } catch (e) {
    console.error('Syntax error en beach-data.js — restaura desde .bak');
    process.exit(1);
  }
}

main();
