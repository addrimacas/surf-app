// calcular-orientacion-geometrico.js
// Calcula orientación de playas SIN llamadas externas
// Método: ray casting hacia puntos de agua abierta del Atlántico
// ponderado por distancia y ángulo libre de tierra
//
// Uso: node scripts/calcular-orientacion-geometrico.js

// Puntos de tierra conocidos de Galicia (cabos y puntas relevantes)
// Usados para detectar si un rayo choca con tierra antes de llegar al océano
const TIERRA_GALICIA = [
  // Rías Baixas
  { lat:42.113, lon:-8.900, r:8000,  nombre:'Cabo Silleiro' },
  { lat:42.250, lon:-8.900, r:5000,  nombre:'Punta Subrido' },
  { lat:42.330, lon:-8.870, r:4000,  nombre:'Punta Couso' },
  { lat:42.440, lon:-8.930, r:3000,  nombre:'Punta do Castro' },
  { lat:42.500, lon:-8.960, r:3000,  nombre:'Punta Falcoeiro' },
  // Costa Barbanza / Corrubedo
  { lat:42.545, lon:-9.020, r:4000,  nombre:'Punta Barbanza' },
  { lat:42.594, lon:-9.090, r:3000,  nombre:'Punta Insua' },
  { lat:42.745, lon:-9.150, r:5000,  nombre:'Punta Curota' },
  // Costa da Morte
  { lat:42.880, lon:-9.290, r:4000,  nombre:'Cabo Fisterra' },
  { lat:43.030, lon:-9.300, r:5000,  nombre:'Cabo Touriñán' },
  { lat:43.100, lon:-9.190, r:3000,  nombre:'Punta Barca' },
  { lat:43.190, lon:-9.100, r:3000,  nombre:'Punta Nemiña' },
  { lat:43.290, lon:-8.980, r:4000,  nombre:'Cabo Vilán' },
  { lat:43.330, lon:-8.900, r:4000,  nombre:'Punta Nariga' },
  // Costa Coruñesa
  { lat:43.380, lon:-8.430, r:3000,  nombre:'Punta Herminia (A Coruña)' },
  { lat:43.350, lon:-8.370, r:2000,  nombre:'Punta Fieiteira' },
  // Ferrolterra
  { lat:43.480, lon:-8.340, r:3000,  nombre:'Cabo Prior' },
  { lat:43.570, lon:-8.320, r:2000,  nombre:'Punta Frouxeira' },
  { lat:43.650, lon:-8.140, r:3000,  nombre:'Cabo Ortegal' },
  // Islas
  { lat:42.230, lon:-8.920, r:6000,  nombre:'Islas Cíes' },
  { lat:42.430, lon:-8.920, r:4000,  nombre:'Isla Ons' },
  { lat:42.595, lon:-8.870, r:3000,  nombre:'Isla Sálvora' },
];

const PLAYAS = [
  // Rías Baixas
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
  // Costa de Barbanza
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
  // Costa da Morte
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
  // Costa Coruñesa
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
  // Ferrolterra
  { nombre:'Doniños',    lat:43.5001, lon:-8.3188, orientActual:335 },
  { nombre:'San Jorge',  lat:43.5321, lon:-8.2972, orientActual:338 },
  { nombre:'Santa Comba',lat:43.5562, lon:-8.2908, orientActual:340 },
  { nombre:'Ponzos',     lat:43.5550, lon:-8.2692, orientActual:342 },
  { nombre:'Campelo',    lat:43.5831, lon:-8.2155, orientActual:345 },
  { nombre:'Valdoviño',  lat:43.6150, lon:-8.1526, orientActual:348 },
  { nombre:'Pantín',     lat:43.6405, lon:-8.1124, orientActual:340 },
  { nombre:'Vilarrube',  lat:43.6422, lon:-8.0718, orientActual:338 },
];

function toRad(d) { return d * Math.PI / 180; }
function toDeg(r) { return r * 180 / Math.PI; }

// Punto en dirección (angulo grados, distancia metros) desde lat/lon
function puntoEn(lat, lon, angulo, distM) {
  const R = 6371000;
  const ang = toRad(angulo);
  const d = distM / R;
  const lat1 = toRad(lat), lon1 = toRad(lon);
  const lat2 = Math.asin(Math.sin(lat1)*Math.cos(d) + Math.cos(lat1)*Math.sin(d)*Math.cos(ang));
  const lon2 = lon1 + Math.atan2(Math.sin(ang)*Math.sin(d)*Math.cos(lat1), Math.cos(d)-Math.sin(lat1)*Math.sin(lat2));
  return { lat: toDeg(lat2), lon: toDeg(lon2) };
}

