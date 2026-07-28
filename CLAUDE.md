# Salitre — surf-app

PWA de previsión de surf para playas de Galicia. Stack: HTML+CSS+JS vanilla, GitHub Pages, Open-Meteo Marine (olas), Open-Meteo (tiempo), IHM via Cloudflare Worker salitre-mareas.adrimacas.workers.dev (mareas), Leaflet+OSM (mapa). 60 playas en 5 zonas en beach-data.js. Toda la lógica y UI en index.html (~2900+ líneas). Doc de planificación en /docs.

## Reglas de trabajo
- Lee siempre el código real antes de proponer o hacer cambios. Nunca inventes datos sobre playas o comportamiento del código.
- Verifica sintaxis JS con node antes de cualquier commit.
- Commit y push directo a main. Nunca crees ramas.
- Tag de seguridad para rollback: v-seguridad-20260604
- Textos de la app: siempre condicionales y sin exclamaciones, nunca asertivos.

## Constantes técnicas críticas
- IHM devuelve hora local española, NO UTC. Interpolación de marea requiere 3 días con offsets −1440/0/+1440 min.
- Fechas: usar getFullYear/getMonth/getDate (hora local), NUNCA toISOString() (devuelve UTC, día erróneo en España hasta las 02:00).
- Sectores de viento: OFFSHORE ±20°, CROSS-OFF 20–55°, CROSS 55–100°, CROSS-ON 100–140°, ONSHORE >140°.
