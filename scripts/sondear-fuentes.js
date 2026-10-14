#!/usr/bin/env node
// Comprueba qué fuentes de oleaje costero y batimetría son accesibles desde GitHub Actions.
// Escribe registro/sondeo-fuentes.json con lo que responde cada una (sin datos personales).
'use strict';
const fs = require('fs');
const path = require('path');
const pruebas = {
  ihc_catalogo_galicia: 'https://ihthredds.ihcantabria.com/thredds/catalog/meteogaliciaswan/Galicia/catalog.xml',
  ihc_catalogo_artabro: 'https://ihthredds.ihcantabria.com/thredds/catalog/meteogaliciaswan/Artabro/catalog.xml',
  ihc_catalogo_raiz: 'https://ihthredds.ihcantabria.com/thredds/catalog/meteogaliciaswan/catalog.xml',
  mg_thredds_raiz: 'https://mandeo.meteogalicia.es/thredds/catalog.xml',
  mg_thredds_swan: 'https://mandeo.meteogalicia.es/thredds/catalog/modelos/SWAN/catalog.xml',
  mg_thredds_swan2: 'https://mandeo.meteogalicia.es/thredds/catalog/swan/catalog.xml',
  emodnet_profundidad: 'https://rest.emodnet-bathymetry.eu/depth_sample?geom=POINT(-8.98%2042.74)',
  emodnet_perfil: 'https://rest.emodnet-bathymetry.eu/depth_profile?geom=LINESTRING(-8.98%2042.74,-9.15%2042.71)',
};
async function probar(url) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'salitre-sondeo' } });
    const t = await r.text();
    return { estado: r.status, tipo: r.headers.get('content-type'), bytes: t.length, inicio: t.slice(0, 1500) };
  } catch (e) { return { error: e.message }; }
}
(async () => {
  const res = {};
  for (const [k, u] of Object.entries(pruebas)) { res[k] = { url: u, ...(await probar(u)) }; console.log(k, res[k].estado ?? res[k].error); }
  // Si el catálogo de IH Cantabria responde, intentar una consulta puntual (NCSS) en el último fichero
  const cat = res.ihc_catalogo_galicia?.inicio || '';
  const m = [...(res.ihc_catalogo_galicia?.inicio || '').matchAll(/urlPath="([^"]+\.nc)"/g)].map(x => x[1]);
  if (m.length) {
    const ult = m.sort().pop();
    for (const v of ['hs', 'Hs', 'hsig', 'HS']) {
      const u = `https://ihthredds.ihcantabria.com/thredds/ncss/grid/${ult}?var=${v}&latitude=42.74&longitude=-8.99&accept=csv`;
      res['ncss_' + v] = { url: u, ...(await probar(u)) };
      if (res['ncss_' + v].estado === 200) break;
    }
    const dds = `https://ihthredds.ihcantabria.com/thredds/dodsC/${ult}.dds`;
    res.dods_dds = { url: dds, ...(await probar(dds)) };
  }
  fs.mkdirSync(path.join(__dirname, '..', 'registro'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, '..', 'registro', 'sondeo-fuentes.json'), JSON.stringify(res, null, 1));
})();
