# Salitre

App de condiciones de surf para la costa gallega. Usa la API pública
[Open-Meteo Marine](https://open-meteo.com/en/docs/marine-weather-api) y
[Leaflet](https://leafletjs.com/) + CartoDB/Esri para el mapa.

## Estructura

```
index.html           App completa (HTML + CSS + JS inline).
beach-data.js        Catálogo de spots con coords, orientación, tolerancia
                     y datos ideales (swell, viento, alturas, exposición…).
manifest.json        PWA — iconos en la raíz (icon-192.png, icon-512.png).
scripts/
  verificar-coords.js           Valida coords contra OSM (lee beach-data.js).
  calcular-exposicion-v2.js     Modelo 7 factores GEBCO → campo exposicion.
  calcular-exposicion-v3.js     Mismo motor que v2; salida etiquetada v3 / localStorage v3.
```

## Ejecutar la app

Hay que servirla por HTTP (`file://` no sirve para cargar scripts/datos):

```bash
python3 -m http.server 8000
# luego abrir http://localhost:8000
```

O con Node:

```bash
npx serve .
```

## Validar coordenadas contra OpenStreetMap

Usa la Overpass API para buscar playas `natural=beach` cerca de cada punto en **beach-data.js**.

```bash
node scripts/verificar-coords.js
```

Reporta:

- `✓ ok` → match a menos de 2 km.
- `⚠ lejos` → 2–10 km, revisar.
- `✗ muy-lejos` → > 10 km, casi seguro hay que corregir.
- `? sin-match` → OSM no tiene una playa con ese nombre cerca.

Al final lista las playas a corregir con las coords de OSM como sugerencia.

Requiere Node 18+ (fetch nativo). Sin dependencias npm para este script.

## Modelo de pronóstico

Open-Meteo devuelve oleaje en mar abierto (altura significativa, período,
dirección). La app lo cruza con los metadatos de cada playa (`orient`, `tol`)
en `clasificarReal()`: si el swell viene fuera del rango `orient ± tol`, el
semáforo es rojo aunque haya ola. Dentro del rango, clasifica por altura.

Pendiente (no implementado aún): cruzar con viento local (offshore/onshore)
y marea.
