// Cloudflare Worker «salitre-beta»: recoge valoraciones y comentarios de la beta en una base D1.
// Necesita: una base D1 enlazada con el nombre DB y un secreto EXPORT_TOKEN (para descargar los datos).
//   POST /v1/valoracion   {dispositivo, playa, fecha, nota, coincidio, perfil, comentario, prediccion}
//   POST /v1/comentario   {dispositivo, texto, playa, contacto, version_app}
//   GET  /v1/exportar?tabla=valoraciones|comentarios   (cabecera Authorization: Bearer <EXPORT_TOKEN>)
const ORIGENES = ['https://addrimacas.github.io', 'http://localhost:8765'];
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
      if (!ORIGENES.includes(origen)) return json({ error: 'origen no permitido' }, 403, origen);

      const cuerpo = await req.text();
      if (cuerpo.length > MAX_BYTES) return json({ error: 'demasiado grande' }, 413, origen);
      let d;
      try { d = JSON.parse(cuerpo); } catch { return json({ error: 'JSON no válido' }, 400, origen); }
      const dispositivo = texto(d.dispositivo, 64);
      if (!dispositivo) return json({ error: 'falta dispositivo' }, 400, origen);
      const ahora = new Date().toISOString();

      if (url.pathname === '/v1/valoracion') {
        const nota = Number(d.nota);
        const playa = texto(d.playa, 80), fecha = texto(d.fecha, 10);
        if (!playa || !/^\d{4}-\d{2}-\d{2}$/.test(fecha || '') || !Number.isInteger(nota) || nota < 1 || nota > 10)
          return json({ error: 'datos no válidos' }, 400, origen);
        const coincidio = ['si', 'mas_grande', 'mas_pequena'].includes(d.coincidio) ? d.coincidio : null;
        await env.DB.prepare(`INSERT INTO valoraciones (recibida, dispositivo, playa, fecha, nota, coincidio, perfil, comentario, prediccion)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
            ON CONFLICT (dispositivo, playa, fecha) DO UPDATE SET recibida = ?1, nota = ?5, coincidio = ?6, perfil = ?7, comentario = ?8, prediccion = ?9`)
          .bind(ahora, dispositivo, playa, fecha, nota, coincidio, texto(d.perfil, 20), texto(d.comentario, 2000),
                d.prediccion ? JSON.stringify(d.prediccion).slice(0, 20000) : null).run();
        return json({ ok: true }, 200, origen);
      }
      if (url.pathname === '/v1/comentario') {
        const t = texto(d.texto, 4000);
        if (!t) return json({ error: 'comentario vacío' }, 400, origen);
        await env.DB.prepare(`INSERT INTO comentarios (recibida, dispositivo, texto, playa, contacto, version_app, navegador)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`)
          .bind(ahora, dispositivo, t, texto(d.playa, 80), texto(d.contacto, 200), texto(d.version_app, 40),
                texto(req.headers.get('User-Agent'), 300)).run();
        return json({ ok: true }, 200, origen);
      }
      return json({ error: 'no encontrado' }, 404, origen);
    } catch (e) {
      return json({ error: 'error interno' }, 500, origen);
    }
  },
};
