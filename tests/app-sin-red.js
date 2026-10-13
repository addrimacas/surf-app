// tests/app-sin-red.js — abre index.html en jsdom con las APIs simuladas (sin red) y comprueba que pinta datos.
// Uso: npm i --no-save jsdom@24 && node tests/app-sin-red.js . [v1|v0|rechazo]
// Arnés sin red: carga index.html en jsdom con fetch simulado y comprueba que la app pinta datos.
const { JSDOM } = require('jsdom');
const fs = require('fs'), path = require('path');
const RAIZ = process.argv[2] || require("path").join(__dirname, "..");
const MODO = process.argv[3] || 'v1';            // v1 | v0 | rechazo (la API rechaza la petición v1)
let html = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
html = html.replace(/<script src="https:\/\/unpkg[^>]*><\/script>/, '');
html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, f) => `<script>${fs.readFileSync(path.join(RAIZ, f), 'utf8')}</script>`);
const url = 'https://addrimacas.github.io/surf-app/' + (MODO === 'v0' ? '?motor=v0' : '?motor=v1');
const peticiones = [];
function serie(n, f) { return Array.from({ length: n }, (_, i) => f(i)); }
function marina(u) {
  const q = new URL(u).searchParams;
  const t0 = Math.floor(Date.now() / 3600000) * 3600 - 24 * 3600;
  const n = 24 * 11;
  const val = (k, i) => ({
    wave_height: 1.8 + 0.5 * Math.sin(i / 10), wave_period: 11, wave_direction: 300,
    swell_wave_height: 1.6, swell_wave_period: 12, swell_wave_peak_period: 13, swell_wave_direction: 305,
    secondary_swell_wave_height: 0.5, secondary_swell_wave_period: 9, secondary_swell_wave_direction: 250,
    wind_wave_height: 0.4, wind_wave_period: 4, wind_wave_peak_period: 4.5, wind_wave_direction: 20,
    sea_surface_temperature: 16.5,
  })[k];
  const j = { latitude: +q.get('latitude'), longitude: +q.get('longitude') };
  if (q.get('current')) j.current = Object.fromEntries(q.get('current').split(',').map(k => [k, val(k, 24)]));
  if (q.get('hourly')) { j.hourly = { time: serie(n, i => t0 + i * 3600) }; for (const k of q.get('hourly').split(',')) j.hourly[k] = serie(n, i => val(k, i)); }
  return j;
}
function atmos(u) {
  const q = new URL(u).searchParams;
  const t0 = Math.floor(Date.now() / 3600000) * 3600 - 24 * 3600; const n = 24 * 11;
  const v = k => ({ temperature_2m: 17, wind_speed_10m: 12, wind_direction_10m: 120, wind_gusts_10m: 18, weather_code: 1, is_day: 1 })[k];
  const j = {};
  if (q.get('current')) j.current = Object.fromEntries(q.get('current').split(',').map(k => [k, v(k)]));
  if (q.get('hourly')) { j.hourly = { time: serie(n, i => t0 + i * 3600) }; for (const k of q.get('hourly').split(',')) j.hourly[k] = serie(n, () => v(k)); }
  j.daily = { temperature_2m_max: [19], temperature_2m_min: [12], sunrise: [Date.now() / 1000 - 3600 * 5], sunset: [Date.now() / 1000 + 3600 * 5] };
  return j;
}
const resp = (obj, ok = true, status = 200) => Promise.resolve({ ok, status, json: () => Promise.resolve(obj), text: () => Promise.resolve(JSON.stringify(obj)) });
const dom = new JSDOM(html, {
  url, runScripts: 'dangerously', pretendToBeVisual: true,
  beforeParse(w) {
    w.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: (t, k) => (k in t ? t[k] : (() => ({ addColorStop() {} }))), set: (t, k, v) => (t[k] = v, true) });
    w.fetch = (u) => {
      u = String(u); peticiones.push(u);
      if (u.includes('marine-api')) {
        if (MODO === 'rechazo' && u.includes('models=')) return resp({ error: true, reason: 'simulado' }, false, 400);
        return resp(marina(u));
      }
      if (u.includes('api.open-meteo.com')) return resp(atmos(u));
      return resp({}, false, 404); // mareas y resto
    };
    w.L = new Proxy(function () {}, { get: () => () => new Proxy({}, { get: () => () => ({}) }) });
    w.console.error = (...a) => console.log('[console.error]', ...a.map(String));
    w.console.warn = (...a) => console.log('[console.warn]', ...a.map(String));
  },
});
const w = dom.window;
setTimeout(async () => {
  const doc = w.document;
  const score = doc.querySelector('#contenido-inicio span[style*="font-size:22px"]')?.textContent;
  console.log('MOTOR_ACTIVO =', w.eval('MOTOR_ACTIVO'));
  console.log('Nota inicio:', score, '| texto:', doc.querySelector('#contenido-inicio div[style*="font-size:20px"]')?.textContent);
  console.log('Resumen:', doc.getElementById('resumen-texto')?.textContent);
  console.log('Explicación:', doc.getElementById('desglose-factores')?.textContent.replace(/\s+/g, ' ').trim());
  console.log('Ola en playa visible:', doc.body.innerHTML.includes('Ola en la playa (estimada)'));
  const prev = doc.querySelectorAll('.prev-card').length;
  console.log('Tarjetas previsión hoy:', prev, '| filas 10 días:', doc.querySelectorAll('.prev-fila').length);
  // Pestaña Playas
  await w.eval('plPlayaActiva = playaActiva; plCargarTabla()');
  const tabla = doc.getElementById('pl-tabla')?.innerHTML || '';
  console.log('Tabla Playas: puntuaciones', (tabla.match(/pl-score/g) || []).length, '| fila "En playa":', tabla.includes('En playa'), '| kW/m:', tabla.includes('kW/m'));
  // perfiles
  for (const perf of ['banista', 'principiante', 'intermedio', 'pro']) {
    w.eval(`perfilActivo='${perf}'`); await w.eval('cargarInicio()');
    console.log(`  perfil ${perf}: nota`, doc.querySelector('#contenido-inicio span[style*="font-size:22px"]')?.textContent);
  }
  const marinas = peticiones.filter(u => u.includes('marine-api'));
  console.log('Peticiones oleaje:', marinas.length, '| con modelo fijado:', marinas.filter(u => u.includes('models=meteofrance_wave')).length);
  console.log('Ejemplo:', marinas[0]?.slice(0, 160));
  process.exit(0);
}, 2500);
