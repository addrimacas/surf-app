// Generado por scripts/calibrar-escala.js — NO editar a mano.
// Umbrales de calidad Q para las notas 2…10 por nivel (climatología 2025-10-13 → 2026-10-13).
(function (g) {
  const C = {
    "version": "v2.3.0",
    "generado": "2026-10-15T15:56:33.628Z",
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
        "horas": 89041,
        "mediana": 0.335,
        "p90": 0.829,
        "p99": 0.948
      },
      "intermedio": {
        "horas": 89041,
        "mediana": 0.483,
        "p90": 0.835,
        "p99": 0.945
      },
      "pro": {
        "horas": 89041,
        "mediana": 0.229,
        "p90": 0.704,
        "p99": 0.863
      }
    },
    "niveles": {
      "principiante": [
        0.0679,
        0.1438,
        0.3349,
        0.4949,
        0.6504,
        0.7524,
        0.8285,
        0.8964,
        0.9478
      ],
      "intermedio": [
        0.1389,
        0.306,
        0.483,
        0.604,
        0.7036,
        0.7747,
        0.8352,
        0.8941,
        0.9447
      ],
      "pro": [
        0.1108,
        0.1667,
        0.2293,
        0.305,
        0.4565,
        0.5975,
        0.7039,
        0.7915,
        0.863
      ]
    }
  };
  g.CALIBRACION_NOTA = C;
  if (typeof module !== 'undefined' && module.exports) module.exports = C;
})(typeof window !== 'undefined' ? window : globalThis);
