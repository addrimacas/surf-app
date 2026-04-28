/**
 * PLACEHOLDER — Futura estrategia: máscara tierra/agua desde coastline OSM u otro SHP
 * de alta resolución solo para Galicia, sustituyendo o fusionando Natural Earth.
 *
 * Idea: export Geofabrik / Overpass → polígonos land multipolygon → misma API que
 * lib/natural-earth.js exportando esTierra(lon, lat).
 *
 * No borrar NE hasta tener benchmarks compare-matrix.js equivalentes.
 */

module.exports.NOT_IMPLEMENTED = true;
module.exports.note =
  'Cuando implementes esto, añade un perfil en profiles-registry.js que cargue loadOsmGalicia()';
