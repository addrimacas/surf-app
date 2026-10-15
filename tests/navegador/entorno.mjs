// Prueba de la app en Chromium con respuestas simuladas de Open-Meteo, mareas y beta.
// Uso: node tests/navegador/simular.mjs [pestaña]   → imprime errores de consola y guarda capturas.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const tipos = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/json' };
const srv = http.createServer((q, r) => {
  const f = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/surf-app/, '') || 'index.html');
  const ff = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
  if (!fs.existsSync(ff)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': tipos[path.extname(ff)] || 'application/octet-stream' }); fs.createReadStream(ff).pipe(r);
}).listen(0);
const base = `http://127.0.0.1:${srv.address().port}/`;
const t0 = Math.floor(new Date(new Date().setHours(0, 0, 0, 0)).getTime() / 1000);
const serie = (n, f) => Array.from({ length: n }, (_, i) => f(i));
function marine(u) {
  const lats = u.searchParams.get('latitude').split(','), dias = +(u.searchParams.get('forecast_days') || 2) + +(u.searchParams.get('past_days') || 0);
  const vars = (u.searchParams.get('hourly') || u.searchParams.get('current') || '').split(',');
  const val = (v, i, k) => v.includes('direction') ? 290 + 10 * Math.sin(i / 7 + k) : v.includes('period') ? 11 + Math.sin(i / 9) : v === 'sea_surface_temperature' ? 16 : v.startsWith('secondary') ? 0.3 : v.startsWith('wind_wave') ? 0.4 : 1.6 + 0.4 * Math.sin(i / 11 + k);
  const una = k => {
    const o = { latitude: +lats[k] };
    if (u.searchParams.get('hourly')) { const n = dias * 24; o.hourly = { time: serie(n, i => t0 + i * 3600) }; vars.forEach(v => o.hourly[v] = serie(n, i => val(v, i, k))); }
    if (u.searchParams.get('current')) { o.current = { time: Math.floor(Date.now() / 1000) }; u.searchParams.get('current').split(',').forEach(v => o.current[v] = val(v, 15, k)); }
    return o;
  };
  return lats.length > 1 ? lats.map((_, k) => una(k)) : una(0);
}
function forecast(u) {
  const lats = u.searchParams.get('latitude').split(','), dias = +(u.searchParams.get('forecast_days') || 7);
  const val = (v, i, k) => v.includes('direction') ? (60 + 40 * k + 5 * i) % 360 : v.includes('gusts') ? 18 : v.includes('speed') ? 6 + 6 * Math.abs(Math.sin(i / 5 + k)) : v === 'weather_code' ? 2 : v === 'is_day' ? ((i % 24) >= 8 && (i % 24) < 20 ? 1 : 0) : 17;
  const una = k => {
    const o = { latitude: +lats[k] };
    const h = u.searchParams.get('hourly'); if (h) { const n = dias * 24; o.hourly = { time: serie(n, i => t0 + i * 3600) }; h.split(',').forEach(v => o.hourly[v] = serie(n, i => val(v, i, k))); }
    const c = u.searchParams.get('current'); if (c) { o.current = { time: Math.floor(Date.now() / 1000) }; c.split(',').forEach(v => o.current[v] = val(v, new Date().getHours(), k)); }
    const d = u.searchParams.get('daily'); if (d) { o.daily = { time: serie(dias, i => t0 + i * 86400) }; d.split(',').forEach(v => o.daily[v] = v === 'sunrise' ? serie(dias, i => t0 + i * 86400 + 8 * 3600) : v === 'sunset' ? serie(dias, i => t0 + i * 86400 + 19.5 * 3600) : serie(dias, () => 18)); }
    return o;
  };
  return lats.length > 1 ? lats.map((_, k) => una(k)) : una(0);
}
const mareas = () => ({ mareas: { datos: { marea: [{ hora: '03:10', altura: '0.9', tipo: 'bajamar' }, { hora: '09:25', altura: '3.4', tipo: 'pleamar' }, { hora: '15:40', altura: '1.0', tipo: 'bajamar' }, { hora: '21:55', altura: '3.3', tipo: 'pleamar' }] } } });

export async function abrir({ ancho = 390, alto = 844 } = {}) {
const nav = await chromium.launch(); const pag = await nav.newPage({ viewport: { width: ancho, height: alto }, deviceScaleFactor: 2 });
const errores = [];
pag.on('pageerror', e => errores.push('pageerror: ' + e.message));
pag.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errores.push(m.type() + ': ' + m.text()); });
await pag.route('**/*', async ruta => {
  const u = new URL(ruta.request().url());
  const json = o => ruta.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(o) });
  if (u.host === '127.0.0.1:' + srv.address().port) return ruta.continue();
  const fallo = process.env.FALLO || '';
  if (u.host === 'marine-api.open-meteo.com' && fallo === 'oleaje') return ruta.fulfill({ status: 429, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"error":true,"reason":"Too many requests"}' });
  if (u.host.startsWith('salitre-mareas') && fallo === 'mareas') return ruta.fulfill({ status: 500, body: 'x' });
  if (u.host.startsWith('salitre-mareas') && fallo === 'mareas-cuelga') return;   // nunca responde
  if (u.host === 'marine-api.open-meteo.com') return json(marine(u));
  if (u.host === 'api.open-meteo.com') return json(forecast(u));
  if (u.host.startsWith('salitre-mareas')) return json(mareas());
  if (u.host.startsWith('salitre-beta')) return json({ ok: true });
  if (u.host === 'unpkg.com' && u.pathname.startsWith('/leaflet@')) {
    // el entorno de pruebas no llega a la CDN: Leaflet desde node_modules (LEAFLET_DIR)
    const f = path.join(process.env.LEAFLET_DIR || '', path.basename(u.pathname));
    if (fs.existsSync(f)) return ruta.fulfill({ status: 200, contentType: f.endsWith('.css') ? 'text/css' : 'text/javascript', body: fs.readFileSync(f) });
  }
  if (/unpkg|cdnjs|jsdelivr|googleapis|gstatic/.test(u.host)) return ruta.fulfill({ status: 200, contentType: 'text/css', body: '' });
  return ruta.fulfill({ status: 204, body: '' });
});
await pag.goto(base + 'index.html');
await pag.waitForTimeout(3500);
const ir = p => pag.evaluate(p => irA(p, [...document.querySelectorAll('.nav-item')].find(b => b.getAttribute('onclick').includes(`'${p}'`))), p);
return { pag, errores, ir, cerrar: async () => { await nav.close(); srv.close(); } };
}
