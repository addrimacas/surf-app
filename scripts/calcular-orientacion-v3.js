// calcular-orientacion-v3.js
// Ray casting con Natural Earth land polygons
// Descarga previa necesaria: ne_10m_land.geojson en la misma carpeta
//
// Uso: node scripts/calcular-orientacion-v3.js

const fs = require('fs');
const path = require('path');
const turf = require('@turf/turf');

// Cargar land polygons (recortamos a bbox Galicia para velocidad)
const landPath = path.join(__dirname, 'ne_10m_land.geojson');
if (!fs.existsSync(landPath)) {
  console.error('❌ Falta ne_10m_land.geojson en scripts/');
  console.error('   Descárgalo con:');
  console.error('   curl -L "https://naciscdn.org/naturalearth/10m/physical/ne_10m_land.zip" -o scripts/ne_land.zip && unzip scripts/ne_land.zip -d scripts/');
  process.exit(1);
}

console.log('Cargando land polygons...');
const landRaw = JSON.parse(fs.readFileSync(landPath, 'utf8'));

// Recortar a bbox Galicia + margen para acelerar point-in-polygon
const BBOX = [-10.5, 41.5, -7.5, 44.5];
const land = turf.featureCollection(
  landRaw.features.filter(f => {
    const bb = turf.bbox(f);
    return bb[0] < BBOX[2] && bb[2] > BBOX[0] && bb[1] < BBOX[3] && bb[3] > BBOX[1];
  })
);
console.log(`  ${land.features.length} polígonos de tierra relevantes\n`);

function esTierra(lon, lat) {
  const pt = turf.point([lon, lat]);
  return land.features.some(f => turf.booleanPointInPolygon(pt, f));
}

// Ray casting: lanza rayos cada STEP_DEG grados hasta MAX_KM
// Devuelve el ángulo de mayor distancia libre de tierra
function calcularOrientacion(lat, lon) {
  const STEP_DEG = 5;
  const MAX_KM = 25;
  const SAMPLE_KM = 0.5;
  const origin = turf.point([lon, lat]);

  let scores = {};
  for (let ang = 0; ang < 360; ang += STEP_DEG) {
    let libre = 0;
    for (let d = SAMPLE_KM; d <= MAX_KM; d += SAMPLE_KM) {
      const p = turf.destination(origin, d, ang, { units: 'kilometers' });
      const [pLon, pLat] = p.geometry.coordinates;
      if (esTierra(pLon, pLat)) break;
      libre += SAMPLE_KM;
    }
    scores[ang] = libre;
  }

  // Suavizado: media móvil ±15°
  let smoothed = {};
  for (let ang = 0; ang < 360; ang += STEP_DEG) {
    let sum = 0, count = 0;
    for (let d = -15; d <= 15; d += STEP_DEG) {
      const a = ((ang + d) + 360) % 360;
      if (scores[a] !== undefined) { sum += scores[a]; count++; }
    }
    smoothed[ang] = sum / count;
  }

  // Penalizar rías: si libre < 5km, reducir score
  for (let ang = 0; ang < 360; ang += STEP_DEG) {
    if (scores[ang] < 5) smoothed[ang] *= 0.4;
  }

  // Encontrar el ángulo con mayor score
  let bestAng = 0, bestScore = -1;
  for (const [ang, score] of Object.entries(smoothed)) {
    if (score > bestScore) { bestScore = score; bestAng = parseInt(ang); }
  }

  return bestAng;
}

function angleDiff(a, b) {
  const d = Math.abs(((a - b) + 360) % 360);
  return d > 180 ? 360 - d : d;
}

