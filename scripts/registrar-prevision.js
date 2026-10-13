#!/usr/bin/env node
// scripts/registrar-prevision.js
// Guarda una vez al día la previsión de oleaje y viento de todas las playas de beach-data.js.
// Sirve para validar el modelo más adelante (panel ciego, aprendizaje con valoraciones).
//
// Uso:
//   node scripts/registrar-prevision.js            -> descarga y guarda registro/AAAA/MM/AAAA-MM-DD.json.gz
//   node scripts/registrar-prevision.js --dry-run  -> solo muestra las URLs, no descarga nada
//
// Sin dependencias: Node 18+ (fetch y zlib nativos).

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const zlib = require('zlib');
let ATLAS = null;
try { ATLAS = require('../atlas-playas.js'); } catch (e) { /* sin atlas: coordenadas de la playa */ }

// ---------------------------------------------------------------- configuración
const VERSION_FORMATO = 1;
// Modelo de oleaje FIJADO (nunca "best_match"/auto). meteofrance_wave es el que la app usa hoy
// por defecto y el único de Open-Meteo con swell secundario para Galicia.
const MODELO_OLEAJE = 'meteofrance_wave';
const MODELO_VIENTO = 'best_match'; // PENDIENTE: decidir modelo de viento fijo
const HORAS = 72;                    // horizonte guardado: 3 días (suficiente para validar D+0..D+2)
const LOTE = 20;                     // playas por petición (Open-Meteo admite varias coordenadas)

const VARS_OLEAJE = [
  'wave_height', 'wave_period', 'wave_direction', 'wave_peak_period',
  'swell_wave_height', 'swell_wave_period', 'swell_wave_direction', 'swell_wave_peak_period',
  'secondary_swell_wave_height', 'secondary_swell_wave_period', 'secondary_swell_wave_direction',
  'wind_wave_height', 'wind_wave_period', 'wind_wave_direction',
  'sea_surface_temperature',
];
const VARS_VIENTO = ['wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m', 'weather_code'];

// ---------------------------------------------------------------- playas
function cargarPlayas() {
  const codigo = fs.readFileSync(path.join(__dirname, '..', 'beach-data.js'), 'utf8');
  const ctx = { console: { log() {} } };
  vm.createContext(ctx);
  vm.runInContext(codigo + '\n;this.__SPOTS = SPOTS;', ctx);
  const playas = [];
  for (const [pais, regiones] of Object.entries(ctx.__SPOTS)) {
    for (const [region, zonas] of Object.entries(regiones)) {
      for (const [zona, lista] of Object.entries(zonas)) {
        for (const p of lista) {
          // Oleaje: en el punto offshore del atlas (spec v1.1, punto 1). Viento: en la playa.
          const off = ATLAS?.playas?.[p.nombre]?.offshore;
          playas.push({
            nombre: p.nombre, zona, region, pais,
            lat: off ? off[0] : p.lat,
            lon: off ? off[1] : p.lon,
            origenCoords: off ? 'offshore' : 'playa',
            latPlaya: p.lat, lonPlaya: p.lon,
          });
        }
      }
    }
  }
  return playas;
}

// ---------------------------------------------------------------- descarga
function urlMarina(lote) {
  return 'https://marine-api.open-meteo.com/v1/marine'
    + `?latitude=${lote.map(p => p.lat).join(',')}`
    + `&longitude=${lote.map(p => p.lon).join(',')}`
    + `&hourly=${VARS_OLEAJE.join(',')}`
    + `&models=${MODELO_OLEAJE}&forecast_hours=${HORAS}&timeformat=unixtime&cell_selection=sea`;
}
function urlViento(lote) {
  return 'https://api.open-meteo.com/v1/forecast'
    + `?latitude=${lote.map(p => p.latPlaya).join(',')}`
    + `&longitude=${lote.map(p => p.lonPlaya).join(',')}`
    + `&hourly=${VARS_VIENTO.join(',')}`
    + `&models=${MODELO_VIENTO}&forecast_hours=${HORAS}&wind_speed_unit=kmh&timeformat=unixtime`;
}

async function pedir(url, intentos = 3) {
  for (let i = 1; i <= intentos; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'salitre-registro (github.com/addrimacas/surf-app)' } });
      const j = await r.json();
      if (!r.ok || j.error) throw new Error(j.reason || `HTTP ${r.status}`);
      return Array.isArray(j) ? j : [j]; // una coordenada devuelve objeto; varias, array
    } catch (e) {
      if (i === intentos) throw e;
      await new Promise(res => setTimeout(res, 5000 * i));
    }
  }
}

// Fecha local de Madrid (no toISOString: daría el día UTC)
function fechaMadrid(d = new Date()) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' });
  return f.format(d); // AAAA-MM-DD
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const playas = cargarPlayas();
  const lotes = [];
  for (let i = 0; i < playas.length; i += LOTE) lotes.push(playas.slice(i, i + LOTE));

  if (dryRun) {
    console.log(`${playas.length} playas en ${lotes.length} lotes -> ${lotes.length * 2} peticiones`);
    console.log(urlMarina(lotes[0]).slice(0, 300) + '...');
    return;
  }

  const emitido = new Date();
  const registro = {
    version_formato: VERSION_FORMATO,
    emitido_utc: emitido.toISOString(),
    fecha_local: fechaMadrid(emitido),
    modelo_oleaje: MODELO_OLEAJE,
    modelo_viento: MODELO_VIENTO,
    horas: HORAS,
    playas: [],
  };

  for (const lote of lotes) {
    const [mar, vie] = await Promise.all([pedir(urlMarina(lote)), pedir(urlViento(lote))]);
    lote.forEach((p, k) => {
      const m = mar[k], v = vie[k];
      registro.playas.push({
        nombre: p.nombre, zona: p.zona,
        origen_coords: p.origenCoords,
        pedido_oleaje: { lat: p.lat, lon: p.lon },
        pedido_viento: { lat: p.latPlaya, lon: p.lonPlaya },
        celda_oleaje: { lat: m.latitude, lon: m.longitude }, // celda real que devolvió la API
        celda_viento: { lat: v.latitude, lon: v.longitude },
        tiempo: m.hourly.time,
        oleaje: Object.fromEntries(VARS_OLEAJE.map(n => [n, m.hourly[n] ?? null])),
        viento: Object.fromEntries(VARS_VIENTO.map(n => [n, v.hourly[n] ?? null])),
      });
    });
    await new Promise(res => setTimeout(res, 1500)); // ser amables con la API gratuita
  }

  const [a, mes] = registro.fecha_local.split('-');
  const dir = path.join(__dirname, '..', 'registro', a, mes);
  fs.mkdirSync(dir, { recursive: true });
  const destino = path.join(dir, `${registro.fecha_local}.json.gz`);
  fs.writeFileSync(destino, zlib.gzipSync(JSON.stringify(registro), { level: 9 }));
  console.log(`Guardado ${destino} (${registro.playas.length} playas)`);
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
