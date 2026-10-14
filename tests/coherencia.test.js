// tests/coherencia.test.js — tests de cordura del motor v1.1 (especificación, punto 20)
// Ejecutar: node --test tests/
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const M = require('../motor-v1.js');
const ATLAS = require('../atlas-playas.js');

function cargarPlayas() {
  const ctx = { console: { log() {} } };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'beach-data.js'), 'utf8') + ';this.P = todasLasPlayas();', ctx);
  return Object.fromEntries(ctx.P.map(p => [p.nombre, p]));
}
const PLAYAS = cargarPlayas();
const ev = (nombre, d, nivel = 'pro') => M.evaluar(d, PLAYAS[nombre], nivel, ATLAS.playas[nombre]);

// Escenario base: un swell, sin mar de viento, viento flojo
const mar = (h, T, dir, extra = {}) => ({
  hTotal: h, tTotal: T, dirTotal: dir, swellH: h, swellTp: T, swellDir: dir,
  vientoVel: 5, vientoDir: 90, codigoTiempo: 1, esDeDia: true, diasVista: 0, ...extra,
});

test('las 60 playas tienen atlas con tabla de transferencia y punto offshore', () => {
  for (const n of Object.keys(PLAYAS)) {
    const a = ATLAS.playas[n];
    assert.ok(a, `falta atlas de ${n}`);
    assert.ok(a.k2 && a.k2.length > 100, `falta tabla K² de ${n}`);
    assert.ok(Array.isArray(a.offshore), `falta punto offshore de ${n}`);
  }
});

test('física: potencia y altura de rompiente', () => {
  assert.ok(Math.abs(M.potencia(2, 10) - 0.49 * 4 * 9) < 1e-9);
  const hb = M.alturaRompiente([{ T: 12, hLocal: 1.5 }]);
  assert.ok(Math.abs(hb - 2.31) < 0.02, `Hb=${hb}`);
});

test('con swell moderado del NO una playa abierta puntúa más que una de fondo de ría', () => {
  const d = mar(1.2, 11, 310);
  for (const nivel of ['intermedio', 'pro']) {
    assert.ok(ev('Pantín', d, nivel).nota > ev('Samil', d, nivel).nota, nivel);
    assert.ok(ev('Razo', d, nivel).nota > ev('Santa Cristina', d, nivel).nota, nivel);
  }
});

test('plan B: con un temporal enorme del NO, una playa de ría supera a una abierta (avanzado)', () => {
  const d = mar(5.5, 16, 300);
  assert.ok(ev('Samil', d, 'pro').nota > ev('Pantín', d, 'pro').nota);
});

test('playa de ría con poco mar: nota baja', () => {
  assert.ok(ev('Samil', mar(0.6, 8, 300), 'intermedio').nota <= 3);
});

test('tormenta eléctrica: nota 1 en todos los niveles', () => {
  for (const nivel of ['banista', 'principiante', 'intermedio', 'pro'])
    assert.strictEqual(ev('Pantín', mar(1.2, 11, 310, { codigoTiempo: 96 }), nivel).nota, 1, nivel);
});

test('onshore fuerte hunde la nota aunque el mar sea bueno', () => {
  const bueno = ev('Pantín', mar(1.8, 13, 310), 'pro').nota;
  const dirOn = (M.direccionOffshore(PLAYAS['Pantín'], ATLAS.playas['Pantín']) + 180) % 360;   // viento de mar
  const onshore = ev('Pantín', mar(1.8, 13, 310, { vientoVel: 40, vientoDir: dirOn }), 'pro').nota;
  assert.ok(onshore <= 3 && bueno >= 7, `bueno ${bueno}, onshore ${onshore}`);
});

test('principiante: topes por tamaño y por período largo', () => {
  assert.ok(ev('Pantín', mar(2.5, 12, 310), 'principiante').nota <= 2);
  assert.ok(ev('Pantín', mar(0.6, 17, 310), 'principiante').nota <= 3);
});

test('principiante: pasado el tamaño ideal, más ola no sube la nota', () => {
  let anterior = 10;
  for (const h of [1.0, 1.4, 1.8, 2.2]) {
    const n = ev('Razo', mar(h, 10, 330), 'principiante').nota;
    assert.ok(n <= anterior, `h=${h} nota=${n} anterior=${anterior}`);
    anterior = n;
  }
});

test('glassy mejor o igual que cross-on', () => {
  const g = ev('Razo', mar(1.4, 12, 330), 'intermedio').nota;
  const c = ev('Razo', mar(1.4, 12, 330, { vientoVel: 25, vientoDir: 240 }), 'intermedio').nota;
  assert.ok(g >= c);
});

