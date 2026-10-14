#!/usr/bin/env node
// scripts/comparar-swan.js — compara cada día la altura de ola que calcula Salitre junto a cada playa
// con la del SWAN costero de MeteoGalicia (servido por el THREDDS de IH Cantabria), que sí tiene en
// cuenta el fondo (refracción, asomeramiento, abrigo). Objetivo: medir, playa a playa y de forma
// automática, si nuestra transferencia K se pasa o se queda corta, y corregirla con semanas de datos.
// Salida: registro/swan/AAAA/MM/AAAA-MM-DD.json
// Licencia de los datos de MeteoGalicia/IH Cantabria: PENDIENTE DE COMPROBAR antes de usarlos en producto.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const M = require('../motor-v1.js');
const ATLAS = require('../atlas-playas.js');
const RAIZ = path.join(__dirname, '..');
const THREDDS = 'https://ihthredds.ihcantabria.com/thredds';

function playas() {
  const c = { console: { log() {} } };
  vm.createContext(c);
  vm.runInContext(fs.readFileSync(path.join(RAIZ, 'beach-data.js'), 'utf8') + ';this.P = todasLasPlayas();', c);
  return c.P;
}
async function texto(url) {
  for (let i = 1; i <= 3; i++) {
    try { const r = await fetch(url); const t = await r.text(); if (!r.ok) throw new Error('HTTP ' + r.status); return t; }
    catch (e) { if (i === 3) throw e; await new Promise(res => setTimeout(res, 3000 * i)); }
  }
}
// Desplazar un punto d km en la dirección rumbo (grados)
function mover(lat, lon, rumbo, km) {
  const r = rumbo * Math.PI / 180;
  return [lat + (km / 111.2) * Math.cos(r), lon + (km / (111.2 * Math.cos(lat * Math.PI / 180))) * Math.sin(r)];
}
async function ultimoFichero(malla) {
  const cat = await texto(`${THREDDS}/catalog/meteogaliciaswan/${malla}/catalog.xml`);
  const fich = [...cat.matchAll(/urlPath="([^"]+\.nc)"/g)].map(m => m[1]).sort();
  return fich.pop();
}
async function serieSwan(fichero, lat, lon, t0, t1) {
  const u = `${THREDDS}/ncss/grid/${fichero}?var=hs&latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}`
    + `&time_start=${t0}&time_end=${t1}&accept=csv`;
  const csv = await texto(u);
  const filas = csv.trim().split('\n').slice(1).map(l => l.split(','));
  return filas.map(f => ({ t: Math.floor(Date.parse(f[0]) / 1000), hs: parseFloat(f[3]) })).filter(x => Number.isFinite(x.hs));
}
const VARS = 'wave_height,wave_period,wave_direction,swell_wave_height,swell_wave_period,swell_wave_direction,'
  + 'secondary_swell_wave_height,secondary_swell_wave_period,secondary_swell_wave_direction,wind_wave_height,wind_wave_period,wind_wave_direction';

async function main() {
  const hoy = new Date().toISOString().slice(0, 10);
  const t0 = `${hoy}T06:00:00Z`, t1 = `${hoy}T21:00:00Z`;
  const fichero = await ultimoFichero('Galicia');
  console.log('SWAN Galicia:', fichero);
  const salida = { fecha: hoy, fuente: `${THREDDS} · ${fichero}`, motor: M.VERSION, playas: [] };
  for (const p of playas()) {
    const a = ATLAS.playas[p.nombre];
    if (!a?.offshore) continue;
    // Punto SWAN: el primero con agua al alejarse de la playa por su normal (0,3 a 4 km)
    let punto = null, serie = [];
    for (const km of [0.3, 0.6, 1, 1.5, 2, 3, 4]) {
      const [la, lo] = mover(p.lat, p.lon, a.normal ?? p.orient ?? 270, km);
      try { serie = await serieSwan(fichero, la, lo, t0, t1); } catch (e) { serie = []; }
      if (serie.length) { punto = { lat: +la.toFixed(4), lon: +lo.toFixed(4), km }; break; }
    }
    if (!punto) { salida.playas.push({ nombre: p.nombre, error: 'sin celda de agua en SWAN' }); continue; }
    // Nuestro cálculo para las mismas horas
    let mar;
    try {
      mar = JSON.parse(await texto(`https://marine-api.open-meteo.com/v1/marine?latitude=${a.offshore[0]}&longitude=${a.offshore[1]}`
        + `&hourly=${VARS}&models=meteofrance_wave&start_date=${hoy}&end_date=${hoy}&timeformat=unixtime`));
    } catch (e) { salida.playas.push({ nombre: p.nombre, punto, error: 'sin Open-Meteo' }); continue; }
    const h = mar.hourly, pares = [];
    for (const s of serie) {
      const i = h.time.indexOf(s.t);
      if (i < 0 || h.wave_height[i] == null) continue;
      const d = {
        hTotal: h.wave_height[i], tTotal: h.wave_period[i], dirTotal: h.wave_direction[i],
        swellH: h.swell_wave_height[i], swellT: h.swell_wave_period[i], swellDir: h.swell_wave_direction[i],
        swell2H: h.secondary_swell_wave_height[i], swell2T: h.secondary_swell_wave_period[i], swell2Dir: h.secondary_swell_wave_direction[i],
        vientoMarH: h.wind_wave_height[i], vientoMarT: h.wind_wave_period[i], vientoMarDir: h.wind_wave_direction[i],
        esDeDia: true, diasVista: 0,
      };
      const r = M.evaluar(d, p, 'intermedio', a);
      pares.push({ t: s.t, offshore: h.wave_height[i], salitre: +r.hLocal.toFixed(3), swan: +s.hs.toFixed(3) });
    }
    const ratios = pares.filter(x => x.salitre > 0.05).map(x => x.swan / x.salitre).sort((x, y) => x - y);
    const mediana = ratios.length ? +ratios[Math.floor(ratios.length / 2)].toFixed(3) : null;
    salida.playas.push({ nombre: p.nombre, punto, pares, ratioSwanSalitre: mediana });
    console.log(p.nombre, punto.km + ' km', 'ratio SWAN/Salitre', mediana);
    await new Promise(r => setTimeout(r, 400));
  }
  const [a, m] = hoy.split('-');
  const dir = path.join(RAIZ, 'registro', 'swan', a, m);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${hoy}.json`), JSON.stringify(salida, null, 1));
}
main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
