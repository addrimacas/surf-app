// Generado por scripts/calibrar-escala.js — NO editar a mano.
// Umbrales de calidad Q para las notas 2…10 por nivel (climatología 2025-10-12 → 2026-10-12).
(function (g) {
  const C = {
    "version": "v2.0.1",
    "generado": "2026-10-14T16:35:22.330Z",
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
        "horas": 89041,
        "mediana": 0.21,
        "p90": 0.81,
        "p99": 0.945
      },
      "intermedio": {
        "horas": 89041,
        "mediana": 0.539,
        "p90": 0.85,
        "p99": 0.955
      },
      "pro": {
        "horas": 89041,
        "mediana": 0.272,
        "p90": 0.739,
        "p99": 0.882
      }
    },
    "niveles": {
      "principiante": [
        0.067,
        0.0757,
        0.21,
        0.4126,
        0.5946,
        0.7177,
        0.8097,
        0.8874,
        0.9454
      ],
      "intermedio": [
        0.1426,
        0.362,
        0.5388,
        0.6397,
        0.7254,
        0.7929,
        0.8501,
        0.907,
        0.9546
      ],
      "pro": [
        0.1387,
        0.2183,
        0.272,
        0.3799,
        0.534,
        0.6519,
        0.7392,
        0.815,
        0.8816
      ]
    }
  };
  g.CALIBRACION_NOTA = C;
  if (typeof module !== 'undefined' && module.exports) module.exports = C;
})(typeof window !== 'undefined' ? window : globalThis);
