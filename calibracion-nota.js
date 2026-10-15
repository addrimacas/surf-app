// Generado por scripts/calibrar-escala.js — NO editar a mano.
// Umbrales de calidad Q para las notas 2…10 por nivel (climatología 2025-10-13 → 2026-10-13).
(function (g) {
  const C = {
    "version": "v2.3.0",
    "generado": "2026-10-15T14:33:38.332Z",
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
        "horas": 86073,
        "mediana": 0.329,
        "p90": 0.829,
        "p99": 0.948
      },
      "intermedio": {
        "horas": 86073,
        "mediana": 0.475,
        "p90": 0.833,
        "p99": 0.943
      },
      "pro": {
        "horas": 86073,
        "mediana": 0.227,
        "p90": 0.701,
        "p99": 0.861
      }
    },
    "niveles": {
      "principiante": [
        0.0677,
        0.1412,
        0.3291,
        0.4918,
        0.6486,
        0.7519,
        0.8288,
        0.8967,
        0.9476
      ],
      "intermedio": [
        0.1356,
        0.2966,
        0.4755,
        0.5991,
        0.7008,
        0.7722,
        0.8331,
        0.8927,
        0.9434
      ],
      "pro": [
        0.1091,
        0.1651,
        0.2272,
        0.3005,
        0.452,
        0.5938,
        0.7011,
        0.789,
        0.8615
      ]
    }
  };
  g.CALIBRACION_NOTA = C;
  if (typeof module !== 'undefined' && module.exports) module.exports = C;
})(typeof window !== 'undefined' ? window : globalThis);
