/**
 * Carga Natural Earth land polygons recortadas a bbox (Galicia por defecto).
 * Copia conceptual de calcular-orientacion-v3.js / calcular-orientacion-curva.js.
 */

const fs = require('fs');
const turf = require('@turf/turf');

const DEFAULT_BBOX = [-10.5, 41.5, -7.5, 44.5];

function loadNaturalEarthGalicia(neGeojsonPath, bbox = DEFAULT_BBOX) {
  const landRaw = JSON.parse(fs.readFileSync(neGeojsonPath, 'utf8'));
  const land = turf.featureCollection(
    landRaw.features.filter(f => {
      const bb = turf.bbox(f);
      return bb[0] < bbox[2] && bb[2] > bbox[0] && bb[1] < bbox[3] && bb[3] > bbox[1];
    })
  );
  const landBB = land.features.map(f => ({ f, bb: turf.bbox(f) }));

  function esTierra(lon, lat) {
    const pt = turf.point([lon, lat]);
    for (const { f, bb } of landBB) {
      if (lon < bb[0] || lon > bb[2] || lat < bb[1] || lat > bb[3]) continue;
      if (turf.booleanPointInPolygon(pt, f)) return true;
    }
    return false;
  }

  return {
    turf,
    esTierra,
    featureCount: land.features.length,
  };
}

module.exports = { loadNaturalEarthGalicia, DEFAULT_BBOX };