test('cruce de swells: penalización máxima ×0,7 con energías iguales a 90°', () => {
  const f = M.factorCruce([
    { tipo: 'swell', hLocal: 1, T: 12, dir: 300 },
    { tipo: 'swell2', hLocal: 1, T: 12, dir: 210 },
  ]);
  assert.ok(Math.abs(f - 0.7) < 1e-9, `f=${f}`);
});

test('baño: viento de tierra fuerte y mar grande limitan la nota', () => {
  const p = PLAYAS['Riazor'];
  const off = M.direccionOffshore(p, ATLAS.playas['Riazor']);
  assert.ok(ev('Riazor', mar(0.3, 8, 330, { vientoVel: 35, vientoDir: off }), 'banista').nota <= 2);
  assert.ok(ev('Riazor', mar(2.0, 12, 330), 'banista').nota <= 2);
  assert.ok(ev('Riazor', mar(0.2, 7, 330), 'banista').nota >= 7);
});

test('la nota siempre es un entero de 1 a 10 y la confianza una categoría', () => {
  for (const n of Object.keys(PLAYAS)) for (const nivel of ['banista', 'principiante', 'intermedio', 'pro']) {
    const r = ev(n, mar(1.5, 12, 290, { diasVista: 3 }), nivel);
    assert.ok(Number.isInteger(r.nota) && r.nota >= 1 && r.nota <= 10, `${n} ${nivel} ${r.nota}`);
    assert.ok(['alta', 'media', 'baja'].includes(r.confianza));
  }
});

// Barrido completo: 60 playas × 8 direcciones × 6 alturas × 3 períodos × 4 vientos × 4 niveles.
// No comprueba casos sueltos: comprueba reglas que deben cumplirse en todas las combinaciones.
test('barrido: frase y veredicto coherentes con el tamaño en todas las playas', () => {
  const DIRS = [0, 45, 90, 135, 180, 225, 270, 315];
  const ALTS = [0.3, 0.8, 1.3, 2.0, 3.0, 5.0];
  const PERS = [7, 11, 15];
  let n = 0;
  for (const nombre of Object.keys(PLAYAS)) {
    const off = M.direccionOffshore(PLAYAS[nombre], ATLAS.playas[nombre]);
    const VIENTOS = [{ vientoVel: 3, vientoDir: 0 }, { vientoVel: 15, vientoDir: off },
      { vientoVel: 15, vientoDir: (off + 90) % 360 }, { vientoVel: 25, vientoDir: (off + 180) % 360 }];
    for (const dir of DIRS) for (const h of ALTS) for (const T of PERS) for (const vi of VIENTOS) {
      for (const nivel of ['banista', 'principiante', 'intermedio', 'pro']) {
        const r = ev(nombre, mar(h, T, dir, vi), nivel);
        const f = M.frase(r);
        assert.ok(f && !/rodilla|cintura|pecho|cabeza/.test(f), `${nombre} ${nivel}: frase «${f}»`);
        assert.ok(r.limitante?.texto, `${nombre} ${nivel}: sin veredicto`);
        if (nivel === 'banista') continue;
        const R = M.NIVELES[nivel];
        const t = r.limitante.texto;
        if (t.startsWith('Buen tamaño')) assert.ok(r.hb >= R.idealMin && r.hb <= R.idealMax, `${nombre} ${nivel} hb ${r.hb}: «${t}»`);
        if (t.includes('pequeño')) assert.ok(r.hb < R.idealMin, `${nombre} ${nivel} hb ${r.hb}: «${t}»`);
        if (t.includes('grande para')) assert.ok(r.hb > R.idealMax, `${nombre} ${nivel} hb ${r.hb}: «${t}»`);
        n++;
      }
    }
  }
  assert.ok(n > 100000, `combinaciones ${n}`);
});

test('barrido: con el mismo viento, más mar fuera nunca da menos ola en la playa', () => {
  for (const nombre of Object.keys(PLAYAS)) for (const dir of [0, 90, 180, 270, 315]) for (const T of [8, 12, 16]) {
    let prev = -1;
    for (const h of [0.5, 1, 1.5, 2, 3, 4, 6]) {
      const hb = ev(nombre, mar(h, T, dir), 'intermedio').hb;
      assert.ok(hb >= prev - 1e-9, `${nombre} dir ${dir} T ${T}: ${h} m fuera da ${hb} < ${prev}`);
      prev = hb;
    }
  }
});

