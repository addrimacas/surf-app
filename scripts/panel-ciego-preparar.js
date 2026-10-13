#!/usr/bin/env node
// scripts/panel-ciego-preparar.js — prepara el panel ciego de surfistas locales (spec v1.1, punto 20)
//
// Descarga el estado del mar de días pasados (archivo de Open-Meteo, mismo modelo fijado que la app)
// para un grupo de playas de tres tipos, elige días variados y genera:
//   panel/hoja-panel.csv        → la hoja que rellenan los surfistas (SIN las notas del modelo)
//   panel/notas-modelo.json     → las notas del motor v1.1 para esos mismos pares (no enseñar)
//
// Uso:  node scripts/panel-ciego-preparar.js [--desde 2025-09-01] [--hasta 2026-09-30] [--dias 12]
// Necesita red (Open-Meteo). Sin dependencias.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const M = require('../motor-v1.js');
const ATLAS = require('../atlas-playas.js');

const RAIZ = path.join(__dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, arr) => (x.startsWith('--') ? [...a, [x.slice(2), arr[i + 1]]] : a), []));
const DESDE = args.desde || '2025-09-01';
const HASTA = args.hasta || '2026-09-30';
const N_DIAS = +(args.dias || 12);
const HORA = 11; // franja de referencia: media mañana (hora local)
const MODELO = 'meteofrance_wave';

// Playas del panel: tres tipos de costa (editar si hace falta)
const GRUPOS = {
  'Abierta': ['Pantín', 'Doniños', 'Razo', 'Valdoviño', 'Baroña'],
  'Intermedia': ['Orzán', 'Riazor', 'Carnota', 'Melide'],
  'Ría': ['Samil', 'Patos', 'Lanzada', 'Santa Cristina', 'Bastiagueiro'],
};

function cargarPlayas() {
  const ctx = { console: { log() {} } };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(RAIZ, 'beach-data.js'), 'utf8') + ';this.P = todasLasPlayas();', ctx);
  return Object.fromEntries(ctx.P.map(p => [p.nombre, p]));
}

async function pedir(url) {
  for (let i = 1; i <= 3; i++) {
    try {
      const r = await fetch(url);
      const j = await r.json();
      if (!r.ok || j.error) throw new Error(j.reason || `HTTP ${r.status}`);
      return j;
    } catch (e) {
      if (i === 3) throw e;
      await new Promise(res => setTimeout(res, 3000 * i));
    }
  }
}

const VARS = ['wave_height', 'wave_period', 'wave_direction', 'swell_wave_height', 'swell_wave_period', 'swell_wave_peak_period',
  'swell_wave_direction', 'secondary_swell_wave_height', 'secondary_swell_wave_period', 'secondary_swell_wave_direction',
  'wind_wave_height', 'wind_wave_period', 'wind_wave_peak_period', 'wind_wave_direction'];

