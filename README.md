# Salitre

App de condiciones de surf para la costa gallega. Usa la API pública
[Open-Meteo Marine](https://open-meteo.com/en/docs/marine-weather-api) y
[Leaflet](https://leafletjs.com/) + CartoDB/Esri para el mapa.

## Motor de cálculo v1.1 (oct 2026)

Resultado de la consulta a Claude, ChatGPT, Gemini y Copilot (documento «Salitre — Consulta multi-IA»).

1. **Oleaje offshore**: cada playa pide la previsión en un punto de mar abierto fijo (`atlas-playas.js`),
   con el modelo fijado `meteofrance_wave` y todas las particiones (swell, swell secundario, mar de viento).
   El viento y el tiempo se piden en la propia playa.
2. **Transferencia direccional K(θ, T)** por playa (atlas, calculado offline con la costa GSHHG):
   cuánta energía de cada dirección y período llega a la playa, con entrada indirecta por refracción
   y difracción aproximadas y una atenuación global por recorrido dentro de rías.
3. **Altura de rompiente Hb** (Komar-Gaughan) con todas las particiones.
4. **Nota entera 1–10** = 1 + 9 · tamaño · superficie · cruce · marea, con topes de seguridad por nivel
   y una evaluación de baño separada. Confianza por perturbación (alta / media / baja).
5. **Valoraciones post-sesión** guardadas con la predicción completa (de momento en el dispositivo).

Interruptor: abrir la app con `?motor=v0` vuelve al motor anterior (se recuerda); `?motor=v1` lo reactiva.
Si la API rechaza la petición nueva, la app repite la antigua y usa el motor anterior.

## Estructura

```
index.html           App completa (HTML + CSS + JS inline).
beach-data.js        Catálogo de spots con coords, orientación, tolerancia
                     y datos ideales (swell, viento, alturas, exposición…).
atlas-playas.js      GENERADO: punto offshore, normal y tabla K²(θ,T) de cada playa.
motor-v1.js          Motor de evaluación v1.1 (navegador y Node).
data/                Costa GSHHG de Galicia y atlas completo (con distancias por rayo).
docs/atlas-revision.html  Gráficos polares de exposición de las 60 playas.
registro/            Previsiones diarias guardadas por la GitHub Action (para validar).
panel/               Hojas y notas del panel ciego (se crea con npm run panel:preparar).
tests/               npm test (cordura del motor y del panel) · npm run test:app (app sin red).
manifest.json        PWA — iconos en la raíz (icon-192.png, icon-512.png).
scripts/
  calcular-atlas.js               Genera atlas-playas.js (npm run atlas). ~5 s, sin red.
  extraer-costa-gshhs.py          Regenera data/costa-galicia-gshhs-f.geojson desde GSHHG.
  registrar-prevision.js          Registro diario de previsiones (lo ejecuta la GitHub Action).
  panel-ciego-preparar.js         Prepara la hoja del panel ciego (npm run panel:preparar).
  panel-ciego-evaluar.js          Evalúa las hojas rellenas (npm run panel:evaluar hoja1.csv …).
  verificar-coords.js             Valida coords contra OSM (lee beach-data.js).
  calcular-exposicion-v2.js       Modelo 7 factores GEBCO → campo exposicion.
  calcular-exposicion-v3.js       Mismo motor que v2; salida etiquetada v3 / localStorage v3.
  calcular-orientacion-v3.js      Un ángulo vía rayos + Natural Earth (ne_10m_land.geojson).
  calcular-orientacion-curva.js   Curva exposure_curve(θ): orientación principal, ventana útil,
                                   exposureScore; paralelo al modelo «un número». Opciones:
                                   --solo=Nombre --json --no-curve · env SALITRE_CURVE_STEP,
                                   SALITRE_CURVE_STEP_KM (por defecto 5° y 1 km).
  experiments/orientacion/         Laboratorio: varios perfiles y compare-matrix.js sin tocar
                                   los scripts anteriores (ver README dentro de esa carpeta).
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
