// Generado por scripts/calibrar-escala.js — NO editar a mano.
// Umbrales de calidad Q para las notas 2…10 por nivel (climatología 2025-10-12 → 2026-10-12).
(function (g) {
  const C = {
    "version": "v2.2.0",
    "generado": "2026-10-14T20:19:19.700Z",
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
        "horas": 87558,
        "mediana": 0.345,
        "p90": 0.837,
        "p99": 0.952
      },
      "intermedio": {
        "horas": 87558,
        "mediana": 0.492,
        "p90": 0.841,
        "p99": 0.948
      },
      "pro": {
        "horas": 87558,
        "mediana": 0.231,
        "p90": 0.712,
        "p99": 0.867
      }
    },
    "niveles": {
      "principiante": [
        0.0685,
        0.148,
        0.345,
        0.5086,
        0.6597,
        0.7608,
        0.8368,
        0.9035,
        0.952
      ],
      "intermedio": [
        0.1391,
        0.3057,
        0.4917,
        0.6152,
        0.7132,
        0.7822,
        0.8415,
        0.8997,
        0.9479
      ],
      "pro": [
        0.111,
        0.168,
        0.2313,
        0.3054,
        0.4636,
        0.6099,
        0.7117,
        0.7958,
        0.8665
      ]
    }
  };
  g.CALIBRACION_NOTA = C;
  if (typeof module !== 'undefined' && module.exports) module.exports = C;
})(typeof window !== 'undefined' ? window : globalThis);
