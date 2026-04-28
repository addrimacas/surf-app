#!/usr/bin/env node
// calcular-exposicion.js
// Uso: node calcular-exposicion.js
// Requiere Node 18+. Sin dependencias externas.
//
// Estrategia: usa solo GEBCO via opentopodata para todo.
//   - Profundidad: |elevación GEBCO| a 1 km offshore en dirección orient
//   - Fetch: primer punto (10→200 km) donde elevación GEBCO >= 0 (tierra)
//   - Batch: hasta 100 ubicaciones por petición para minimizar llamadas

const PLAYAS = [
  { nombre:'Riazor',         lat:43.3683, lon:-8.4089, orient:315 },
  { nombre:'Orzán',          lat:43.3721, lon:-8.4201, orient:300 },
  { nombre:'Santa Cristina', lat:43.3950, lon:-8.3200, orient:350 },
  { nombre:'Bastiagueiro',   lat:43.3980, lon:-8.3050, orient:350 },
  { nombre:'Baldaio',        lat:43.3167, lon:-8.6333, orient:280 },
  { nombre:'Razo',           lat:43.2833, lon:-8.6833, orient:275 },
  { nombre:'Rebordelo',      lat:43.2600, lon:-8.7500, orient:270 },
  { nombre:'Nemiña',         lat:43.1000, lon:-9.0500, orient:255 },
  { nombre:'Carnota',        lat:42.8833, lon:-9.1000, orient:245 },
  { nombre:'Lariño',         lat:42.8667, lon:-9.1167, orient:250 },
  { nombre:'Louro',          lat:42.7667, lon:-8.9833, orient:240 },
  { nombre:'Área (Viveiro)', lat:43.6667, lon:-7.6000, orient:340 },
  { nombre:'Llas',           lat:43.7000, lon:-7.5500, orient:345 },
  { nombre:'Esteiro',        lat:43.6500, lon:-7.6500, orient:335 },
  { nombre:'Pantín',         lat:43.7167, lon:-7.7000, orient:350 },
  { nombre:'Frouxeira',      lat:43.6833, lon:-7.8833, orient:340 },
  { nombre:'Langosteira',    lat:43.1833, lon:-8.9000, orient:260 },
  { nombre:'Rostro',         lat:43.0500, lon:-9.1833, orient:250 },
];

const PASOS_FETCH = [10, 25, 50, 100, 150, 200]; // km
const DELAY_MS    = 1100; // opentopodata free: ~1 req/s

const sleep = ms => new Promise(r => setTimeout(r, ms));

function puntoOffset(lat, lon, orientDeg, km) {
  const rad = orientDeg * Math.PI / 180;
  const latOff = (km / 111) * Math.cos(rad);
  const lonOff = (km / (111 * Math.cos(lat * Math.PI / 180))) * Math.sin(rad);
  return { lat: lat + latOff, lon: lon + lonOff };
}

// Consulta GEBCO para un array de {lat, lon} en una sola petición batch.
// Devuelve array de elevaciones en el mismo orden.
async function gebcoBatch(puntos) {
  const locs = puntos.map(p => `${p.lat.toFixed(6)},${p.lon.toFixed(6)}`).join('|');
  const url  = `https://api.opentopodata.org/v1/gebco2020?locations=${locs}`;
  const res  = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`opentopodata HTTP ${res.status}: ${body.slice(0, 120)}`);
  }
  const data = await res.json();
  if (data.status !== 'OK') throw new Error(`opentopodata status: ${data.status} — ${JSON.stringify(data).slice(0,200)}`);
  return data.results.map(r => r.elevation ?? 0);
}

function calcularExposicion(fetchKm, profundidad) {
  return Math.min(1,
    (Math.log(fetchKm + 1) / Math.log(201)) *
    (Math.min(profundidad, 100) / 100)
  );
}

async function procesarPlaya(playa) {
  // Preparamos todos los puntos de golpe: 1 para profundidad + N para fetch
  const puntoProfundidad = puntoOffset(playa.lat, playa.lon, playa.orient, 1.0);
  const puntosFetch      = PASOS_FETCH.map(km => puntoOffset(playa.lat, playa.lon, playa.orient, km));
  const todosPuntos      = [puntoProfundidad, ...puntosFetch];

  const elevaciones = await gebcoBatch(todosPuntos);

  // Profundidad: primer punto (1 km), negativo = bajo el mar
  const elevProf = elevaciones[0];
  const profundidad = Math.abs(elevProf); // en metros, valor absoluto

  // Fetch: primer paso donde elevación >= 0 (tierra detectada)
  let fetchKm = 200;
  for (let i = 0; i < PASOS_FETCH.length; i++) {
    if (elevaciones[i + 1] >= 0) {
      fetchKm = PASOS_FETCH[i];
      break;
    }
  }

  const exposicion = calcularExposicion(fetchKm, profundidad);
  return { profundidad, fetchKm, exposicion };
}

async function main() {
  console.log('=== CÁLCULO DE EXPOSICIÓN (GEBCO batch) ===\n');
  console.log('Playa'.padEnd(20), 'Prof(m)'.padEnd(10), 'Fetch(km)'.padEnd(12), 'Exposición');
  console.log('-'.repeat(58));

  const resultados = [];

  for (const playa of PLAYAS) {
    process.stdout.write(`  ${playa.nombre.padEnd(18)} calculando...`);
    try {
      const { profundidad, fetchKm, exposicion } = await procesarPlaya(playa);
      process.stdout.write(
        `\r  ${playa.nombre.padEnd(18)} ${String(profundidad.toFixed(1)).padEnd(10)} ${String(fetchKm).padEnd(12)} ${exposicion.toFixed(3)}\n`
      );
      resultados.push({ ...playa, profundidad, fetchKm, exposicion });
    } catch (e) {
      process.stdout.write(`\r  ${playa.nombre.padEnd(18)} ERROR: ${e.message} → exposicion:0.500\n`);
      resultados.push({ ...playa, profundidad: null, fetchKm: null, exposicion: 0.5 });
    }
    await sleep(DELAY_MS);
  }

  console.log('\n=== CAMPOS PARA beach-data.js ===\n');
  for (const r of resultados) {
    const exp  = r.exposicion.toFixed(3);
    const prof = r.profundidad != null ? r.profundidad.toFixed(1) : 'null';
    const fet  = r.fetchKm    != null ? String(r.fetchKm)         : 'null';
    console.log(
      `  { nombre:'${r.nombre}',`.padEnd(30) +
      ` exposicion:${exp}, profundidad:${prof}, fetch:${fet} },`
    );
  }

  console.log('\n=== JSON PARA localStorage (pega en DevTools → Console) ===\n');
  const json = {};
  for (const r of resultados) {
    json[r.nombre] = {
      profundidad: r.profundidad != null ? parseFloat(r.profundidad.toFixed(1)) : null,
      fetch:       r.fetchKm,
      exposicion:  parseFloat(r.exposicion.toFixed(3)),
    };
  }
  console.log(`localStorage.setItem('salitre_exposicion', JSON.stringify(${JSON.stringify(json, null, 2)}));`);
}

main().catch(e => {
  console.error('Error fatal:', e);
  process.exit(1);
});