const PLAYAS = [
  { nombre:'Patos',        lat:42.1555, lon:-8.8237, orientActual:215 },
  { nombre:'Prado',        lat:42.1590, lon:-8.8200, orientActual:220 },
  { nombre:'Vao',          lat:42.1978, lon:-8.7928, orientActual:225 },
  { nombre:'Samil',        lat:42.2074, lon:-8.7772, orientActual:252 },
  { nombre:'Nerga',        lat:42.2573, lon:-8.8364, orientActual:248 },
  { nombre:'Melide',       lat:42.2513, lon:-8.8673, orientActual:270 },
  { nombre:'Caneliñas',    lat:42.3912, lon:-8.8256, orientActual:268 },
  { nombre:'Canelas',      lat:42.3892, lon:-8.8320, orientActual:262 },
  { nombre:'Montalvo',     lat:42.3961, lon:-8.8480, orientActual:268 },
  { nombre:'Foxos',        lat:42.4264, lon:-8.8746, orientActual:272 },
  { nombre:'Lanzada',      lat:42.4401, lon:-8.8723, orientActual:275 },
  { nombre:'Vilar',        lat:42.5530, lon:-9.0300, orientActual:238 },
  { nombre:'Ladeira',      lat:42.5780, lon:-9.0589, orientActual:260 },
  { nombre:'Balieiros',    lat:42.5805, lon:-9.0783, orientActual:262 },
  { nombre:'Seráns',       lat:42.6028, lon:-9.0621, orientActual:258 },
  { nombre:'Furnas',       lat:42.6396, lon:-9.0391, orientActual:255 },
  { nombre:'Río Sieira',   lat:42.6469, lon:-9.0364, orientActual:255 },
  { nombre:'Queiruga',     lat:42.6762, lon:-9.0309, orientActual:268 },
  { nombre:'Baroña',       lat:42.6912, lon:-9.0278, orientActual:260 },
  { nombre:'Fonforrón',    lat:42.7178, lon:-9.0081, orientActual:272 },
  { nombre:'Aguieira',     lat:42.7402, lon:-8.9746, orientActual:275 },
  { nombre:'Ancoradoiro',  lat:42.7558, lon:-9.1007, orientActual:255 },
  { nombre:'Lariño',       lat:42.7706, lon:-9.1228, orientActual:250 },
  { nombre:'Carnota',      lat:42.8292, lon:-9.1051, orientActual:245 },
  { nombre:'Mar de Fora',  lat:42.9083, lon:-9.2746, orientActual:278 },
  { nombre:'Rostro',       lat:42.9701, lon:-9.2619, orientActual:290 },
  { nombre:'Nemiña',       lat:43.0095, lon:-9.2635, orientActual:280 },
  { nombre:'Traba',        lat:43.1936, lon:-9.0409, orientActual:272 },
  { nombre:'Soesto',       lat:43.2139, lon:-9.0213, orientActual:275 },
  { nombre:'Seaia',        lat:43.3278, lon:-8.8280, orientActual:295 },
  { nombre:'Malpica',      lat:43.3231, lon:-8.8141, orientActual:305 },
  { nombre:'Razo',         lat:43.2911, lon:-8.7021, orientActual:312 },
  { nombre:'Baldaio',      lat:43.3004, lon:-8.6678, orientActual:310 },
  { nombre:'Caión',         lat:43.3157, lon:-8.6094, orientActual:314 },
  { nombre:'Barrañán',      lat:43.3112, lon:-8.5512, orientActual:310 },
  { nombre:'Valcovo',       lat:43.3160, lon:-8.5331, orientActual:314 },
  { nombre:'Repibelo',      lat:43.3226, lon:-8.5215, orientActual:314 },
  { nombre:'Sabón',         lat:43.3278, lon:-8.5098, orientActual:314 },
  { nombre:'Orzán',         lat:43.3739, lon:-8.4033, orientActual:306 },
  { nombre:'Riazor',        lat:43.3683, lon:-8.4089, orientActual:315 },
  { nombre:'Matadero',      lat:43.3755, lon:-8.4036, orientActual:305 },
  { nombre:'Santa Cristina',lat:43.3393, lon:-8.3769, orientActual:355 },
  { nombre:'Bastiagueiro',  lat:43.3408, lon:-8.3635, orientActual:358 },
  { nombre:'Doniños',    lat:43.5001, lon:-8.3188, orientActual:335 },
  { nombre:'San Jorge',  lat:43.5321, lon:-8.2972, orientActual:338 },
  { nombre:'Santa Comba',lat:43.5562, lon:-8.2908, orientActual:340 },
  { nombre:'Ponzos',     lat:43.5550, lon:-8.2692, orientActual:342 },
  { nombre:'Campelo',    lat:43.5831, lon:-8.2155, orientActual:345 },
  { nombre:'Valdoviño',  lat:43.6150, lon:-8.1526, orientActual:348 },
  { nombre:'Pantín',     lat:43.6405, lon:-8.1124, orientActual:340 },
  { nombre:'Vilarrube',  lat:43.6422, lon:-8.0718, orientActual:338 },
];

console.log('Playa                  | Actual | Calc | Dif | Estado');
console.log('─'.repeat(62));

let ok=0, revisar=0;
const resultados = [];

for (const playa of PLAYAS) {
  const calc = calcularOrientacion(playa.lat, playa.lon);
  const diff = angleDiff(calc, playa.orientActual);
  const estado = diff <= 25 ? '✅' : '⚠️';
  const nombre = playa.nombre.padEnd(22);
  console.log(`${nombre}| ${String(playa.orientActual).padEnd(6)}| ${String(calc).padEnd(4)} | ${String(Math.round(diff)).padEnd(3)}° | ${estado}`);
  diff <= 25 ? ok++ : revisar++;
  resultados.push({ ...playa, calc, diff });
}

console.log('\n' + '─'.repeat(62));
console.log(`✅ Coinciden (±25°): ${ok} | ⚠️ Revisar: ${revisar}`);

console.log('\n=== RESULTADO FINAL PARA beach-data.js ===');
for (const r of resultados) {
  const flag = r.diff > 25 ? ' // ⚠️ verificar' : '';
  console.log(`  ${r.nombre.padEnd(18)}: orient:${r.calc}${flag}`);
}
