#!/usr/bin/env node
// scripts/calibrar-escala.js — calibra la escala de la nota con la climatología (ronda 6, consenso D/A/C).
// Calcula la calidad Q del motor en las horas de luz del último año en las 60 playas (archivo de
// Open-Meteo, mismo modelo de oleaje que la app) y fija, por nivel, los umbrales de Q para cada nota
// de forma que, en el conjunto de la costa:
//   10 → 1 % de las horas · ≥9 → 4 % · ≥8 → 10 % · ≥7 → 18 % · ≥6 → 28 % · ≥5 → 40 % · ≥4 → 50 % · ≥3 → 62 % · ≥2 → 78 %
// Salida: calibracion-nota.js (lo cargan la app y los tests). Uso: node scripts/calibrar-escala.js [días=365]
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const M = require('../motor-v1.js');
const ATLAS = require('../atlas-playas.js');

const RAIZ = path.join(__dirname, '..');
const DIAS = +(process.argv[2] || 365);
const OBJETIVO = { 10: 0.01, 9: 0.04, 8: 0.10, 7: 0.18, 6: 0.28, 5: 0.40, 4: 0.50, 3: 0.62, 2: 0.78 };
const NIVELES = ['principiante', 'intermedio', 'pro'];
const VARS = 'wave_height,wave_period,wave_direction,swell_wave_height,swell_wave_period,swell_wave_direction,'
  + 'secondary_swell_wave_height,secondary_swell_wave_period,secondary_swell_wave_direction,wind_wave_height,wind_wave_period,wind_wave_direction';

function playas() {
  const c = { console: { log() {} } };
  vm.createContext(c);
  vm.runInContext(fs.readFileSync(path.join(RAIZ, 'beach-data.js'), 'utf8') + ';this.P = todasLasPlayas();', c);
  return c.P;
}
async function pedir(url) {
  for (let i = 1; i <= 4; i++) {
    try { const r = await fetch(url); const j = await r.json(); if (!r.ok || j.error) throw new Error(j.reason || r.status); return j; }
    catch (e) { if (i === 4) throw e; await new Promise(res => setTimeout(res, 4000 * i)); }
  }
}
const fecha = d => d.toISOString().slice(0, 10);

async function main() {
  const fin = new Date(Date.now() - 2 * 86400e3), ini = new Date(fin.getTime() - DIAS * 86400e3);
  const Q = Object.fromEntries(NIVELES.map(n => [n, []]));
  for (const p of playas()) {
    const a = ATLAS.playas[p.nombre];
    if (!a?.offshore) continue;
    let mar, vie;
    try {
      mar = await pedir(`https://marine-api.open-meteo.com/v1/marine?latitude=${a.offshore[0]}&longitude=${a.offshore[1]}&hourly=${VARS}`
        + `&models=meteofrance_wave&start_date=${fecha(ini)}&end_date=${fecha(fin)}&timeformat=unixtime`);
      vie = await pedir(`https://historical-forecast-api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}`
        + `&hourly=wind_speed_10m,wind_direction_10m,is_day&start_date=${fecha(ini)}&end_date=${fecha(fin)}&wind_speed_unit=kmh&timeformat=unixtime`);
    } catch (e) { console.warn('Sin datos', p.nombre, e.message); continue; }
    const vi = new Map(vie.hourly.time.map((t, i) => [t, i]));
    const h = mar.hourly;
    let n = 0;
    for (let i = 0; i < h.time.length; i += 3) {          // el modelo de oleaje es trihorario
      const j = vi.get(h.time[i]);
      if (j == null || vie.hourly.is_day[j] !== 1 || h.wave_height[i] == null) continue;
      const d = {
        hTotal: h.wave_height[i], tTotal: h.wave_period[i], dirTotal: h.wave_direction[i],
        swellH: h.swell_wave_height[i], swellT: h.swell_wave_period[i], swellDir: h.swell_wave_direction[i],
        swell2H: h.secondary_swell_wave_height[i], swell2T: h.secondary_swell_wave_period[i], swell2Dir: h.secondary_swell_wave_direction[i],
        vientoMarH: h.wind_wave_height[i], vientoMarT: h.wind_wave_period[i], vientoMarDir: h.wind_wave_direction[i],
        vientoVel: vie.hourly.wind_speed_10m[j], vientoDir: vie.hourly.wind_direction_10m[j], esDeDia: true, diasVista: 0,
      };
      for (const nv of NIVELES) Q[nv].push(M.calidadQ(d, p, nv, a));
      n++;
    }
    console.log(p.nombre, n, 'horas');
    await new Promise(r => setTimeout(r, 800));
  }
  const niveles = {}, resumen = {};
  for (const nv of NIVELES) {
    const v = Q[nv].sort((x, y) => x - y);
    const cuantil = q => v[Math.min(v.length - 1, Math.max(0, Math.floor(q * v.length)))];
    const u = [2, 3, 4, 5, 6, 7, 8, 9, 10].map(k => +cuantil(1 - OBJETIVO[k]).toFixed(4));
    for (let k = 1; k < u.length; k++) if (u[k] <= u[k - 1]) u[k] = +(u[k - 1] + 0.0005).toFixed(4);   // estrictamente creciente
    niveles[nv] = u;
    resumen[nv] = { horas: v.length, mediana: +cuantil(0.5).toFixed(3), p90: +cuantil(0.9).toFixed(3), p99: +cuantil(0.99).toFixed(3) };
  }
  const C = { version: M.VERSION, generado: new Date().toISOString(), desde: fecha(ini), hasta: fecha(fin), objetivo: OBJETIVO, resumen, niveles };
  const js = `// Generado por scripts/calibrar-escala.js — NO editar a mano.\n// Umbrales de calidad Q para las notas 2…10 por nivel (climatología ${C.desde} → ${C.hasta}).\n`
    + `(function (g) {\n  const C = ${JSON.stringify(C, null, 2).replace(/\n/g, '\n  ')};\n  g.CALIBRACION_NOTA = C;\n  if (typeof module !== 'undefined' && module.exports) module.exports = C;\n})(typeof window !== 'undefined' ? window : globalThis);\n`;
  fs.writeFileSync(path.join(RAIZ, 'calibracion-nota.js'), js);
  console.log(JSON.stringify(resumen), JSON.stringify(niveles));
}
main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
