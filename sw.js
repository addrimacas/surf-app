// Service worker de Salitre: solo avisos (no guarda la app en caché).
// El aviso llega vacío; aquí se pide el texto al servicio de la beta y se muestra.
const API_BETA = 'https://salitre-beta.adrimacas.workers.dev';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('push', e => {
  e.waitUntil((async () => {
    let a = { titulo: 'Salitre', cuerpo: 'Hay novedades en tus playas.', url: './' };
    try {
      const s = await self.registration.pushManager.getSubscription();
      const r = await fetch(API_BETA + '/v1/aviso', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: s?.endpoint }) });
      if (r.ok) a = await r.json();
    } catch (err) {}
    await self.registration.showNotification(a.titulo, { body: a.cuerpo, icon: 'icon-192.png', badge: 'icon-192.png', data: { url: a.url || './' } });
  })());
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.openWindow(e.notification.data?.url || './'));
});
