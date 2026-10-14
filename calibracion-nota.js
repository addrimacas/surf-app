// Generado por scripts/calibrar-escala.js — NO editar a mano.
// Umbrales de calidad Q para las notas 2…10 por nivel (climatología 2025-10-12 → 2026-10-12).
(function (g) {
  const C = {
    "version": "v2.0.0",
    "generado": "2026-10-14T14:56:38.707Z",
    "desde": "2025-10-12",
    "hasta": "2026-10-12",
    "objetivo": {
      "2": 0.78,
      "3": 0.62,
      "4": 0.5,
      "5": 0.4,
      "6": 0.28,
      "7": 0.18,
      "8": 0.1,
      "9": 0.04,
      "10": 0.01
    },
    "resumen": {
      "principiante": {
        "horas": 87557,
        "mediana": 0.213,
        "p90": 0.811,
        "p99": 0.946
      },
      "intermedio": {
        "horas": 87557,
        "mediana": 0.538,
        "p90": 0.851,
        "p99": 0.955
      },
      "pro": {
        "horas": 87557,
        "mediana": 0.27,
        "p90": 0.739,
        "p99": 0.881
      }
    },
    "niveles": {
      "principiante": [
        0.067,
        0.076,
        0.2134,
        0.4154,
        0.5965,
        0.7194,
        0.8107,
        0.8877,
        0.9456
      ],
      "intermedio": [
        0.1422,
        0.3596,
        0.5375,
        0.6392,
        0.7255,
        0.7932,
        0.8506,
        0.9074,
        0.9549
      ],
      "pro": [
        0.1373,
        0.2163,
        0.2704,
        0.3781,
        0.5321,
        0.651,
        0.7386,
        0.8141,
        0.8811
      ]
    }
  };
  g.CALIBRACION_NOTA = C;
  if (typeof module !== 'undefined' && module.exports) module.exports = C;
})(typeof window !== 'undefined' ? window : globalThis);
