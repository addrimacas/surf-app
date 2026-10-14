// Generado por scripts/calibrar-escala.js — NO editar a mano.
// Umbrales de calidad Q para las notas 2…10 por nivel (climatología 2025-10-12 → 2026-10-12).
(function (g) {
  const C = {
    "version": "v2.1.0",
    "generado": "2026-10-14T18:24:59.224Z",
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
        "horas": 86072,
        "mediana": 0.291,
        "p90": 0.828,
        "p99": 0.953
      },
      "intermedio": {
        "horas": 86072,
        "mediana": 0.491,
        "p90": 0.84,
        "p99": 0.944
      },
      "pro": {
        "horas": 86072,
        "mediana": 0.238,
        "p90": 0.712,
        "p99": 0.869
      }
    },
    "niveles": {
      "principiante": [
        0.0681,
        0.1212,
        0.2907,
        0.4714,
        0.638,
        0.7494,
        0.8281,
        0.8991,
        0.9529
      ],
      "intermedio": [
        0.1302,
        0.2929,
        0.4912,
        0.6139,
        0.711,
        0.7822,
        0.8401,
        0.8974,
        0.9444
      ],
      "pro": [
        0.116,
        0.1795,
        0.2382,
        0.3145,
        0.4686,
        0.6101,
        0.7121,
        0.7988,
        0.8692
      ]
    }
  };
  g.CALIBRACION_NOTA = C;
  if (typeof module !== 'undefined' && module.exports) module.exports = C;
})(typeof window !== 'undefined' ? window : globalThis);
