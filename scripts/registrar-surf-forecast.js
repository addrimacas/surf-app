#!/usr/bin/env node
// scripts/registrar-surf-forecast.js — guarda una vez al día la tabla de previsión de Surf-Forecast
// de unas pocas playas de referencia, para comparar con nuestro modelo (uso interno de calibración,
// no se muestra en la app). Guarda el HTML tal cual (comprimido) y, si se puede, la tabla ya leída.
//   registro/surf-forecast/AAAA/MM/AAAA-MM-DD-<playa>.html.gz
//   registro/surf-forecast/AAAA/MM/AAAA-MM-DD-<playa>.json   (filas: hora, altura, periodo, dirección, energía)
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { leerTabla } = require('./leer-surf-forecast.js');

// Playa de Salitre → página de Surf-Forecast (añadir aquí más playas de referencia)
const PLAYAS = {
  Patos: 'https://www.surf-forecast.com/breaks/Playade-Patos/forecasts/latest',
};

async function main() {
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date());
  const [a, m] = hoy.split('-');
  const dir = path.join(__dirname, '..', 'registro', 'surf-forecast', a, m);
  fs.mkdirSync(dir, { recursive: true });
  let fallos = 0;
  for (const [nombre, url] of Object.entries(PLAYAS)) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (salitre-registro; uso interno)' } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const html = await r.text();
      fs.writeFileSync(path.join(dir, `${hoy}-${nombre}.html.gz`), zlib.gzipSync(html));
      try {
        const filas = leerTabla(html);
        fs.writeFileSync(path.join(dir, `${hoy}-${nombre}.json`), JSON.stringify({ url, descargado_utc: new Date().toISOString(), filas }, null, 1));
        console.log(`${nombre}: ${filas.length} filas`);
      } catch (e) { console.warn(`${nombre}: HTML guardado, tabla no leída (${e.message})`); }
    } catch (e) { fallos++; console.warn(`${nombre}: ${e.message}`); }
    await new Promise(r => setTimeout(r, 3000));
  }
  if (fallos === Object.keys(PLAYAS).length) process.exitCode = 1;
}
main();
