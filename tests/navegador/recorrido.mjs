// Recorre todas las pantallas y guarda capturas de página completa (para revisar el diseño).
import { abrir } from './entorno.mjs';
const OUT = process.env.OUT || '/tmp';
const { pag, errores, ir, cerrar } = await abrir();
const foto = async n => { await pag.waitForTimeout(800); await pag.screenshot({ path: `${OUT}/r-${n}.png`, fullPage: true }); };
await foto('inicio');
for (const p of ['playas', 'mapa', 'guia']) { await ir(p); await pag.waitForTimeout(3500); await foto(p); }
await ir('inicio'); await pag.waitForTimeout(500);
// menú
const menu = await pag.$('[onclick*="abrirMenu"], #btn-menu, .btn-menu');
if (menu) { await menu.click(); await foto('menu'); await pag.keyboard.press('Escape'); }
console.log('ERRORES:\n' + (errores.join('\n') || '(ninguno)'));
await cerrar();
