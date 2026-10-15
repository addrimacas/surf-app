// Galería de todos los dibujos de la app (para revisarlos de un vistazo)
import { abrir } from './entorno.mjs';
const OUT = process.env.OUT || '/tmp';
const { pag, errores, cerrar } = await abrir({ ancho: 420, alto: 900 });
await pag.evaluate(() => {
  const g = document.createElement('div');
  g.id = 'galeria';
  g.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#0a1628;color:#ccd;padding:12px;overflow:auto;font:11px sans-serif';
  const fila = (t, items) => `<div style="margin:6px 0 2px;color:#8899aa">${t}</div><div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center">${items.map(([h, l]) => `<div style="text-align:center">${h}<div>${l}</div></div>`).join('')}</div>`;
  const codigos = [0, 2, 3, 45, 61, 80, 95];
  let html = fila('Cielo de día', codigos.map(c => [iconoCielo(c, 36, null, null, 1), c]));
  html += fila('Cielo de noche', codigos.map(c => [iconoCielo(c, 36, null, null, 0), c]));
  html += fila('Perfiles', [[SVG_PERFIL_BANISTA, 'bañista'], [SVG_PERFIL_PRINCIPIANTE, 'princ.'], [SVG_PERFIL_INTERMEDIO, 'interm.'], [SVG_PERFIL_PRO, 'pro']].map(([s, l]) => [`<div style="width:40px;height:40px;color:#4db8ff">${s}</div>`, l]));
  html += fila('Flechas', [0, 90, 180, 270, 315].map(d => [flechaDireccion(d, '#4db8ff', 36), d]));
  html += fila('Brújula viento', [[brujulaViento(45, 12, playaActiva, etiquetaViento(45, 12, playaActiva)), 'NE 12'], [brujulaViento(270, 25, playaActiva, etiquetaViento(270, 25, playaActiva)), 'O 25']]);
  g.innerHTML = html;
  document.body.appendChild(g);
});
await pag.waitForTimeout(500);
await pag.screenshot({ path: OUT + '/galeria.png' });
console.log('ERRORES:\n' + (errores.join('\n') || '(ninguno)'));
await cerrar();
