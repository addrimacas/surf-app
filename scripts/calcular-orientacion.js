// calcular-orientacion.js v2
// Calcula orientación de playas usando polígonos natural=beach de OSM
// El eje largo del polígono define la línea de costa → perpendicular = orientación al mar
// Uso: node scripts/calcular-orientacion.js

const https = require('https');

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

function toRad(d) { return d * Math.PI / 180; }
function toDeg(r) { return r * 180 / Math.PI; }

function angleDiff(a, b) {
  const d = Math.abs(((a - b) + 360) % 360);
  return d > 180 ? 360 - d : d;
}

// Bearing de A→B
function bearing(lat1, lon1, lat2, lon2) {
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
            Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// Distancia en metros
function distM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = toRad(lat2-lat1), dLon = toRad(lon2-lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Centroide de un polígono
function centroide(nodos) {
  const lat = nodos.reduce((s,n) => s+n.lat, 0) / nodos.length;
  const lon = nodos.reduce((s,n) => s+n.lon, 0) / nodos.length;
  return { lat, lon };
}

// Eje principal del polígono (PCA simplificado)
// Devuelve el ángulo del eje largo del polígono
function ejePrincipal(nodos) {
  const c = centroide(nodos);
  // Calcular matriz de covarianza
  let sxx=0, syy=0, sxy=0;
  for (const n of nodos) {
    const dx = (n.lon - c.lon) * Math.cos(toRad(c.lat)) * 111320;
    const dy = (n.lat - c.lat) * 111320;
    sxx += dx*dx; syy += dy*dy; sxy += dx*dy;
  }
  // Eigenvector del mayor eigenvalue
  const diff = (sxx - syy) / 2;
  const angle = 0.5 * Math.atan2(2*sxy, sxx - syy);
  // Eje largo en grados (bearing)
  return (toDeg(angle) + 360) % 360;
}

// Normal perpendicular al eje, eligiendo el lado marino
// El lado marino es el que tiene menos tierra (aproximamos: el que apunta más al océano abierto)
function normalMarina(ejeLargo, playaLat, playaLon) {
  const n1 = (ejeLargo + 90) % 360;
  const n2 = (ejeLargo - 90 + 360) % 360;
  // Para elegir: miramos cuál de las dos normales, proyectada 50km,
  // tiene una longitud más al oeste (el Atlántico está al oeste de Galicia)
  // Pero también consideramos la latitud: norte de Galicia mira al norte
  // Usamos el punto a 30km en cada dirección y vemos cuál tiene lon más negativo (más al oeste/norte)
  const p1 = puntoEn(playaLat, playaLon, n1, 30000);
  const p2 = puntoEn(playaLat, playaLon, n2, 30000);
  // El mar está donde hay más "espacio" → coordenada más extrema hacia el Atlántico
  // Atlántico: lat~43, lon~-20 como punto de referencia
  const d1 = distM(p1.lat, p1.lon, 43, -20);
  const d2 = distM(p2.lat, p2.lon, 43, -20);
  // Menor distancia al Atlántico = ese lado es el mar
  return d1 < d2 ? Math.round(n1) : Math.round(n2);
}

function puntoEn(lat, lon, angulo, distM) {
  const R = 6371000;
  const ang = toRad(angulo);
  const d = distM / R;
  const lat1 = toRad(lat), lon1 = toRad(lon);
  const lat2 = Math.asin(Math.sin(lat1)*Math.cos(d) + Math.cos(lat1)*Math.sin(d)*Math.cos(ang));
  const lon2 = lon1 + Math.atan2(Math.sin(ang)*Math.sin(d)*Math.cos(lat1), Math.cos(d)-Math.sin(lat1)*Math.sin(lat2));
  return { lat: toDeg(lat2), lon: toDeg(lon2) };
}

function overpass(query) {
  return new Promise((resolve, reject) => {
    const postData = 'data=' + encodeURIComponent(query);
    const req = https.request({
      hostname: 'lz4.overpass-api.de',
      path: '/api/interpreter',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'curl/7.88.1',
        'Accept': '*/*'
      }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`Overpass ${res.statusCode}`));
        try { resolve(JSON.parse(data)); } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function calcularPlaya(playa) {
  // Buscar polígono natural=beach en radio 800m
  const query = `[out:json][timeout:15];
way["natural"="beach"](around:800,${playa.lat},${playa.lon});
out geom;`;

  const data = await overpass(query);

  if (!data.elements || data.elements.length === 0) {
    // Fallback: buscar con radio mayor
    const query2 = `[out:json][timeout:15];
way["natural"="beach"](around:2000,${playa.lat},${playa.lon});
out geom;`;
    const data2 = await overpass(query2);
    if (!data2.elements || data2.elements.length === 0) {
      return { error: 'sin polígono de playa en OSM' };
    }
    data.elements = data2.elements;
  }

  // Usar el polígono más cercano al punto de la playa
  let mejorWay = null, mejorDist = Infinity;
  for (const way of data.elements) {
    if (!way.geometry || way.geometry.length < 3) continue;
    const c = centroide(way.geometry);
    const d = distM(playa.lat, playa.lon, c.lat, c.lon);
    if (d < mejorDist) { mejorDist = d; mejorWay = way; }
  }

  if (!mejorWay) return { error: 'polígono sin geometría' };

  const eje = ejePrincipal(mejorWay.geometry);
  const orientCalc = normalMarina(eje, playa.lat, playa.lon);
  const diff = angleDiff(orientCalc, playa.orientActual);

  return { orientCalc, eje: Math.round(eje), distCentroide: Math.round(mejorDist), diff };
}

async function main() {
  console.log('=== ORIENTACIONES DESDE POLÍGONOS OSM (natural=beach) ===');
  console.log(`Procesando ${PLAYAS.length} playas...\n`);
  console.log('Playa                  | Actual | Calc | Dif | Estado');
  console.log('─'.repeat(62));

  let ok=0, revisar=0, errores=0;
  const resultados = [];

  for (const playa of PLAYAS) {
    await new Promise(r => setTimeout(r, 1200));
    try {
      const res = await calcularPlaya(playa);
      const nombre = playa.nombre.padEnd(22);
      if (res.error) {
        console.log(`${nombre}| ${String(playa.orientActual).padEnd(6)}| ---- | --- | ❌ ${res.error}`);
        errores++;
        resultados.push({ ...playa, orientCalc: null, error: res.error });
      } else {
        const estado = res.diff <= 25 ? '✅' : '⚠️  revisar';
        console.log(`${nombre}| ${String(playa.orientActual).padEnd(6)}| ${String(res.orientCalc).padEnd(4)} | ${String(Math.round(res.diff)).padEnd(3)}° | ${estado}`);
        res.diff <= 25 ? ok++ : revisar++;
        resultados.push({ ...playa, ...res });
      }
    } catch(e) {
      const nombre = playa.nombre.padEnd(22);
      console.log(`${nombre}| ${playa.orientActual}°   | ---- | --- | ❌ ${e.message}`);
      errores++;
      resultados.push({ ...playa, orientCalc: null, error: e.message });
    }
  }

  console.log('\n' + '─'.repeat(62));
  console.log(`✅ Coinciden (±25°): ${ok} | ⚠️  Discrepan: ${revisar} | ❌ Errores: ${errores}`);

  const paraRevisar = resultados.filter(r => r.orientCalc != null && r.diff > 25);
  if (paraRevisar.length) {
    console.log('\n=== REVISAR MANUALMENTE ===');
    paraRevisar.forEach(r => console.log(`  ${r.nombre}: actual=${r.orientActual}° → calculado=${r.orientCalc}° (dif ${Math.round(r.diff)}°)`));
  }

  console.log('\n=== RESULTADO FINAL ===');
  resultados.forEach(r => {
    if (r.orientCalc != null) {
      const flag = r.diff > 25 ? ' // ⚠️ verificar' : '';
      console.log(`  ${r.nombre.padEnd(18)}: orient:${r.orientCalc}${flag}`);
    } else {
      console.log(`  ${r.nombre.padEnd(18)}: orient:${r.orientActual} // ❌ mantener actual (${r.error})`);
    }
  });
}

main().catch(console.error);
