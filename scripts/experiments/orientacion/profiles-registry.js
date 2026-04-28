/**
 * Catálogo de perfiles reproducibles — añade filas aquí para nuevas hipótesis.
 * Campos:
 *   stepAngle, stepKm, maxKm, windowRatio (0–1)
 *   offshore: si true, usa lib/offshore-origin antes de la curva completa
 */

module.exports.EXPERIMENT_PROFILES = [
  {
    id: 'baseline-5deg-1km-25km',
    label: 'Referencia (~curva por defecto)',
    stepAngle: 5,
    stepKm: 1,
    maxKm: 25,
    windowRatio: 0.75,
    offshore: false,
  },
  {
    id: 'fine-angle-3deg-1km-25km',
    label: 'Más densidad angular',
    stepAngle: 3,
    stepKm: 1,
    maxKm: 25,
    windowRatio: 0.75,
    offshore: false,
  },
  {
    id: 'fine-ray-5deg-0.5km-25km',
    label: 'Rayo más fino (costa)',
    stepAngle: 5,
    stepKm: 0.5,
    maxKm: 25,
    windowRatio: 0.75,
    offshore: false,
  },
  {
    id: 'long-5deg-1km-40km',
    label: 'Alcance mayor (cabos lejanos)',
    stepAngle: 5,
    stepKm: 1,
    maxKm: 40,
    windowRatio: 0.75,
    offshore: false,
  },
  {
    id: 'v3-like-5deg-1km-80km',
    label: 'Similar alcance a orientacion-v3 (80 km)',
    stepAngle: 5,
    stepKm: 1,
    maxKm: 80,
    windowRatio: 0.75,
    offshore: false,
  },
  {
    id: 'offshore-nudge-5deg-1km-25km',
    label: 'Origen desplazado mar adentro (quick coarse + nudge)',
    stepAngle: 5,
    stepKm: 1,
    maxKm: 25,
    windowRatio: 0.75,
    offshore: true,
  },
];
