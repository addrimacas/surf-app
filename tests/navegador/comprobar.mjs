// Pruebas de la app en navegador con aserciones. Uso: node tests/navegador/comprobar.mjs
// Lanza la app varias veces (normal y con averías simuladas) y falla si algo no cuadra.
import assert from 'node:assert/strict';
import { abrir } from './entorno.mjs';

const fallos = [];
async function caso(nombre, fn, env = {}) {
  const prev = { ...process.env }; Object.assign(process.env, env);
  let ctx;
  try {
    ctx = await abrir();
    await fn(ctx);
    const graves = ctx.errores.filter(e => e.startsWith('pageerror') || (e.startsWith('error') && !/Failed to load resource|sin datos de oleaje|Too many requests/.test(e)));
    assert.deepEqual(graves, [], 'errores en la consola');
    console.log('ok -', nombre);
  } catch (e) { fallos.push(nombre); console.log('NO -', nombre, '\n   ', e.message.split('\n').slice(0, 4).join('\n    ')); }
  finally { if (ctx) await ctx.cerrar(); process.env = prev; }
}
const texto = (pag, sel) => pag.evaluate(s => document.querySelector(s)?.innerText ?? '', sel);

await caso('inicio: nota, tarjetas y «¿Dónde vamos?» coherentes', async ({ pag }) => {
  await pag.waitForTimeout(1500);
  const nota = await pag.evaluate(() => window.ultimaEvaluacion?.nota);
  assert.ok(nota >= 1 && nota <= 10, 'nota principal ' + nota);
  const swell = await texto(pag, 'body');
  assert.ok(/Swell ideal \(calculado/i.test(swell), 'falta la caja de swell calculada');
  assert.ok(!/usar el anterior|motor nuevo \(v1/i.test(swell), 'queda el enlace al motor antiguo');
  assert.ok(!/horas de luz|De noche:/i.test(swell), 'texto sobre la noche');
  // la playa que ves: la nota «ahora» de la lista es la misma que la principal
  const ahora = await pag.evaluate(() => {
    const filas = [...document.querySelectorAll('#mejores-olas [onclick^="seleccionarPlayaPorNombre"]')];
    const f = filas.find(x => x.innerText.includes('(la que ves)'));
    return f ? +f.querySelector('span').innerText : null;
  });
  if (ahora != null) assert.equal(ahora, nota, '«ahora» en ¿Dónde vamos? ≠ nota principal');
});

await caso('playas: hoy empieza en la hora actual y la marea se rellena', async ({ pag, ir }) => {
  await ir('playas'); await pag.waitForTimeout(2500);
  const t = await texto(pag, '#pl-tabla');
  const primera = +(t.match(/(\d+)h/) || [])[1];
  assert.equal(primera, new Date().getHours(), 'primera hora ' + primera);
  assert.ok(/MAREA[\s\S]*\d\.\d m[\s\S]*(sube|baja)/.test(t), 'fila de marea vacía');
  await pag.evaluate(() => plCambiarDia(2)); await pag.waitForTimeout(1500);
  const t2 = await texto(pag, '#pl-tabla');
  assert.ok(/^\s*0h/.test(t2), 'otro día no empieza a las 0 h');
  assert.ok(/(sube|baja)/.test(t2), 'otro día sin marea');
});

await caso('playas: si el servicio de mareas no responde, la tabla carga igual', async ({ pag, ir }) => {
  await ir('playas'); await pag.waitForTimeout(9000);
  const t = await texto(pag, '#pl-tabla');
  assert.ok(/PUNT/.test(t), 'tabla sin cargar');
}, { FALLO: 'mareas-cuelga' });

await caso('playas: sin datos de oleaje avisa y no se queda cargando', async ({ pag, ir }) => {
  await ir('playas'); await pag.waitForTimeout(6000);
  assert.ok(/No se han podido cargar/.test(await texto(pag, '#pl-tabla')));
  assert.ok(!/Cargando/.test(await texto(pag, '#pl-sem-estado')));
}, { FALLO: 'oleaje' });

await caso('mapa: 60 marcadores con nota y ficha que abre', async ({ pag, ir }) => {
  await ir('mapa'); await pag.waitForTimeout(3000);
  const n = await pag.evaluate(() => document.querySelectorAll('.leaflet-marker-icon').length);
  assert.equal(n, 60, 'marcadores ' + n);
  const ok = await pag.evaluate(() => { let h = false; mapa.eachLayer(l => { if (!h && l.getPopup?.()) { l.openPopup(); h = true; } }); return !!document.querySelector('.leaflet-popup'); });
  assert.ok(ok, 'la ficha no abre');
});

await caso('guía: ventana de swell dibujada y escala con el 10', async ({ pag, ir }) => {
  await ir('guia'); await pag.waitForTimeout(800);
  const d = await pag.evaluate(() => document.getElementById('guia-rosa')?.getAttribute('d') || '');
  assert.ok(d.length > 50, 'rosa vacía');
  const t = await texto(pag, '#pantalla-guia');
  assert.ok(/\b10\b[\s\S]*Perfecto/.test(t), 'escala sin el 10');
});

await caso('menú y ventanas se cierran con Escape', async ({ pag }) => {
  await pag.click('#perfil-btn'); await pag.waitForTimeout(300);
  await pag.keyboard.press('Escape'); await pag.waitForTimeout(300);
  assert.ok(!(await pag.evaluate(() => document.getElementById('perfil-overlay').classList.contains('visible'))));
  await pag.evaluate(() => abrirComentario()); await pag.keyboard.press('Escape');
  assert.equal(await pag.evaluate(() => document.getElementById('comentario-overlay').style.display), 'none');
});

await caso('datos reales (registro del 15-oct, 12 h): notas repartidas y coherentes', async ({ pag }) => {
  for (const nivel of ['principiante', 'intermedio', 'pro']) {
    const r = await pag.evaluate(async nivel => {
      perfilActivo = nivel;
      const lote = await pedirLote(todasLasPlayas(), { hourly: true, dias: 2 });
      return lote.map(x => { const e = estadoAhora(x); return { n: x.playa.nombre, s: e.score, f: e.v1?.factores }; });
    }, nivel);
    assert.equal(r.length, 60, nivel + ': playas ' + r.length);
    if (nivel === 'principiante') assert.ok(/\d+\.\d°C agua/i.test(await pag.evaluate(() => document.body.innerText)), 'falta la temperatura del agua');
    const distintas = new Set(r.map(x => x.s)).size;
    assert.ok(distintas >= 5, `${nivel}: solo ${distintas} notas distintas`);
    for (const x of r) {
      assert.ok(x.s >= 1 && x.s <= 10, `${nivel} ${x.n}: ${x.s}`);
      if (x.s === 10) assert.ok(Math.min(x.f.tamano, x.f.forma, x.f.superficie, x.f.fuerza, x.f.marea) >= 0.95, `${nivel} ${x.n}: 10 sin todo perfecto`);
    }
  }
}, { REGISTRO: 'tests/datos/registro-2026-10-15.json.gz', HORA: '2026-10-15T12:00:00+02:00' });

console.log(fallos.length ? `\n${fallos.length} caso(s) fallan` : '\ntodo bien');
process.exit(fallos.length ? 1 : 0);
