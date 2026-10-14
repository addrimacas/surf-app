// Provisional hasta que GitHub Actions ejecute scripts/calibrar-escala.js (sin umbrales: nota = 1 + 9·Q).
(function (g) {
  const C = { version: null, niveles: {} };
  g.CALIBRACION_NOTA = C;
  if (typeof module !== 'undefined' && module.exports) module.exports = C;
})(typeof window !== 'undefined' ? window : globalThis);