// La energía en kJ usa la fórmula de Surf-Forecast: comprobada contra su tabla real de Patos.
test('energía: cuadra con las 23 filas de Surf-Forecast dentro del redondeo de su tabla', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const K = eval(html.match(/const K_ENERGIA_KJ = ([^;]+);/)[1]);
  const filas = fs.readFileSync(path.join(__dirname, 'datos', 'surf-forecast-patos-2026-10-14.csv'), 'utf8')
    .trim().split('\n').slice(1).map(l => l.split(',').map(Number));
  for (const [H, T, E] of filas) {
    const min = K * (H - 0.05) ** 2 * (T - 0.5) ** 2, max = K * (H + 0.05) ** 2 * (T + 0.5) ** 2;
    assert.ok(E >= min && E <= max, `H ${H} T ${T}: Surf-Forecast ${E} kJ fuera de [${min.toFixed(0)}, ${max.toFixed(0)}]`);
  }
});

test('energía: cuadra con todos los trenes de oleaje de la página guardada de Surf-Forecast', () => {
  const zlib = require('zlib');
  const { leerTabla } = require('../scripts/leer-surf-forecast.js');
  const html = zlib.gunzipSync(fs.readFileSync(path.join(__dirname, '..', 'registro', 'surf-forecast', '2026', '10', '2026-10-14-Patos.html.gz'))).toString();
  const filas = leerTabla(html);
  assert.ok(filas.length >= 20, `filas ${filas.length}`);
  const htmlApp = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const K = eval(htmlApp.match(/const K_ENERGIA_KJ = ([^;]+);/)[1]);
  let n = 0;
  for (const f of filas) for (const t of f.trenes) {
    if (!(t.altura > 0) || t.energia == null) continue;   // Surf-Forecast trae algún tren con altura negativa: se ignora
    const min = K * (t.altura - 0.05) ** 2 * (t.periodo - 0.5) ** 2, max = K * (t.altura + 0.05) ** 2 * (t.periodo + 0.5) ** 2;
    assert.ok(t.energia >= min && t.energia <= max, `${f.fecha_texto}: ${JSON.stringify(t)}`);
    n++;
  }
  assert.ok(n >= 40, `trenes comprobados ${n}`);
});

test('viento: el de tierra sale de la costa del atlas en las 60 playas y es opuesto a mirar al mar', () => {
  for (const n of Object.keys(PLAYAS)) {
    const a = ATLAS.playas[n];
    const off = M.direccionOffshore(PLAYAS[n], a);
    assert.ok(Number.isFinite(off), n);
    if (a?.normal != null) {
      assert.strictEqual(M.clasificarViento(off, PLAYAS[n], a).etiqueta, 'OFFSHORE', n);
      assert.strictEqual(M.clasificarViento(a.normal, PLAYAS[n], a).etiqueta, 'ONSHORE', n);
    }
  }
});

test('noche: nota 1 en todos los niveles y playas', () => {
  for (const n of Object.keys(PLAYAS)) for (const nivel of ['banista', 'principiante', 'intermedio', 'pro']) {
    const r = ev(n, mar(1.5, 12, 300, { esDeDia: false }), nivel);
    assert.strictEqual(r.nota, 1, `${n} ${nivel}`);
  }
});

test('período: el factor nunca baja al alargar el período, y un mar de 6 s nunca es un 10', () => {
  let prev = 0;
  for (let T = 3; T <= 18; T += 0.5) {
    const f = M.factorPeriodo([{ hLocal: 1, T }]);
    assert.ok(f >= prev, `T ${T}`); prev = f;
  }
  for (const n of Object.keys(PLAYAS)) for (const h of [0.8, 1.2, 1.6, 2.2]) {
    const off = M.direccionOffshore(PLAYAS[n], ATLAS.playas[n]);
    const r = ev(n, mar(h, 6, 300, { swellT: 6, swellTp: 6, vientoVel: 3, vientoDir: off }), 'intermedio');
    assert.ok(r.nota <= 9, `${n} ${h} m 6 s: ${r.nota}`);
  }
});

test('titular: con nota baja manda lo que la hunde, nunca «Sin apenas viento» como titular', () => {
  for (const n of Object.keys(PLAYAS)) for (const h of [0.3, 1.5, 4]) for (const dir of [0, 180, 300]) {
    const r = ev(n, mar(h, 10, dir, { vientoVel: 3 }), 'intermedio');
    const t = M.titular(r);
    if (r.nota <= 6 && r.limitante?.clave) assert.strictEqual(t.titulo, r.limitante.texto, `${n} ${h} m ${dir}°`);
    if (r.nota <= 6) assert.notStrictEqual(t.titulo, 'Sin apenas viento', `${n} ${h} m ${dir}°: nota ${r.nota}`);
  }
});
