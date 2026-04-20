// Verifica las coordenadas de playas.json contra OpenStreetMap (Overpass API).
//
// Estrategia: para cada playa, pide a Overpass TODAS las playas (natural=beach)
// dentro de un bounding box de RADIO_BUSQUEDA_KM alrededor del punto, sin
// filtrar por nombre (asi evitamos problemas con tildes y variantes "Praia de X").
// Luego, en Node, normaliza nombres (lowercase sin tildes) y busca el mejor match
// por inclusion o similitud. Mide la distancia con Haversine y reporta.
//
// Uso: node scripts/verificar-coords.js
// Requiere Node 18+ (fetch nativo). Sin dependencias externas.

const fs = require('fs');
const path = require('path');

const PLAYAS_PATH = path.join(__dirname, '..', 'playas.json');
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const RADIO_BUSQUEDA_KM = 8;
const UMBRAL_LEJOS_KM = 2;
const UMBRAL_MUY_LEJOS_KM = 10;
const DELAY_MS = 3000;
const MAX_RETRIES = 4;

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function normalizar(s) {
  if (!s) return '';
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .trim();
}

async function overpassFetch(query, intento) {
  intento = intento || 1;
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': '*/*',
      'User-Agent': 'salitre-verificar-coords/1.0',
    },
    body: 'data=' + encodeURIComponent(query),
  });

  if (res.status === 429 || res.status === 504) {
    if (intento > MAX_RETRIES) throw new Error('Overpass HTTP ' + res.status + ' tras ' + MAX_RETRIES + ' intentos');
    const espera = 5000 * Math.pow(2, intento - 1);
    await new Promise(r => setTimeout(r, espera));
    return overpassFetch(query, intento + 1);
  }

  if (!res.ok) throw new Error('Overpass HTTP ' + res.status);
  return res.json();
}

async function playasEnZona(lat, lon, radioKm) {
  const dLat = radioKm / 111;
  const dLon = radioKm / (111 * Math.cos((lat * Math.PI) / 180));
  const bbox = (lat - dLat) + ',' + (lon - dLon) + ',' + (lat + dLat) + ',' + (lon + dLon);

  const query =
    '[out:json][timeout:25];' +
    '(' +
      'node["natural"="beach"](' + bbox + ');' +
      'way["natural"="beach"](' + bbox + ');' +
      'relation["natural"="beach"](' + bbox + ');' +
    ');' +
    'out center tags 50;';

  const data = await overpassFetch(query);
  return data.elements
    .map(e => ({
      name: e.tags && e.tags.name,
      lat: e.lat != null ? e.lat : (e.center && e.center.lat),
      lon: e.lon != null ? e.lon : (e.center && e.center.lon),
      type: e.type,
      id: e.id,
    }))
    .filter(e => e.lat != null && e.lon != null && e.name);
}

function scoreMatch(nombrePlaya, nombreOSM) {
  const a = normalizar(nombrePlaya);
  const b = normalizar(nombreOSM);
  if (!a || !b) return 0;
  if (a === b) return 100;
  if (b.includes(a) || a.includes(b)) return 80;
  const pa = a.split(' ').filter(Boolean);
  const pb = b.split(' ').filter(Boolean);
  const comunes = pa.filter(p => pb.includes(p)).length;
  if (comunes > 0) return 40 + comunes * 10;
  return 0;
}

async function verificar(playa) {
  try {
    const cercanas = await playasEnZona(playa.lat, playa.lon, RADIO_BUSQUEDA_KM);
    if (cercanas.length === 0) return { playa, estado: 'sin-zona' };

    const conScore = cercanas
      .map(m => Object.assign({}, m, {
        dist: haversine(playa.lat, playa.lon, m.lat, m.lon),
        score: scoreMatch(playa.nombre, m.name),
      }))
      .filter(m => m.score > 0)
      .sort((a, b) => b.score - a.score || a.dist - b.dist);

    if (conScore.length === 0) {
      const topPorDist = cercanas
        .map(m => Object.assign({}, m, { dist: haversine(playa.lat, playa.lon, m.lat, m.lon) }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 3);
      return { playa, estado: 'sin-match-nombre', cercanas: topPorDist };
    }

    const closest = conScore[0];
    let estado = 'ok';
    if (closest.dist > UMBRAL_MUY_LEJOS_KM) estado = 'muy-lejos';
    else if (closest.dist > UMBRAL_LEJOS_KM) estado = 'lejos';

    return { playa, estado, closest, top: conScore.slice(0, 3) };
  } catch (e) {
    return { playa, estado: 'error', error: e.message };
  }
}

const ICONO = {
  'ok':                '\x1b[32mOK  \x1b[0m',
  'lejos':             '\x1b[33mWARN\x1b[0m',
  'muy-lejos':         '\x1b[31mBAD \x1b[0m',
  'sin-match-nombre':  '\x1b[90m?   \x1b[0m',
  'sin-zona':          '\x1b[90m?   \x1b[0m',
  'error':             '\x1b[31mERR \x1b[0m',
};

async function main() {
  const config = JSON.parse(fs.readFileSync(PLAYAS_PATH, 'utf-8'));
  const playas = config.playas;

  console.log('Verificando ' + playas.length + ' playas contra OpenStreetMap...');
  console.log('(radio: ' + RADIO_BUSQUEDA_KM + ' km, delay: ' + DELAY_MS + ' ms, retries: ' + MAX_RETRIES + ')\n');

  const resultados = [];
  for (let i = 0; i < playas.length; i++) {
    const playa = playas[i];
    process.stdout.write('  ' + String(i + 1).padStart(2) + '. ' + playa.nombre.padEnd(22) + ' ');

    const r = await verificar(playa);
    resultados.push(r);
    const icono = ICONO[r.estado];

    if (r.estado === 'ok' || r.estado === 'lejos' || r.estado === 'muy-lejos') {
      console.log(icono + ' ' + r.closest.dist.toFixed(2).padStart(6) + ' km  ->  ' + r.closest.name);
    } else if (r.estado === 'sin-match-nombre') {
      const cerca = r.cercanas.length > 0
        ? ' (cercanas: ' + r.cercanas.map(m => m.name + ' @ ' + m.dist.toFixed(1) + 'km').join(', ') + ')'
        : '';
      console.log(icono + ' ningun nombre coincide' + cerca);
    } else if (r.estado === 'sin-zona') {
      console.log(icono + ' no hay playas en ' + RADIO_BUSQUEDA_KM + ' km');
    } else {
      console.log(icono + ' ' + r.error);
    }

    if (i < playas.length - 1) await new Promise(r => setTimeout(r, DELAY_MS));
  }

  const ok = resultados.filter(r => r.estado === 'ok');
  const dudosas = resultados.filter(r => r.estado === 'lejos');
  const malas = resultados.filter(r => r.estado === 'muy-lejos');
  const sinNombre = resultados.filter(r => r.estado === 'sin-match-nombre');
  const sinZona = resultados.filter(r => r.estado === 'sin-zona');
  const errores = resultados.filter(r => r.estado === 'error');

  console.log('\n--- RESUMEN ---');
  console.log('  ok (< ' + UMBRAL_LEJOS_KM + ' km):       ' + ok.length);
  console.log('  lejos:              ' + dudosas.length);
  console.log('  muy lejos:          ' + malas.length);
  console.log('  sin match nombre:   ' + sinNombre.length);
  console.log('  sin playa cerca:    ' + sinZona.length);
  console.log('  errores:            ' + errores.length);

  if (malas.length > 0) {
    console.log('\nProbablemente incorrectas (>' + UMBRAL_MUY_LEJOS_KM + ' km):\n');
    for (const r of malas) {
      console.log('  ' + r.playa.nombre);
      console.log('    actual: ' + r.playa.lat.toFixed(4) + ', ' + r.playa.lon.toFixed(4));
      console.log('    OSM:    ' + r.closest.lat.toFixed(4) + ', ' + r.closest.lon.toFixed(4) + '  (' + r.closest.name + ', ' + r.closest.dist.toFixed(2) + ' km)');
      console.log();
    }
  }

  if (dudosas.length > 0) {
    console.log('Para revisar manualmente (' + UMBRAL_LEJOS_KM + '-' + UMBRAL_MUY_LEJOS_KM + ' km):\n');
    for (const r of dudosas) {
      console.log('  ' + r.playa.nombre + ': ' + r.closest.dist.toFixed(2) + ' km');
      console.log('    actual: ' + r.playa.lat.toFixed(4) + ', ' + r.playa.lon.toFixed(4));
      console.log('    OSM:    ' + r.closest.lat.toFixed(4) + ', ' + r.closest.lon.toFixed(4) + '  (' + r.closest.name + ')');
    }
    console.log();
  }

  if (sinNombre.length > 0) {
    console.log('Sin match de nombre (hay playas cerca pero con otro nombre):\n');
    for (const r of sinNombre) {
      console.log('  ' + r.playa.nombre + '  @  ' + r.playa.lat.toFixed(4) + ', ' + r.playa.lon.toFixed(4));
      for (const m of r.cercanas) {
        console.log('      - ' + m.name + ' @ ' + m.lat.toFixed(4) + ', ' + m.lon.toFixed(4) + ' (' + m.dist.toFixed(2) + ' km)');
      }
    }
    console.log();
  }

  if (sinZona.length > 0) {
    console.log('Sin playa cerca en OSM (' + RADIO_BUSQUEDA_KM + ' km):\n');
    for (const r of sinZona) {
      console.log('  ' + r.playa.nombre + '  @  ' + r.playa.lat.toFixed(4) + ', ' + r.playa.lon.toFixed(4));
    }
  }
}

main().catch(e => {
  console.error('\nError fatal:', e);
  process.exit(1);
});
