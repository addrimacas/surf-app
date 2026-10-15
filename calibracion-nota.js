// Generado por scripts/calibrar-escala.js — NO editar a mano.
// Umbrales de calidad Q para las notas 2…10 por nivel (climatología 2025-10-13 → 2026-10-13).
(function (g) {
  const C = {
    "version": "v2.3.0",
    "generado": "2026-10-15T15:17:39.124Z",
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
        "mediana": 0.335,
        "p90": 0.828,
        "p99": 0.948
      },
      "intermedio": {
        "horas": 86073,
        "mediana": 0.497,
        "p90": 0.837,
        "p99": 0.945
      },
      "pro": {
        "horas": 86073,
        "mediana": 0.236,
        "p90": 0.708,
        "p99": 0.865
      }
    },
    "niveles": {
      "principiante": [
        0.0677,
        0.1396,
        0.3349,
        0.4946,
        0.6498,
        0.7516,
        0.8279,
        0.8964,
        0.948
      ],
      "intermedio": [
        0.1447,
        0.3263,
        0.4966,
        0.6128,
        0.7086,
        0.7776,
        0.8373,
        0.8956,
        0.9455
      ],
      "pro": [
        0.1155,
        0.1728,
        0.2361,
        0.318,
        0.4681,
        0.6055,
        0.7081,
        0.7937,
        0.8647
      ]
    }
  };
  g.CALIBRACION_NOTA = C;
  if (typeof module !== 'undefined' && module.exports) module.exports = C;
})(typeof window !== 'undefined' ? window : globalThis);
