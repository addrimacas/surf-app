// Cloudflare Worker «salitre-beta»
//  · Recoge valoraciones y comentarios de la beta (base D1 enlazada como DB).
//  · Avisos: cuando el mar previsto se parece al de una sesión que la persona valoró con 7 o más,
//    le manda una notificación al móvil (Web Push sin contenido: el móvil pide el texto a /v1/aviso).
// Secretos: VAPID_PRIVATE_JWK (clave privada de avisos, JSON). Opcional: EXPORT_TOKEN.
// Activador programado (Cron Triggers): una vez al día, p. ej. «0 6 * * *» (08:00 en Madrid en verano).
//
//   POST /v1/valoracion   {dispositivo, playa, fecha, nota, coincidio, perfil, comentario, prediccion}
//   POST /v1/comentario   {dispositivo, texto, playa, contacto, version_app}
//   POST /v1/suscripcion  {dispositivo, endpoint}          → activa avisos para este móvil
//   POST /v1/baja         {dispositivo}                    → los desactiva
//   POST /v1/probar-aviso {dispositivo}                    → manda un aviso de prueba ahora
//   POST /v1/aviso        {endpoint}                       → el móvil recoge el texto del último aviso
//   GET  /v1/exportar?tabla=valoraciones|comentarios   (Authorization: Bearer <EXPORT_TOKEN>)

const ORIGENES = ['https://addrimacas.github.io', 'http://localhost:8765'];
const URL_APP = 'https://addrimacas.github.io/surf-app/';
const VAPID_PUBLICA = 'BI-Zfa1OCC9DmZoHGIhOdFlmhq90YVMa0Dzc7602M9viuwObuKM12-qKoBoSZ6QaZIHwWZuV3OWA5S78f0TPxn8';
const MAX_BYTES = 30000;

function cors(origen) {
  return {
    'Access-Control-Allow-Origin': ORIGENES.includes(origen) ? origen : ORIGENES[0],
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin',
  };
}
const json = (obj, status, origen) => new Response(JSON.stringify(obj), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors(origen) },
});
const texto = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : null) || null;

// ─────────────────────────────────────────────── Web Push (VAPID, sin contenido)
const b64url = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64urlTexto = s => b64url(new TextEncoder().encode(s));
async function jwtVapid(endpoint, env) {
  const jwk = JSON.parse(env.VAPID_PRIVATE_JWK);
  const clave = await crypto.subtle.importKey('jwk', { ...jwk, key_ops: ['sign'] }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const cab = b64urlTexto(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const datos = b64urlTexto(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: URL_APP }));
  const firma = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, clave, new TextEncoder().encode(cab + '.' + datos));
  return cab + '.' + datos + '.' + b64url(firma);
}
async function empujar(endpoint, env) {
  const jwt = await jwtVapid(endpoint, env);
  const r = await fetch(endpoint, {
    method: 'POST',
    headers: { TTL: '86400', Urgency: 'normal', Authorization: `vapid t=${jwt}, k=${VAPID_PUBLICA}`, 'Content-Length': '0' },
  });
  return r.status;
}
async function crearAviso(env, dispositivo, a) {
  const res = await env.DB.prepare(`INSERT OR IGNORE INTO avisos (dispositivo, playa, objetivo, titulo, cuerpo, url, creado) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`)
    .bind(dispositivo, a.playa ?? null, a.objetivo ?? null, a.titulo, a.cuerpo, a.url ?? URL_APP, new Date().toISOString()).run();
  if (!res?.meta || res.meta.changes === 0) return false;   // ya avisado para esa playa y día
  const s = await env.DB.prepare(`SELECT endpoint FROM suscripciones WHERE dispositivo = ?1 AND activa = 1`).bind(dispositivo).first();
  if (!s) return false;
  const st = await empujar(s.endpoint, env);
  if (st === 404 || st === 410) await env.DB.prepare(`UPDATE suscripciones SET activa = 0 WHERE dispositivo = ?1`).bind(dispositivo).run();
  return st >= 200 && st < 300;
}

// ─────────────────────────────────────────────── «Se repite tu sesión»
const difAng = (a, b) => { const d = Math.abs(((a - b) % 360 + 360) % 360); return Math.min(d, 360 - d); };
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fmtFecha = iso => { const [a, m, d] = iso.split('-').map(Number); return `${d} ${MESES[m - 1]}`; };

