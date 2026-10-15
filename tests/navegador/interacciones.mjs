// Abre menús, selector de playa, valoración, comentario y la ficha del mapa, y captura cada uno.
import { abrir } from './entorno.mjs';
const OUT = process.env.OUT || '/tmp';
const { pag, errores, ir, cerrar } = await abrir();
const foto = async n => { await pag.waitForTimeout(700); await pag.screenshot({ path: `${OUT}/i-${n}.png` }); };
const paso = async (n, f) => { try { await f(); await foto(n); } catch (e) { errores.push(`[${n}] ${e.message.split('\n')[0]}`); } };
await paso('menu', () => pag.click('#perfil-btn'));
await paso('menu-cerrado', async () => {
  await pag.keyboard.press('Escape');
  if (await pag.evaluate(() => document.getElementById('perfil-overlay').classList.contains('visible'))) throw new Error('Escape no cierra el menú');
});
await paso('selector', () => pag.evaluate(() => toggleSelector()));
await paso('selector-cerrado', () => pag.evaluate(() => toggleSelector()));
await paso('valoracion', () => pag.evaluate(() => abrirValoracion()));
await paso('valoracion-cerrada', () => pag.evaluate(() => cerrarValoracion()));
await paso('comentario', () => pag.evaluate(() => abrirComentario()));
await pag.keyboard.press('Escape');
await paso('comentario-cerrado', async () => {});
await paso('mapa', async () => { await ir('mapa'); await pag.waitForTimeout(2500); });
await paso('mapa-ficha', async () => {
  const n = await pag.evaluate(() => { let k = 0, hecho = false; mapa.eachLayer(l => { if (l.getPopup && l.getPopup() && !hecho && ++k > 20) { l.openPopup(); hecho = true; } }); return hecho; });
  if (!n) throw new Error('no se pudo abrir ninguna ficha');
});
console.log('ERRORES:\n' + (errores.join('\n') || '(ninguno)'));
await cerrar();
