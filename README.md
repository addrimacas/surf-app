# Salitre

App de condiciones de surf para la costa gallega. Usa la API pública
[Open-Meteo Marine](https://open-meteo.com/en/docs/marine-weather-api) y
[Leaflet](https://leafletjs.com/) + CartoDB/Esri para el mapa.

## Motor de cálculo (motor-v1.js, versión en `MotorV1.VERSION`)

Un solo motor para toda la app (pantalla principal, lista, mapa, «¿Dónde vamos?», previsión). Las mismas
reglas en las 60 playas: no hay correcciones a mano por playa.

1. **Oleaje en mar abierto**: cada playa pide la previsión en un punto fijo de mar abierto (`atlas-playas.js`)
   con el modelo `meteofrance_wave` y todas las particiones (swell, swell secundario, mar de viento).
   Período de pico estimado: Tp ≈ 1,2·Tm (swell) y 1,3·Tm (mar de viento). Viento y tiempo, en la playa.
2. **Costa** — transferencia direccional K(θ, T) (atlas, costa GSHHG): cuánta energía de cada dirección
   y período llega, con la sombra de cabos e islas y la atenuación dentro de rías.
3. **Fondo** — `atlas-batimetria.js` (EMODnet ~115 m, trazado de rayos hasta la isobata de 10 m):
   refracción sobre el fondo real (rayos refractados / mismos rayos en línea recta, para no contar dos
   veces la sombra de la costa) y fricción de fondo de arena (f = 0,015) hasta 3 m de profundidad.
4. **Altura de rompiente Hb** (Komar-Gaughan) sumando las particiones.
5. **Nota 1–10**: Q = tamaño × forma^0,33 · limpieza^0,33 · fuerza^0,2 · marea^0,14, convertida en nota
   con umbrales de un año de climatología (`calibracion-nota.js`, se regenera solo en cada cambio del motor).
   - Lo que falla manda: un componente por debajo de 0,6 limita la nota.
   - Un 10 exige todos los componentes ≥ 0,95; un 9, ≥ 0,85.
   - Techo por viento: con viento de mar ≥10 km/h máx. 6, ≥15 máx. 4, ≥25 máx. 3; cruzado ≥10 máx. 8.
   - Topes de seguridad por nivel (tamaño, mar de fondo largo, tormenta eléctrica).
6. **Ventana de swell** de cada playa (`ventanaSwell`): calculada con la costa, el fondo y la forma de
   rotura; es la que enseña la app como «swell ideal» y la brújula de la guía.
7. **Valoraciones, comentarios y avisos** de la beta: Cloudflare Worker + D1 (`worker-beta/`).

## Estructura

```
index.html           App completa (HTML + CSS + JS inline).
beach-data.js        Catálogo de playas: nombre, coordenadas, zona, puerto de mareas y tipo de rompiente.
                     Los campos antiguos de orientación e «ideales» escritos a mano ya no se usan;
                     queda uno: la marea preferida (`mareaOptima`), de peso pequeño en la nota,
                     pendiente de sustituir por un cálculo con el fondo y las valoraciones.
atlas-playas.js      GENERADO: punto offshore, normal y tabla K²(θ,T) de cada playa.
motor-v1.js          Motor de evaluación (navegador y Node).
atlas-batimetria.js  GENERADO: refracción y fricción por playa (scripts/batimetria/, workflow batimetria).
calibracion-nota.js  GENERADO: umbrales de la nota por nivel (workflow calibrar-escala).
data/                Costa GSHHG de Galicia y atlas completo (con distancias por rayo).
docs/atlas-revision.html  Gráficos polares de exposición de las 60 playas.
registro/            Previsiones diarias guardadas por la GitHub Action (para validar).
panel/               Hojas y notas del panel ciego (se crea con npm run panel:preparar).
tests/               npm test (motor, coherencia, panel y servicio beta) ·
                     npm run test:navegador (la app en Chromium con datos simulados y averías).
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

## Pruebas

```bash
npm test                 # motor, coherencia entre playas, guía ↔ motor, servicio beta
npm run test:navegador   # la app en Chromium: carga, notas coherentes, mareas, averías, mapa, guía
```

Las dos se ejecutan en cada push (workflow «Pruebas»).
