// calcular-orientacion.js
// Calcula automáticamente la orientación (orient) de cada playa
// a partir de la línea de costa de OpenStreetMap via Overpass API
//
// Uso: node scripts/calcular-orientacion.js
//
// Para cada playa:
// 1. Consulta Overpass: coastline en radio 600m
// 2. Encuentra el segmento de costa más cercano al punto de la playa
// 3. Calcula la normal perpendicular orientada hacia el mar (lado abierto)
// 4. Imprime resultado comparado con valor actual en beach-data.js

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

// Diferencia angular mínima entre dos ángulos (0-180)
function angleDiff(a, b) {
  const d = Math.abs(((a - b) + 360) % 360);
  return d > 180 ? 360 - d : d;
}

// Distancia en metros entre dos puntos lat/lon
function distM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2-lat1)*Math.PI/180;
  const dLon = (lon2-lon1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Punto más cercano en un segmento A-B al punto P
function puntoCercanoEnSegmento(pLat, pLon, aLat, aLon, bLat, bLon) {
  const dx = bLon - aLon, dy = bLat - aLat;
  const len2 = dx*dx + dy*dy;
  if (len2 === 0) return { lat: aLat, lon: aLon, t: 0 };
  let t = ((pLon-aLon)*dx + (pLat-aLat)*dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return { lat: aLat + t*dy, lon: aLon + t*dx, t };
}

// Ángulo del segmento A→B en grados (0=Norte, 90=Este)
function anguloSegmento(aLat, aLon, bLat, bLon) {
  const dLon = bLon - aLon;
  const dLat = bLat - aLat;
  return (Math.atan2(dLon, dLat) * 180/Math.PI + 360) % 360;
}

// Normal perpendicular al segmento orientada hacia el mar
// El mar está en la dirección desde el punto de la playa hacia el agua abierta
// Devuelve el ángulo que "entra" al mar (desde tierra al mar)
function normalHaciaElMar(segAngulo, playaLat, playaLon, coastLat, coastLon) {
  // Dos normales posibles: +90 y -90 respecto al segmento
  const n1 = (segAngulo + 90) % 360;
  const n2 = (segAngulo - 90 + 360) % 360;

  // El punto de costa más cercano está en la línea de costa
  // El mar está al lado donde NO hay tierra firme
  // Aproximación: el mar está al lado que mira más hacia el oeste/suroeste en Galicia
  // Validación: calculamos qué normal apunta más hacia el océano Atlántico
  // El Atlántico está al oeste de Galicia (aprox lon -15 para espacio abierto)
  const oceanLon = -20, oceanLat = playaLat; // punto de referencia en el Atlántico

  const ang1ToOcean = (Math.atan2(oceanLon - playaLon, oceanLat - playaLat) * 180/Math.PI + 360) % 360;
  const diff1 = angleDiff(n1, ang1ToOcean);
  const diff2 = angleDiff(n2, ang1ToOcean);

  return diff1 < diff2 ? n1 : n2;
}

async function consultarOverpass(lat, lon, radio = 600) {
  const query = `
    [out:json][timeout:10];
    way["natural"="coastline"](around:${radio},${lat},${lon});
    out geom;
  `;
  const url = 'https://lz4.overpass-api.de/api/interpreter';
  const resp = await fetch(url, {
    method: 'POST',
    body: 'data=' + encodeURIComponent(query),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'User-Agent': 'salitre-surf-app/1.0'
    }
  });
  if (!resp.ok) throw new Error(`Overpass ${resp.status}`);
  return resp.json();
}

function calcularOrientacion(playa, data) {
  if (!data.elements || data.elements.length === 0) {
    return { error: 'sin datos de costa en 600m' };
  }

  // Recopilar todos los segmentos de todos los ways
  let mejorDist = Infinity;
  let mejorSegAngulo = null;
  let mejorCoastLat = null, mejorCoastLon = null;

  for (const way of data.elements) {
    if (!way.geometry || way.geometry.length < 2) continue;
    const nodes = way.geometry;

    for (let i = 0; i < nodes.length - 1; i++) {
      const A = nodes[i], B = nodes[i+1];
      const { lat: cLat, lon: cLon } = puntoCercanoEnSegmento(
        playa.lat, playa.lon, A.lat, A.lon, B.lat, B.lon
      );
      const dist = distM(playa.lat, playa.lon, cLat, cLon);
      if (dist < mejorDist) {
        mejorDist = dist;
        mejorSegAngulo = anguloSegmento(A.lat, A.lon, B.lat, B.lon);
        mejorCoastLat = cLat;
        mejorCoastLon = cLon;
      }
    }
  }

  if (mejorSegAngulo === null) return { error: 'no se encontró segmento válido' };

  const orientCalc = normalHaciaElMar(
    mejorSegAngulo, playa.lat, playa.lon, mejorCoastLat, mejorCoastLon
  );
  const diff = angleDiff(orientCalc, playa.orientActual);

  return {
    orientCalc: Math.round(orientCalc),
    segAngulo: Math.round(mejorSegAngulo),
    distCosta: Math.round(mejorDist),
    diff,
    ok: diff <= 25
  };
}

async function main() {
  console.log('=== CÁLCULO AUTOMÁTICO DE ORIENTACIONES ===');
  console.log(`Procesando ${PLAYAS.length} playas...\n`);
  console.log('Playa                  | Actual | Calc | Dif | Estado');
  console.log('─'.repeat(60));

  const resultados = [];
  let errores = 0, coinciden = 0, discrepan = 0;

  for (const playa of PLAYAS) {
    try {
      // Rate limit: 1 req/seg para no saturar Overpass
      await new Promise(r => setTimeout(r, 1100));

      const data = await consultarOverpass(playa.lat, playa.lon);
      const res = calcularOrientacion(playa, data);

      const nombre = playa.nombre.padEnd(22);

      if (res.error) {
        // Reintentar con radio mayor
        await new Promise(r => setTimeout(r, 1100));
        const data2 = await consultarOverpass(playa.lat, playa.lon, 1500);
        const res2 = calcularOrientacion(playa, data2);

        if (res2.error) {
          console.log(`${nombre}| ${playa.orientActual}°   | ---- | --- | ⚠️  ${res2.error}`);
          resultados.push({ ...playa, orientCalc: null, error: res2.error });
          errores++;
        } else {
          const estado = res2.ok ? '✅' : '⚠️  revisar';
          console.log(`${nombre}| ${String(playa.orientActual).padEnd(6)}| ${String(res2.orientCalc).padEnd(4)} | ${String(Math.round(res2.diff)).padEnd(3)}° | ${estado} (radio ampliado)`);
          resultados.push({ ...playa, ...res2 });
          res2.ok ? coinciden++ : discrepan++;
        }
      } else {
        const estado = res.ok ? '✅' : '⚠️  revisar';
        console.log(`${nombre}| ${String(playa.orientActual).padEnd(6)}| ${String(res.orientCalc).padEnd(4)} | ${String(Math.round(res.diff)).padEnd(3)}° | ${estado}`);
        resultados.push({ ...playa, ...res });
        res.ok ? coinciden++ : discrepan++;
      }
    } catch (e) {
      console.log(`${playa.nombre.padEnd(22)}| ${playa.orientActual}°   | ---- | --- | ❌ ${e.message}`);
      resultados.push({ ...playa, orientCalc: null, error: e.message });
      errores++;
    }
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`✅ Coinciden (±25°): ${coinciden} | ⚠️  Discrepan: ${discrepan} | ❌ Errores: ${errores}`);

  // Mostrar solo las que discrepan para revisión manual
  const revisar = resultados.filter(r => r.orientCalc != null && !r.ok);
  if (revisar.length > 0) {
    console.log('\n=== REVISAR MANUALMENTE ===');
    for (const r of revisar) {
      console.log(`  ${r.nombre}: actual=${r.orientActual}° → calculado=${r.orientCalc}° (dif ${Math.round(r.diff)}°)`);
    }
  }

  // Generar bloque JS listo para copiar en beach-data.js
  console.log('\n=== ORIENTACIONES CALCULADAS (para beach-data.js) ===');
  for (const r of resultados) {
    if (r.orientCalc != null) {
      const flag = r.ok ? '' : ' // ⚠️ revisar';
      console.log(`  // ${r.nombre}: ${r.orientCalc}°${flag}`);
    }
  }
}

main().catch(console.error);
