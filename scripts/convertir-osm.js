const shp = require('shapefile');
const fs = require('fs');
const features = [];
const minLon = -10.5, maxLon = -7.5, minLat = 41.5, maxLat = 44.5;

function inBbox(f) {
  if (!f.geometry) return false;
  const coords = f.geometry.coordinates[0];
  if (!coords) return false;
  return coords.some(function(c) {
    return c[0] > minLon && c[0] < maxLon && c[1] > minLat && c[1] < maxLat;
  });
}

console.log('Leyendo shapefile OSM (1-2 min)...');
shp.open('scripts/osm_land/land-polygons-complete-4326/land_polygons.shp')
  .then(function(source) {
    function next(r) {
      if (r.done) {
        fs.writeFileSync('scripts/ne_10m_land.geojson', JSON.stringify({type:'FeatureCollection', features}));
        console.log('OK - ' + features.length + ' poligonos guardados en scripts/ne_10m_land.geojson');
        return;
      }
      if (inBbox(r.value)) features.push(r.value);
      return source.read().then(next);
    }
    return source.read().then(next);
  }).catch(console.error);
