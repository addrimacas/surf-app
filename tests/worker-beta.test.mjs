// Prueba del Worker de la beta con una D1 simulada sobre SQLite en memoria (node:sqlite).
import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker from '../worker-beta/worker.js';

function d1() {
  const db = new DatabaseSync(':memory:');
  db.exec(fs.readFileSync(new URL('../worker-beta/esquema.sql', import.meta.url), 'utf8'));
  const conv = s => s.replace(/\?(\d+)/g, '?');   // D1 admite ?1, ?2…; aquí se pasan en orden
  return {
    prepare(sql) {
      let args = [];
      const nums = [...sql.matchAll(/\?(\d+)/g)].map(m => +m[1]);
      const st = { bind(...a) { args = nums.length ? nums.map(n => a[n - 1]) : a; return st; },
        run() { db.prepare(conv(sql)).run(...args); return {}; },
        all() { return { results: db.prepare(conv(sql)).all(...args) }; } };
      return st;
    },
  };
}
const env = { DB: d1(), EXPORT_TOKEN: 'secreto' };
const O = 'https://addrimacas.github.io';
const post = (ruta, cuerpo, origen = O) => worker.fetch(new Request('https://x' + ruta, { method: 'POST', headers: { Origin: origen, 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) }), env);

test('worker beta: guarda, sustituye la del mismo día, valida y exporta con token', async () => {
  let r = await post('/v1/valoracion', { dispositivo: 'abc', playa: 'Razo', fecha: '2026-10-14', nota: 7, coincidio: 'si', prediccion: { nota: 8 } });
  assert.strictEqual(r.status, 200);
  r = await post('/v1/valoracion', { dispositivo: 'abc', playa: 'Razo', fecha: '2026-10-14', nota: 9 });
  assert.strictEqual(r.status, 200);
  assert.strictEqual((await post('/v1/valoracion', { dispositivo: 'abc', playa: 'Razo', fecha: '2026-10-14', nota: 11 })).status, 400);
  assert.strictEqual((await post('/v1/valoracion', { dispositivo: 'abc', playa: 'Razo', fecha: '2026-10-14', nota: 5 }, 'https://malo.com')).status, 403);
  assert.strictEqual((await post('/v1/comentario', { dispositivo: 'abc', texto: 'La luna mola', playa: 'Razo' })).status, 200);
  assert.strictEqual((await post('/v1/comentario', { dispositivo: 'abc', texto: '   ' })).status, 400);
  const sin = await worker.fetch(new Request('https://x/v1/exportar'), env);
  assert.strictEqual(sin.status, 401);
  const exp = await (await worker.fetch(new Request('https://x/v1/exportar?tabla=valoraciones', { headers: { Authorization: 'Bearer secreto' } }), env)).json();
  assert.strictEqual(exp.filas.length, 1);
  assert.strictEqual(exp.filas[0].nota, 9);
  const com = await (await worker.fetch(new Request('https://x/v1/exportar?tabla=comentarios', { headers: { Authorization: 'Bearer secreto' } }), env)).json();
  assert.strictEqual(com.filas[0].texto, 'La luna mola');
});
