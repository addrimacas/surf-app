// Generado por scripts/calibrar-escala.js — NO editar a mano.
// Umbrales de calidad Q para las notas 2…10 por nivel (climatología 2025-10-12 → 2026-10-12).
(function (g) {
  const C = {
    "version": "v2.1.0",
    "generado": "2026-10-14T17:15:32.032Z",
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
        "horas": 87556,
        "mediana": 0.304,
        "p90": 0.83,
        "p99": 0.953
      },
      "intermedio": {
        "horas": 87556,
        "mediana": 0.484,
        "p90": 0.84,
        "p99": 0.946
      },
      "pro": {
        "horas": 87556,
        "mediana": 0.233,
        "p90": 0.71,
        "p99": 0.87
      }
    },
    "niveles": {
      "principiante": [
        0.068,
        0.126,
        0.3037,
        0.4792,
        0.6442,
        0.7521,
        0.83,
        0.8992,
        0.9529
      ],
      "intermedio": [
        0.1274,
        0.2842,
        0.4843,
        0.6118,
        0.7107,
        0.7822,
        0.8403,
        0.8978,
        0.946
      ],
      "pro": [
        0.1106,
        0.172,
        0.2333,
        0.3049,
        0.4608,
        0.606,
        0.7102,
        0.7988,
        0.8702
      ]
    }
  };
  g.CALIBRACION_NOTA = C;
  if (typeof module !== 'undefined' && module.exports) module.exports = C;
})(typeof window !== 'undefined' ? window : globalThis);
