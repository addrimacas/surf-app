# Tareas pendientes — Salitre

## Pendiente revisión
- [ ] **Condiciones ideales por playa** — swell, viento, hMin/hMax, pMin están mal en varias playas. Revisar playa por playa con conocimiento local.
- [ ] **Valoraciones post-sesión** — diseño e implementación pendiente para más adelante (Fase 1.5).

## Pendiente técnico
- [ ] **Exposición en beach-data** — ejecutar `calcular-exposicion-v3.js` cuando toque revisión GEBCO; pendiente aparte un modelo multi-direccional más fino (antes pensado como «v4»)
- [ ] **Bug 4 throttle** — ya commiteado, verificar en producción
- [ ] **Popup mapa** — añadir puntuación, flecha swell, botón "Ver playa"
- [ ] **Previsión viento** — en previsión y mejores olas cerca se pasa null para dirViento/velViento porque la marine API no da viento horario. Buscar solución.

## Ideas pendientes de diseño
- [ ] **Tarjetas pulsables** — Swell, Viento, Marea y Tiempo expandibles al pulsar. Mostrar previsión del día completo de cada variable en un modal o expansión inline. Sin salir de la pantalla de inicio.
- [ ] **Tarjeta Cielo — fondo de vídeo dinámico** — reemplazar icono SVG por vídeo corto en loop (3-5s, WebM/MP4). Un clip por condición: despejado día, despejado noche, nublado, lluvia, tormenta, niebla. Conseguir clips de stock gratuito (Pexels/Pixabay). Lógica: mapear código WMO de Open-Meteo a clip correspondiente. ~8 clips × ~700KB = ~6MB cacheados.
- [ ] **Tab Playas** — pantalla nueva. 4 tabs: Inicio/Playas/Mapa/Guía. Tarjeta de playa activa en Inicio es pulsable → va a Playas. Vista detalle por horas tipo Surf-Forecast con fila "ideal" encima de "actual" para mar y viento. Cuadro en blanco reservado para foto/imagen de la playa (pendiente).
