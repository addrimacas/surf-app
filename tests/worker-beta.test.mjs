// Prueba del Worker de la beta con una D1 simulada sobre SQLite en memoria (node:sqlite) y red simulada.
import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import worker from '../worker-beta/worker.js';

function d1() {
  const db = new DatabaseSync(':memory:');
  db.exec(fs.readFileSync(new URL('../worker-beta/esquema.sql', import.meta.url), 'utf8'));
  const conv = s => s.replace(/\?(\d+)/g, '?');
  return {
    prepare(sql) {
      let args = [];
      const nums = [...sql.matchAll(/\?(\d+)/g)].map(m => +m[1]);
      const st = {
        bind(...a) { args = nums.length ? nums.map(n => a[n - 1]) : a; return st; },
        run() { const r = db.prepare(conv(sql)).run(...args); return { meta: { changes: Number(r.changes) } }; },
        all() { return { results: db.prepare(conv(sql)).all(...args) }; },
        first() { return db.prepare(conv(sql)).get(...args) ?? null; },
      };
      return st;
    },
  };
}
// Clave de avisos de prueba (la real va como secreto en Cloudflare)
const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
const env = { DB: d1(), EXPORT_TOKEN: 'secreto', VAPID_PRIVATE_JWK: JSON.stringify(privateKey.export({ format: 'jwk' })) };
const O = 'https://addrimacas.github.io';
const post = (ruta, cuerpo, origen = O) => worker.fetch(new Request('https://x' + ruta, { method: 'POST', headers: { ...(origen ? { Origin: origen } : {}), 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) }), env);

// Red simulada: Open-Meteo devuelve un mar igual al de la sesión; el servicio de push guarda lo que recibe
const empujes = [];
const fetchReal = globalThis.fetch;
globalThis.fetch = async (u, op) => {
  u = String(u);
  if (u.startsWith('https://push.ejemplo/')) { empujes.push({ u, op }); return new Response(null, { status: 201 }); }
  const manana = new Date(Date.now() + 86400e3).toISOString().slice(0, 10);
  const time = Array.from({ length: 24 }, (_, h) => `${manana}T${String(h).padStart(2, '0')}:00`);
  if (u.includes('marine-api')) return Response.json({ hourly: { time, wave_height: time.map(() => 1.6), wave_period: time.map(() => 11), wave_direction: time.map(() => 300) } });
  if (u.includes('api.open-meteo.com')) return Response.json({ hourly: { time, wind_speed_10m: time.map(() => 6), wind_direction_10m: time.map(() => 120) } });
  return fetchReal(u, op);
};

test('worker beta: valoraciones, comentarios, exportación', async () => {
  let r = await post('/v1/valoracion', { dispositivo: 'abc', playa: 'Razo', fecha: '2026-10-14', nota: 7, coincidio: 'si', prediccion: { nota: 8 } });
  assert.strictEqual(r.status, 200);
  r = await post('/v1/valoracion', { dispositivo: 'abc', playa: 'Razo', fecha: '2026-10-14', nota: 9 });
  assert.strictEqual(r.status, 200);
  assert.strictEqual((await post('/v1/valoracion', { dispositivo: 'abc', playa: 'Razo', fecha: '2026-10-14', nota: 11 })).status, 400);
  assert.strictEqual((await post('/v1/valoracion', { dispositivo: 'abc', playa: 'Razo', fecha: '2026-10-14', nota: 5 }, 'https://malo.com')).status, 403);
  assert.strictEqual((await post('/v1/comentario', { dispositivo: 'abc', texto: 'La luna mola', playa: 'Razo' })).status, 200);
  assert.strictEqual((await post('/v1/comentario', { dispositivo: 'abc', texto: '   ' })).status, 400);
  assert.strictEqual((await worker.fetch(new Request('https://x/v1/exportar'), env)).status, 401);
  const exp = await (await worker.fetch(new Request('https://x/v1/exportar?tabla=valoraciones', { headers: { Authorization: 'Bearer secreto' } }), env)).json();
  assert.strictEqual(exp.filas.length, 1);
  assert.strictEqual(exp.filas[0].nota, 9);
});

test('worker beta: avisos de prueba y «se repite tu sesión» con firma VAPID válida', async () => {
  const endpoint = 'https://push.ejemplo/abc123';
  assert.strictEqual((await post('/v1/suscripcion', { dispositivo: 'dev1', endpoint })).status, 200);
  // Sesión buena con el mar que luego se repite en la previsión simulada
  await post('/v1/valoracion', { dispositivo: 'dev1', playa: 'Pantín', fecha: '2026-10-10', nota: 8, prediccion: {
    datos: { hTotal: 1.5, tTotal: 11.5, dirTotal: 295, vientoVel: 5, vientoDir: 110 },
    coords: { mar: { lat: 43.6, lon: -8.2 }, viento: { lat: 43.63, lon: -8.11 } } } });
  // Y una sesión mala que no debe avisar
  await post('/v1/valoracion', { dispositivo: 'dev1', playa: 'Razo', fecha: '2026-10-11', nota: 3, prediccion: {
    datos: { hTotal: 1.5, tTotal: 11, dirTotal: 300 }, coords: { mar: { lat: 43.3, lon: -8.7 }, viento: { lat: 43.3, lon: -8.7 } } } });

  const r = await (await post('/v1/probar-aviso', { dispositivo: 'dev1' })).json();
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.avisos_repeticion, 1);
  assert.strictEqual(empujes.length, 2);   // prueba + repetición

  // La cabecera VAPID lleva un JWT firmado con la clave privada: se verifica con la pública
  const auth = empujes[0].op.headers.Authorization;
  const jwt = auth.match(/t=([^,]+)/)[1];
  const [cab, datos, firma] = jwt.split('.');
  const ok = crypto.verify('sha256', Buffer.from(cab + '.' + datos), { key: publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(firma, 'base64url'));
  assert.ok(ok, 'firma VAPID no válida');
  assert.strictEqual(JSON.parse(Buffer.from(datos, 'base64url')).aud, 'https://push.ejemplo');

  // El móvil recoge el texto del aviso (sin Origin, como hace el service worker)
  const a = await (await post('/v1/aviso', { endpoint }, null)).json();
  assert.match(a.titulo, /Pantín/);
  assert.match(a.cuerpo, /le diste un 8/);

  // No repite el mismo aviso (misma playa y día)
  const r2 = await (await post('/v1/probar-aviso', { dispositivo: 'dev1' })).json();
  assert.strictEqual(r2.avisos_repeticion, 0);
  // Baja
  await post('/v1/baja', { dispositivo: 'dev1' });
  assert.strictEqual((await post('/v1/probar-aviso', { dispositivo: 'dev1' })).status, 400);
});
