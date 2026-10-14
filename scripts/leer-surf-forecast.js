// Lee la tabla de previsión de una página de Surf-Forecast.
// Cada columna horaria lleva un atributo data-swell-tooltip con un JSON (entidades HTML) que trae
// la fecha y hasta 4 trenes de oleaje: período, ángulo, letras de dirección, altura y energía (kJ),
// más sumEnergy (suma de todos). La tabla visible enseña el primer tren (el principal).
'use strict';
function desescapar(s) {
  return s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}
function leerTabla(html) {
  const filas = [];
  const re = /data-swell-tooltip="([^"]*)"/g;
  let m;
  while ((m = re.exec(html))) {
    let j;
    try { j = JSON.parse(desescapar(m[1])); } catch (e) { continue; }
    filas.push({
      fecha_texto: j.date ?? null,
      trenes: (j.swells || []).filter(Boolean).map(s => ({ altura: s.height, periodo: s.period, letras: s.letters, angulo: s.angle, energia: s.energy })),
      energia_total: j.sumEnergy ?? null,
    });
  }
  if (!filas.length) throw new Error('no se encontró ninguna columna con data-swell-tooltip');
  return filas;
}
module.exports = { leerTabla };
