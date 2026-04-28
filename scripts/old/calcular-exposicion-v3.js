#!/usr/bin/env node
/**
 * Punto de entrada recomendado para el modelo de exposición (7 factores, GEBCO).
 * Misma lógica que calcular-exposicion-v2.js; salida y localStorage etiquetados como v3.
 *
 * Uso: node scripts/calcular-exposicion-v3.js
 */
process.env.SALITRE_EXPOS_LS = 'salitre_exposicion_v3';
process.env.SALITRE_EXPOS_VERSION = 'v3';
await import('./calcular-exposicion-v2.js');
