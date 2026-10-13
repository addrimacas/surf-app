// tests/panel.test.js — comprueba la evaluación del panel ciego con datos sintéticos
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { spearman, evaluar } = require('../scripts/panel-ciego-evaluar.js');

test('Spearman: orden idéntico = 1, inverso = −1, con empates', () => {
  assert.strictEqual(spearman([1, 2, 3, 4], [10, 20, 30, 40]), 1);
  assert.strictEqual(spearman([1, 2, 3, 4], [4, 3, 2, 1]), -1);
  assert.ok(Math.abs(spearman([1, 2, 2, 3], [1, 2, 3, 4]) - 0.9487) < 1e-3);
});

function sintetico(ruido, n = 120) {
  let semilla = 7;
  const azar = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647;
  const zonas = ['Abierta', 'Intermedia', 'Ría'];
  const pares = Array.from({ length: n }, (_, k) => ({
    id: k + 1, zona: zonas[k % 3],
    notas: { intermedio: 1 + Math.floor(azar() * 10), principiante: 1 + Math.floor(azar() * 5) },
  }));
  const hojas = Array.from({ length: 5 }, () => ({
    filas: pares.map(p => ({ id: p.id, zona: p.zona, nota: Math.max(1, Math.min(10, Math.round(p.notas.intermedio + (azar() - 0.5) * 2 * ruido))), peligroso: false })),
  }));
  return { modelo: { pares }, hojas };
}

test('panel que coincide con el modelo: supera la barrera', () => {
  const { modelo, hojas } = sintetico(1);
  const r = evaluar(hojas, modelo);
  assert.ok(r.spearmanGlobal > 0.9 && r.supera, JSON.stringify(r.barrera));
});

test('panel sin relación con el modelo: no supera la barrera', () => {
  const { modelo, hojas } = sintetico(1);
  for (const h of hojas) for (const f of h.filas) f.nota = 1 + ((f.id * 7) % 10);
  const r = evaluar(hojas, modelo);
  assert.ok(!r.supera);
});

test('un caso peligroso con nota alta para principiante bloquea el lanzamiento', () => {
  const { modelo, hojas } = sintetico(1);
  modelo.pares[0].notas.principiante = 8;
  for (const h of hojas) h.filas[0].peligroso = true;
  const r = evaluar(hojas, modelo);
  assert.deepStrictEqual(r.peligrososMalPuntuados, [1]);
  assert.ok(!r.supera);
});