// Distancia entre dos puntos en metros
function distM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = toRad(lat2-lat1), dLon = toRad(lon2-lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ¿El rayo en dirección `angulo` desde la playa está bloqueado por tierra?
// Comprueba a 10, 20, 40, 80, 150 km si hay tierra conocida cerca del rayo
function rayoBloqueado(playaLat, playaLon, angulo) {
  const distancias = [10000, 25000, 50000, 100000, 200000];
  for (const d of distancias) {
    const p = puntoEn(playaLat, playaLon, angulo, d);
    for (const t of TIERRA_GALICIA) {
      const dist = distM(p.lat, p.lon, t.lat, t.lon);
      if (dist < t.r) return true; // choca con tierra
    }
  }
  return false;
}

// Diferencia angular mínima
function angleDiff(a, b) {
  const d = Math.abs(((a - b) + 360) % 360);
  return d > 180 ? 360 - d : d;
}

// Calcula orientación: lanza rayos cada 5° en el semicírculo marítimo
// y pondera los que llegan al océano sin chocar con tierra
function calcularOrientacion(playa) {
  // Solo miramos el semicírculo "marino" de Galicia: 180°-360° (SO a N pasando por O)
  // Con un margen para playas atípicas
  const rayosLibres = [];

  for (let ang = 150; ang <= 380; ang += 5) {
    const angNorm = ((ang % 360) + 360) % 360;
    if (!rayoBloqueado(playa.lat, playa.lon, angNorm)) {
      rayosLibres.push(angNorm);
    }
  }

  if (rayosLibres.length === 0) return null;

  // Media circular ponderada de los rayos libres
  // Peso: cos²(diferencia con el centro del arco libre) — más peso al centro
  // Primero encontrar el centro del arco libre
  let sumSin = 0, sumCos = 0;
  for (const a of rayosLibres) {
    sumSin += Math.sin(toRad(a));
    sumCos += Math.cos(toRad(a));
  }
  const centroArco = (toDeg(Math.atan2(sumSin, sumCos)) + 360) % 360;

  // Media ponderada con peso coseno respecto al centro
  let wSin = 0, wCos = 0, wTotal = 0;
  for (const a of rayosLibres) {
    const diff = angleDiff(a, centroArco);
    const peso = Math.cos(toRad(diff)) + 1; // 0-2, máximo en el centro
    wSin += peso * Math.sin(toRad(a));
    wCos += peso * Math.cos(toRad(a));
    wTotal += peso;
  }

  const orientCalc = (toDeg(Math.atan2(wSin/wTotal, wCos/wTotal)) + 360) % 360;
  return Math.round(orientCalc);
}

// --- Main ---
console.log('=== ORIENTACIONES GEOMÉTRICAS (sin llamadas externas) ===\n');
console.log('Playa                  | Actual | Calc | Dif | Estado');
console.log('─'.repeat(62));

let ok = 0, revisar = 0;
const toRevisar = [];
const nuevasOrientaciones = {};

for (const playa of PLAYAS) {
  const calc = calcularOrientacion(playa);
  const nombre = playa.nombre.padEnd(22);

  if (calc === null) {
    console.log(`${nombre}| ${String(playa.orientActual).padEnd(6)}| ---- | --- | ❌ sin rayos libres`);
    continue;
  }

  const diff = angleDiff(calc, playa.orientActual);
  const estado = diff <= 25 ? '✅' : diff <= 40 ? '⚠️' : '❌';
  console.log(`${nombre}| ${String(playa.orientActual).padEnd(6)}| ${String(calc).padEnd(4)} | ${String(Math.round(diff)).padEnd(3)}° | ${estado}`);

  nuevasOrientaciones[playa.nombre] = calc;
  if (diff <= 25) ok++;
  else { revisar++; toRevisar.push({ ...playa, calc, diff }); }
}

console.log('\n' + '─'.repeat(62));
console.log(`✅ Coinciden (±25°): ${ok} | ⚠️/❌ Revisar: ${revisar}`);

if (toRevisar.length > 0) {
  console.log('\n=== REVISAR MANUALMENTE ===');
  for (const r of toRevisar) {
    console.log(`  ${r.nombre.padEnd(18)}: actual=${r.orientActual}° → geométrico=${r.calc}° (dif ${Math.round(r.diff)}°)`);
  }
}

console.log('\n=== ORIENTACIONES CALCULADAS ===');
console.log('Copia estas líneas como referencia para actualizar beach-data.js:\n');
for (const [nombre, orient] of Object.entries(nuevasOrientaciones)) {
  console.log(`  ${nombre.padEnd(18)}: ${orient}°`);
}
