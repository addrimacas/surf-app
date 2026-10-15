// Capturas de la previsión (hoy, 3 días, 10 días)
import { abrir } from './entorno.mjs';
const OUT = process.env.OUT || '/tmp';
const { pag, errores, cerrar } = await abrir({ ancho: +(process.env.ANCHO || 390) });
const el = await pag.$('#prev-hoy');
await el.scrollIntoViewIfNeeded();
for (const t of ['hoy', '3d', '10d']) {
  await pag.evaluate(t => cambiarPrevTab(t, [...document.querySelectorAll('.prev-tab')].find(b => b.getAttribute('onclick').includes(`'${t}'`))), t);
  await pag.waitForTimeout(400);
  const caja = await pag.$('#prev-' + t);
  await caja.screenshot({ path: `${OUT}/p-${t}.png` });
}
console.log('ERRORES:\n' + (errores.join('\n') || '(ninguno)'));
await cerrar();
