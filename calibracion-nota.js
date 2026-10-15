// Generado por scripts/calibrar-escala.js — NO editar a mano.
// Umbrales de calidad Q para las notas 2…10 por nivel (climatología 2025-10-13 → 2026-10-13).
(function (g) {
  const C = {
    "version": "v2.3.0",
    "generado": "2026-10-15T14:46:10.924Z",
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
        "mediana": 0.33,
        "p90": 0.828,
        "p99": 0.948
      },
      "intermedio": {
        "horas": 87557,
        "mediana": 0.488,
        "p90": 0.836,
        "p99": 0.945
      },
      "pro": {
        "horas": 87557,
        "mediana": 0.233,
        "p90": 0.706,
        "p99": 0.864
      }
    },
    "niveles": {
      "principiante": [
        0.0678,
        0.1403,
        0.33,
        0.4914,
        0.6475,
        0.7508,
        0.8276,
        0.8962,
        0.9479
      ],
      "intermedio": [
        0.1404,
        0.3132,
        0.4882,
        0.6072,
        0.7057,
        0.7761,
        0.8362,
        0.8948,
        0.9451
      ],
      "pro": [
        0.1122,
        0.1692,
        0.2327,
        0.3108,
        0.4622,
        0.6017,
        0.7061,
        0.7927,
        0.8639
      ]
    }
  };
  g.CALIBRACION_NOTA = C;
  if (typeof module !== 'undefined' && module.exports) module.exports = C;
})(typeof window !== 'undefined' ? window : globalThis);
