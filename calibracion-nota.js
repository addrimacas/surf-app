// Generado por scripts/calibrar-escala.js — NO editar a mano.
// Umbrales de calidad Q para las notas 2…10 por nivel (climatología 2025-10-13 → 2026-10-13).
(function (g) {
  const C = {
    "version": "v2.3.0",
    "generado": "2026-10-15T15:49:33.437Z",
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
        "horas": 87558,
        "mediana": 0.333,
        "p90": 0.828,
        "p99": 0.948
      },
      "intermedio": {
        "horas": 87558,
        "mediana": 0.488,
        "p90": 0.836,
        "p99": 0.945
      },
      "pro": {
        "horas": 87558,
        "mediana": 0.232,
        "p90": 0.706,
        "p99": 0.864
      }
    },
    "niveles": {
      "principiante": [
        0.0678,
        0.1414,
        0.3327,
        0.493,
        0.6482,
        0.751,
        0.8275,
        0.896,
        0.9478
      ],
      "intermedio": [
        0.1409,
        0.3132,
        0.4882,
        0.6068,
        0.7054,
        0.7757,
        0.8359,
        0.8946,
        0.9451
      ],
      "pro": [
        0.1124,
        0.1691,
        0.2324,
        0.3104,
        0.4614,
        0.6012,
        0.7058,
        0.7926,
        0.8638
      ]
    }
  };
  g.CALIBRACION_NOTA = C;
  if (typeof module !== 'undefined' && module.exports) module.exports = C;
})(typeof window !== 'undefined' ? window : globalThis);
