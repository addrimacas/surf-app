#!/usr/bin/env node
// scripts/panel-ciego-evaluar.js — compara las hojas del panel ciego con las notas del modelo
// y dice si se cumple la barrera de lanzamiento de la especificación v1.1 (punto 20).
//
// Uso:  node scripts/panel-ciego-evaluar.js panel/hoja-ana.csv panel/hoja-luis.csv ...
// (necesita panel/notas-modelo.json generado por panel-ciego-preparar.js)
'use strict';
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------- estadística
function rangos(v) {
  const orden = v.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]);
  const r = new Array(v.length);
  for (let i = 0; i < orden.length;) {
    let j = i;
    while (j + 1 < orden.length && orden[j + 1][0] === orden[i][0]) j++;
    const medio = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) r[orden[k][1]] = medio;
    i = j + 1;
  }
  return r;
}
function pearson(x, y) {
  const n = x.length, mx = x.reduce((a, b) => a + b, 0) / n, my = y.reduce((a, b) => a + b, 0) / n;
  let s = 0, sx = 0, sy = 0;
  for (let i = 0; i < n; i++) { s += (x[i] - mx) * (y[i] - my); sx += (x[i] - mx) ** 2; sy += (y[i] - my) ** 2; }
  return sx && sy ? s / Math.sqrt(sx * sy) : NaN;
}
const spearman = (x, y) => pearson(rangos(x), rangos(y));

// ---------------------------------------------------------------- lectura
function leerHoja(f) {
  const lineas = fs.readFileSync(f, 'utf8').trim().split(/\r?\n/);
  const sep = lineas[0].includes(';') ? ';' : ',';
  const cab = lineas[0].split(sep).map(s => s.trim());
  return lineas.slice(1).map(l => {
    const c = l.split(sep);
    const o = Object.fromEntries(cab.map((k, i) => [k, (c[i] ?? '').trim()]));
    return {
      id: +o.id, zona: o.zona,
      nota: o.nota_intermedio_1a10 === '' ? null : +o.nota_intermedio_1a10.replace(',', '.'),
      peligroso: /^s/i.test(o.peligroso_principiante_si_no),
    };
  });
}

function evaluar(hojas, modelo) {
  const porId = new Map(modelo.pares.map(p => [p.id, p]));
  const res = { avisos: [] };

  // Acuerdo entre locales (techo de lo alcanzable)
  const acuerdos = [];
  for (let a = 0; a < hojas.length; a++) for (let b = a + 1; b < hojas.length; b++) {
    const A = new Map(hojas[a].filas.map(f => [f.id, f.nota]));
    const pares = hojas[b].filas.filter(f => f.nota != null && A.get(f.id) != null);
    if (pares.length >= 10) acuerdos.push(spearman(pares.map(f => A.get(f.id)), pares.map(f => f.nota)));
  }
  res.acuerdoInterno = acuerdos.length ? acuerdos.reduce((s, x) => s + x, 0) / acuerdos.length : null;

  // Media del panel por par
  const suma = new Map(), cuenta = new Map(), peligro = new Map();
  for (const h of hojas) for (const f of h.filas) {
    if (f.nota != null) { suma.set(f.id, (suma.get(f.id) || 0) + f.nota); cuenta.set(f.id, (cuenta.get(f.id) || 0) + 1); }
    if (f.peligroso) peligro.set(f.id, (peligro.get(f.id) || 0) + 1);
  }
  const pares = [...suma.keys()].filter(id => porId.has(id)).map(id => ({
    id, zona: porId.get(id).zona, panel: suma.get(id) / cuenta.get(id), modelo: porId.get(id).notas.intermedio,
    principiante: porId.get(id).notas.principiante, peligro: (peligro.get(id) || 0) / hojas.length,
  }));
  res.n = pares.length;
  res.spearmanGlobal = spearman(pares.map(p => p.panel), pares.map(p => p.modelo));
  res.errorMedio = pares.reduce((s, p) => s + Math.abs(p.panel - p.modelo), 0) / pares.length;
  res.porZona = {};
  for (const z of [...new Set(pares.map(p => p.zona))]) {
    const pz = pares.filter(p => p.zona === z);
    res.porZona[z] = { n: pz.length, spearman: spearman(pz.map(p => p.panel), pz.map(p => p.modelo)) };
    if (pz.length < 40) res.avisos.push(`Zona ${z}: solo ${pz.length} pares (la barrera pide ≥ 40)`);
  }
  // Casos peligrosos: nota ≥ 7 para principiante donde la mayoría del panel dice que era peligroso
  res.peligrososMalPuntuados = pares.filter(p => p.peligro >= 0.5 && p.principiante >= 7).map(p => p.id);

  // Barrera de lanzamiento (spec v1.1)
  const umbralGlobal = res.acuerdoInterno != null ? Math.min(0.6, 0.8 * res.acuerdoInterno) : 0.6;
  const zonasOk = Object.values(res.porZona).every(z => z.spearman >= 0.5 || (res.acuerdoInterno != null && z.spearman >= 0.8 * res.acuerdoInterno));
  res.barrera = {
    raters: hojas.length >= 5,
    spearmanGlobal: res.spearmanGlobal >= umbralGlobal,
    porZona: zonasOk,
    errorMedio: res.errorMedio <= 1.5,
    sinPeligrosos: res.peligrososMalPuntuados.length === 0,
  };
  if (hojas.length < 5) res.avisos.push(`Solo ${hojas.length} hojas (la barrera pide ≥ 5 surfistas)`);
  res.supera = Object.values(res.barrera).every(Boolean);
  return res;
}

function main() {
  const ficheros = process.argv.slice(2);
  if (!ficheros.length) { console.error('Uso: node scripts/panel-ciego-evaluar.js hoja1.csv hoja2.csv ...'); process.exit(1); }
  const modelo = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'panel', 'notas-modelo.json'), 'utf8'));
  const hojas = ficheros.map(f => ({ f, filas: leerHoja(f) }));
  const r = evaluar(hojas, modelo);
  const f2 = x => x == null || Number.isNaN(x) ? '—' : x.toFixed(2);
  console.log(`Pares evaluados: ${r.n} · hojas: ${hojas.length}`);
  console.log(`Acuerdo entre locales (Spearman medio): ${f2(r.acuerdoInterno)}`);
  console.log(`Modelo vs panel — Spearman global: ${f2(r.spearmanGlobal)} · error medio: ${f2(r.errorMedio)} puntos`);
  for (const [z, v] of Object.entries(r.porZona)) console.log(`  ${z}: Spearman ${f2(v.spearman)} (${v.n} pares)`);
  console.log(`Casos peligrosos con nota ≥ 7 para principiante: ${r.peligrososMalPuntuados.length ? r.peligrososMalPuntuados.join(', ') : 'ninguno'}`);
  for (const a of r.avisos) console.log('Aviso:', a);
  console.log('Barrera:', Object.entries(r.barrera).map(([k, v]) => `${k} ${v ? 'OK' : 'NO'}`).join(' · '));
  console.log(r.supera ? 'Resultado: se cumple la barrera para lanzar la beta.' : 'Resultado: todavía no se cumple la barrera.');
}

if (require.main === module) main();
module.exports = { spearman, evaluar, leerHoja };
