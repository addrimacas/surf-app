/**
 * Intenta situar el origen de los rayos un poco aguas afuera en la dirección
 * de máxima apertura rápida (muestreo grueso), para reducir ruido cuando el pin
 * cae tierra adentro en Natural Earth.
 */

const { distanciaLibreKm } = require('./exposure-curve');

/**
 * @returns {{ lat: number, lon: number, coarseBestBearing: number }}
 */
function resolveOffshoreOrigin(lat, lon, esTierra, turf, rayOpts, opts = {}) {
  const coarseStep = opts.coarseAngleDeg ?? 45;
  const coarseProbe = {
    stepKm: opts.probeStepKm ?? 2,
    maxKm: opts.probeMaxKm ?? 22,
  };

  let bestB = 0;
  let bestFree = -1;
  for (let a = 0; a < 360; a += coarseStep) {
    const d = distanciaLibreKm(lat, lon, a, esTierra, turf, coarseProbe);
    if (d > bestFree) {
      bestFree = d;
      bestB = a;
    }
  }

  const maxNudge = opts.maxOffshoreKm ?? 0.35;
  const nudgeStep = opts.offshoreStepKm ?? 0.05;
  const origin = turf.point([lon, lat]);

  for (let km = nudgeStep; km <= maxNudge; km += nudgeStep) {
    const p = turf.destination(origin, km, bestB, { units: 'kilometers' });
    const [lo, la] = p.geometry.coordinates;
    if (!esTierra(lo, la)) {
      return { lat: la, lon: lo, coarseBestBearing: bestB, offshoreKm: km };
    }
  }

  return { lat, lon, coarseBestBearing: bestB, offshoreKm: 0 };
}

module.exports = { resolveOffshoreOrigin };