// ¿Se parece la hora prevista f a la sesión s? (mismo mar de fondo y viento que no estropee)
function parecido(f, s) {
  if ([f.h, f.t, f.dir, s.hTotal, s.tTotal, s.dirTotal].some(v => v == null || Number.isNaN(v))) return false;
  if (difAng(f.dir, s.dirTotal) > 25) return false;
  const ratio = f.h / s.hTotal;
  if (ratio < 0.75 || ratio > 1.33) return false;
  if (Math.abs(f.t - s.tTotal) > 2) return false;
  if (f.vel != null && s.vientoVel != null) {
    if (f.vel > Math.max(12, s.vientoVel + 8)) return false;
    if (f.vel >= 12 && s.vientoDir != null && difAng(f.vdir, s.vientoDir) > 45) return false;
  }
  return true;
}
async function previsionHoraria(c) {
  const mar = await (await fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${c.mar.lat}&longitude=${c.mar.lon}`
    + `&hourly=wave_height,wave_period,wave_direction&models=meteofrance_wave&forecast_days=4&timezone=Europe%2FMadrid`)).json();
  const vie = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${c.viento.lat}&longitude=${c.viento.lon}`
    + `&hourly=wind_speed_10m,wind_direction_10m&forecast_days=4&timezone=Europe%2FMadrid`)).json();
  const idx = new Map((vie.hourly?.time || []).map((t, i) => [t, i]));
  return (mar.hourly?.time || []).map((hora, i) => {
    const j = idx.get(hora);
    return { hora, h: mar.hourly.wave_height[i], t: mar.hourly.wave_period[i], dir: mar.hourly.wave_direction[i],
      vel: j != null ? vie.hourly.wind_speed_10m[j] : null, vdir: j != null ? vie.hourly.wind_direction_10m[j] : null };
  });
}
// Mejor ventana parecida (≥ 2 horas seguidas, 7–20 h, de mañana a 3 días vista; hoy solo si quedan horas)
function buscarVentana(horas, s, ahoraISO) {
  let mejor = null, racha = [];
  for (const f of horas) {
    const h = +f.hora.slice(11, 13);
    const ok = f.hora > ahoraISO && h >= 7 && h <= 20 && parecido(f, s);
    if (ok) racha.push(f); else racha = [];
    if (racha.length >= 2 && !mejor) mejor = racha[0];
  }
  return mejor;
}
async function revisarRepeticiones(env, soloDispositivo = null) {
  const subs = soloDispositivo
    ? (await env.DB.prepare(`SELECT dispositivo FROM suscripciones WHERE activa = 1 AND dispositivo = ?1`).bind(soloDispositivo).all()).results
    : (await env.DB.prepare(`SELECT dispositivo FROM suscripciones WHERE activa = 1`).all()).results;
  const ahoraISO = new Date(Date.now() + 2 * 3600e3).toISOString().slice(0, 16);   // aprox. hora local
  const cache = new Map();
  let enviados = 0;
  for (const { dispositivo } of subs) {
    const vals = (await env.DB.prepare(`SELECT playa, fecha, nota, prediccion FROM valoraciones WHERE dispositivo = ?1 AND nota >= 7 ORDER BY fecha DESC LIMIT 20`)
      .bind(dispositivo).all()).results;
    for (const v of vals) {
      let p; try { p = JSON.parse(v.prediccion || '{}'); } catch { continue; }
      const s = p.datos, c = p.coords;
      if (!s || !c?.mar || !c?.viento) continue;
      const clave = `${c.mar.lat},${c.mar.lon}|${c.viento.lat},${c.viento.lon}`;
      if (!cache.has(clave)) { try { cache.set(clave, await previsionHoraria(c)); } catch { cache.set(clave, []); } }
      const f = buscarVentana(cache.get(clave), s, ahoraISO);
      if (!f) continue;
      const dia = f.hora.slice(0, 10), hora = +f.hora.slice(11, 13);
      const ds = DIAS[new Date(dia + 'T12:00:00Z').getUTCDay()];
      const ok = await crearAviso(env, dispositivo, {
        playa: v.playa, objetivo: dia,
        titulo: `${v.playa}: se repite un mar que te gustó`,
        cuerpo: `${ds} ${fmtFecha(dia)} desde las ${hora}h, parecido a tu sesión del ${fmtFecha(v.fecha)} (le diste un ${v.nota}).`,
        url: URL_APP + '?playa=' + encodeURIComponent(v.playa),
      });
      if (ok) enviados++;
      break;   // como mucho un aviso por persona y revisión
    }
  }
  return enviados;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const origen = req.headers.get('Origin') || '';
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origen) });
    try {
      if (req.method === 'GET' && url.pathname === '/v1/exportar') {
        const auth = req.headers.get('Authorization') || '';
        if (!env.EXPORT_TOKEN || auth !== 'Bearer ' + env.EXPORT_TOKEN) return json({ error: 'no autorizado' }, 401, origen);
        const tabla = url.searchParams.get('tabla') === 'comentarios' ? 'comentarios' : 'valoraciones';
        const { results } = await env.DB.prepare(`SELECT * FROM ${tabla} ORDER BY id`).all();
        return json({ tabla, filas: results }, 200, origen);
      }
      if (req.method !== 'POST') return json({ error: 'no encontrado' }, 404, origen);
      const cuerpo = await req.text();
      if (cuerpo.length > MAX_BYTES) return json({ error: 'demasiado grande' }, 413, origen);
      let d;
      try { d = JSON.parse(cuerpo); } catch { return json({ error: 'JSON no válido' }, 400, origen); }

      // El service worker del móvil no manda Origin: esta ruta solo devuelve el texto de su propio aviso
      if (url.pathname === '/v1/aviso') {
        const endpoint = texto(d.endpoint, 1000);
        const s = endpoint && await env.DB.prepare(`SELECT dispositivo FROM suscripciones WHERE endpoint = ?1`).bind(endpoint).first();
        if (!s) return json({ error: 'desconocido' }, 404, origen);
        const a = await env.DB.prepare(`SELECT id, titulo, cuerpo, url FROM avisos WHERE dispositivo = ?1 ORDER BY id DESC LIMIT 1`).bind(s.dispositivo).first();
        if (!a) return json({ titulo: 'Salitre', cuerpo: 'Hay novedades en tus playas.', url: URL_APP }, 200, origen);
        await env.DB.prepare(`UPDATE avisos SET entregado = ?1 WHERE id = ?2`).bind(new Date().toISOString(), a.id).run();
        return json(a, 200, origen);
      }

      if (!ORIGENES.includes(origen)) return json({ error: 'origen no permitido' }, 403, origen);
      const dispositivo = texto(d.dispositivo, 64);
      if (!dispositivo) return json({ error: 'falta dispositivo' }, 400, origen);
      const ahora = new Date().toISOString();

      if (url.pathname === '/v1/valoracion') {
        const nota = Number(d.nota);
        const playa = texto(d.playa, 80), fecha = texto(d.fecha, 10);
        if (!playa || !/^\d{4}-\d{2}-\d{2}$/.test(fecha || '') || !Number.isInteger(nota) || nota < 1 || nota > 10)
          return json({ error: 'datos no válidos' }, 400, origen);
        const coincidio = ['si', 'mas_grande', 'mas_pequena'].includes(d.coincidio) ? d.coincidio : null;
        await env.DB.prepare(`INSERT INTO valoraciones (recibida, dispositivo, playa, fecha, nota, coincidio, perfil, comentario, prediccion, alias)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
            ON CONFLICT (dispositivo, playa, fecha) DO UPDATE SET recibida = ?1, nota = ?5, coincidio = ?6, perfil = ?7, comentario = ?8, prediccion = ?9, alias = ?10`)
          .bind(ahora, dispositivo, playa, fecha, nota, coincidio, texto(d.perfil, 20), texto(d.comentario, 2000),
                d.prediccion ? JSON.stringify(d.prediccion).slice(0, 20000) : null, texto(d.alias, 60)).run();
        return json({ ok: true }, 200, origen);
      }
      if (url.pathname === '/v1/comentario') {
        const t = texto(d.texto, 4000);
        if (!t) return json({ error: 'comentario vacío' }, 400, origen);
        await env.DB.prepare(`INSERT INTO comentarios (recibida, dispositivo, texto, playa, contacto, version_app, navegador, alias)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`)
          .bind(ahora, dispositivo, t, texto(d.playa, 80), texto(d.contacto, 200), texto(d.version_app, 40),
                texto(req.headers.get('User-Agent'), 300), texto(d.alias, 60)).run();
        return json({ ok: true }, 200, origen);
      }
      if (url.pathname === '/v1/suscripcion') {
        const endpoint = texto(d.endpoint, 1000);
        if (!endpoint || !/^https:\/\//.test(endpoint)) return json({ error: 'suscripción no válida' }, 400, origen);
        await env.DB.prepare(`INSERT INTO suscripciones (dispositivo, endpoint, creada, activa) VALUES (?1, ?2, ?3, 1)
            ON CONFLICT (dispositivo) DO UPDATE SET endpoint = ?2, creada = ?3, activa = 1`).bind(dispositivo, endpoint, ahora).run();
        return json({ ok: true }, 200, origen);
      }
      if (url.pathname === '/v1/baja') {
        await env.DB.prepare(`UPDATE suscripciones SET activa = 0 WHERE dispositivo = ?1`).bind(dispositivo).run();
        return json({ ok: true }, 200, origen);
      }
      if (url.pathname === '/v1/probar-aviso') {
        if (!env.VAPID_PRIVATE_JWK) return json({ error: 'falta la clave de avisos en el servidor' }, 500, origen);
        const s = await env.DB.prepare(`SELECT endpoint FROM suscripciones WHERE dispositivo = ?1 AND activa = 1`).bind(dispositivo).first();
        if (!s) return json({ error: 'avisos no activados en este móvil' }, 400, origen);
        await env.DB.prepare(`INSERT INTO avisos (dispositivo, titulo, cuerpo, url, creado) VALUES (?1, ?2, ?3, ?4, ?5)`)
          .bind(dispositivo, 'Salitre: aviso de prueba', 'Si ves esto, los avisos funcionan en tu móvil.', URL_APP, ahora).run();
        const st = await empujar(s.endpoint, env);
        // además, revisa ya si hay un mar parecido a tus sesiones buenas
        const enviados = await revisarRepeticiones(env, dispositivo);
        return json({ ok: st >= 200 && st < 300, estado_push: st, avisos_repeticion: enviados }, 200, origen);
      }
      return json({ error: 'no encontrado' }, 404, origen);
    } catch (e) {
      return json({ error: 'error interno' }, 500, origen);
    }
  },

  async scheduled(evento, env, ctx) {
    if (!env.VAPID_PRIVATE_JWK) return;
    ctx.waitUntil(revisarRepeticiones(env));
  },
};
