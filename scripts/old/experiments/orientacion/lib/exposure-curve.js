/**
 * Núcleo de curva exposure_curve(θ) — parametrizable para experimentos.
 */

function distanciaLibreKm(lat, lon, bearingDeg, esTierra, turf, opts) {
  const stepKm = opts.stepKm;
  const maxKm = opts.maxKm;
  const origin = turf.point([lon, lat]);
  let libre = 0;
  for (let d = stepKm; d <= maxKm; d += stepKm) {
    const p = turf.destination(origin, d, bearingDeg, { units: 'kilometers' });
    const [pLon, pLat] = p.geometry.coordinates;
    if (esTierra(pLon, pLat)) break;
    libre = d;
  }
  return libre;
}

function computeExposureCurve(lat, lon, esTierra, turf, opts) {
  const stepAngle = opts.stepAngle;
  const curve = [];
  for (let angle = 0; angle < 360; angle += stepAngle) {
    curve.push({
      angle,
      distance: distanciaLibreKm(lat, lon, angle, esTierra, turf, opts),
    });
  }
  return curve;
}

function angularWindowMinMax(angles) {
  if (angles.length === 0) return null;
  const s = [...new Set(angles)].sort((a, b) => a - b);
  if (s.length === 1) return [s[0], s[0]];
  let maxGap = 0;
  let maxIdx = 0;
  for (let i = 0; i < s.length; i++) {
    const gap = i === s.length - 1 ? s[0] + 360 - s[i] : s[i + 1] - s[i];
    if (gap > maxGap) {
      maxGap = gap;
      maxIdx = i;
    }
  }
  const start = s[(maxIdx + 1) % s.length];
  const end = s[maxIdx];
  return [start, end];
}

function localMaximaIndices(distances) {
  const n = distances.length;
  const peaks = [];
  for (let i = 0; i < n; i++) {
    const prev = distances[(i - 1 + n) % n];
    const next = distances[(i + 1) % n];
    const v = distances[i];
    if (v >= prev && v >= next && (v > prev || v > next)) peaks.push(i);
  }
  return peaks;
}

/** Media circular de ángulos en grados (mitad empates tipo «todo mar abierto»). */
function circularMeanDeg(angles) {
  if (angles.length === 0) return 0;
  let sx = 0;
  let sy = 0;
  for (const deg of angles) {
    const rad = (deg * Math.PI) / 180;
    sx += Math.sin(rad);
    sy += Math.cos(rad);
  }
  let deg = (Math.atan2(sx, sy) * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
}

function extractOrientation(curve, opts) {
  const ratio = opts.windowRatio ?? 0.75;
  const maxKm = opts.maxKm;

  const maxD = Math.max(...curve.map(p => p.distance));
  const eps = 1e-6;
  const atMax = curve.filter(p => Math.abs(p.distance - maxD) <= eps);
  const bestAngle =
    atMax.length === 1
      ? atMax[0].angle
      : Math.round(circularMeanDeg(atMax.map(p => p.angle)));
  const best = { angle: bestAngle, distance: maxD };
  const thresh = maxD * ratio;

  const above = curve.filter(p => p.distance >= thresh && maxD > 0);
  let window = null;
  if (above.length > 0) {
    const angles = above.map(p => p.angle);
    window = angularWindowMinMax(angles);
  }

  const meanKm = curve.reduce((s, p) => s + p.distance, 0) / curve.length;
  const exposureScore = Math.min(1, meanKm / maxKm);

  const peaks = localMaximaIndices(curve.map(p => p.distance));
  const secondaryHints =
    peaks.length > 1
      ? peaks
          .filter(i => curve[i].distance >= maxD * 0.65 && curve[i].angle !== best.angle)
          .slice(0, 3)
          .map(i => ({ angle: curve[i].angle, distanceKm: curve[i].distance }))
      : [];

  return {
    orientation: best.angle,
    maxDistanceKm: parseFloat(maxD.toFixed(2)),
    window,
    thresholdKm: parseFloat(thresh.toFixed(2)),
    exposureScore: parseFloat(exposureScore.toFixed(3)),
    meanDistanceKm: parseFloat(meanKm.toFixed(2)),
    peakHints: secondaryHints,
    curve,
  };
}

function angleDiff(a, b) {
  const d = Math.abs(((a - b) + 360) % 360);
  return d > 180 ? 360 - d : d;
}

function runFull(lat, lon, esTierra, turf, rayOpts) {
  const curve = computeExposureCurve(lat, lon, esTierra, turf, rayOpts);
  const stats = extractOrientation(curve, rayOpts);
  return { curve, stats };
}

module.exports = {
  distanciaLibreKm,
  computeExposureCurve,
  extractOrientation,
  angleDiff,
  runFull,
};