async function main() {
  const PLAYAS = cargarPlayas();
  const nombres = Object.values(GRUPOS).flat();
  const datos = {};
  for (const n of nombres) {
    const p = PLAYAS[n], a = ATLAS.playas[n];
    if (!p || !a?.offshore) { console.warn('Sin datos de', n); continue; }
    const mar = await pedir(`https://marine-api.open-meteo.com/v1/marine?latitude=${a.offshore[0]}&longitude=${a.offshore[1]}`
      + `&hourly=${VARS.join(',')}&models=${MODELO}&start_date=${DESDE}&end_date=${HASTA}&timezone=Europe%2FMadrid&timeformat=unixtime`);
    const vie = await pedir(`https://historical-forecast-api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}`
      + `&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m,weather_code&start_date=${DESDE}&end_date=${HASTA}`
      + `&wind_speed_unit=kmh&timezone=Europe%2FMadrid&timeformat=unixtime`);
    datos[n] = { mar, vie };
    console.log('Descargado', n);
    await new Promise(r => setTimeout(r, 1200));
  }

  // Índices de las 11:00 locales de cada día
  const ref = datos[nombres.find(n => datos[n])];
  // (hora y fecha en Madrid con Intl: el desfase cambia entre verano e invierno)
  const fh = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', hour: '2-digit', hourCycle: 'h23' });
  const ff = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' });
  const horas = ref.mar.hourly.time.map((t, i) => ({ t, i, hora: +fh.format(new Date(t * 1000)), fecha: ff.format(new Date(t * 1000)) }))
    .filter(x => x.hora === HORA);

  // Elegir días variados: estratificar por altura del swell offshore en Pantín (o la primera playa)
  const clave = datos['Pantín'] ? 'Pantín' : nombres[0];
  const conAltura = horas.map(x => ({ ...x, h: datos[clave].mar.hourly.wave_height[x.i] })).filter(x => x.h != null);
  conAltura.sort((a, b) => a.h - b.h);
  const elegidos = [];
  for (let k = 0; k < N_DIAS; k++) elegidos.push(conAltura[Math.floor((k + 0.5) * conAltura.length / N_DIAS)]);
  elegidos.sort((a, b) => a.t - b.t);

  const filas = [['id', 'zona', 'playa', 'fecha', 'franja', 'nota_intermedio_1a10', 'peligroso_principiante_si_no', 'comentario']];
  const modelo = [];
  let id = 1;
  for (const x of elegidos) {
    const fecha = x.fecha;
    for (const [zona, lista] of Object.entries(GRUPOS)) for (const n of lista) {
      if (!datos[n]) continue;
      const mh = datos[n].mar.hourly, vh = datos[n].vie.hourly;
      const g = k => mh[k]?.[x.i];
      const vi = vh.time.indexOf(x.t);
      const d = {
        hTotal: g('wave_height'), tTotal: g('wave_period'), dirTotal: g('wave_direction'),
        swellH: g('swell_wave_height'), swellT: g('swell_wave_period'), swellTp: g('swell_wave_peak_period'), swellDir: g('swell_wave_direction'),
        swell2H: g('secondary_swell_wave_height'), swell2T: g('secondary_swell_wave_period'), swell2Dir: g('secondary_swell_wave_direction'),
        vientoMarH: g('wind_wave_height'), vientoMarT: g('wind_wave_period'), vientoMarTp: g('wind_wave_peak_period'), vientoMarDir: g('wind_wave_direction'),
        vientoVel: vi >= 0 ? vh.wind_speed_10m[vi] : null, vientoDir: vi >= 0 ? vh.wind_direction_10m[vi] : null,
        vientoRacha: vi >= 0 ? vh.wind_gusts_10m[vi] : null, codigoTiempo: vi >= 0 ? vh.weather_code[vi] : null,
        esDeDia: true, diasVista: 0,
      };
      const notas = Object.fromEntries(['banista', 'principiante', 'intermedio', 'pro'].map(nv => [nv, M.evaluar(d, PLAYAS[n], nv, ATLAS.playas[n]).nota]));
      const ev = M.evaluar(d, PLAYAS[n], 'intermedio', ATLAS.playas[n]);
      modelo.push({ id, zona, playa: n, fecha, notas, hb: +ev.hb.toFixed(2), confianza: ev.confianza, motor: M.VERSION, modelo: MODELO, datos: d });
      filas.push([id, zona, n, fecha, `${HORA}:00`, '', '', '']);
      id++;
    }
  }
  const dir = path.join(RAIZ, 'panel');
  fs.mkdirSync(dir, { recursive: true });
  // Barajar el orden de las filas de la hoja para que no se lea como una serie
  const cuerpo = filas.slice(1).sort(() => Math.random() - 0.5);
  fs.writeFileSync(path.join(dir, 'hoja-panel.csv'), [filas[0], ...cuerpo].map(f => f.join(';')).join('\n') + '\n');
  fs.writeFileSync(path.join(dir, 'notas-modelo.json'), JSON.stringify({ generado: new Date().toISOString(), desde: DESDE, hasta: HASTA, pares: modelo }, null, 1));
  console.log(`Listo: ${modelo.length} pares (${elegidos.length} días × ${nombres.length} playas) → panel/hoja-panel.csv`);
  console.log('Reparte la hoja a cada surfista (una copia por persona, p. ej. hoja-ana.csv) sin enseñar notas-modelo.json.');
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
