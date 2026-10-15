// Generado por scripts/calibrar-escala.js — NO editar a mano.
// Umbrales de calidad Q para las notas 2…10 por nivel (climatología 2025-10-13 → 2026-10-13).
(function (g) {
  const C = {
    "version": "v2.3.0",
    "generado": "2026-10-15T15:34:07.366Z",
    "desde": "2025-10-13",
    "hasta": "2026-10-13",
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
        "mediana": 0.341,
        "p90": 0.83,
        "p99": 0.948
      },
      "intermedio": {
        "horas": 87557,
        "mediana": 0.48,
        "p90": 0.835,
        "p99": 0.945
      },
      "pro": {
        "horas": 87557,
        "mediana": 0.226,
        "p90": 0.703,
        "p99": 0.863
      }
    },
    "niveles": {
      "principiante": [
        0.0681,
        0.1483,
        0.3412,
        0.4999,
        0.6535,
        0.7545,
        0.8298,
        0.897,
        0.9479
      ],
      "intermedio": [
        0.1387,
        0.3032,
        0.4802,
        0.6024,
        0.7033,
        0.7745,
        0.8352,
        0.8941,
        0.9447
      ],
      "pro": [
        0.1094,
        0.1645,
        0.2261,
        0.3008,
        0.4527,
        0.5944,
        0.7027,
        0.7912,
        0.8631
      ]
    }
  };
  g.CALIBRACION_NOTA = C;
  if (typeof module !== 'undefined' && module.exports) module.exports = C;
})(typeof window !== 'undefined' ? window : globalThis);
