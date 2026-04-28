# Laboratorio orientación / exposición angular (Galicia)

Este directorio **no sustituye** los scripts de `scripts/` raíz (`calcular-orientacion-v3.js`, `calcular-orientacion-curva.js`, etc.). Aquí se **copian ideas**, se parametrizan y se comparan resultados para una costa difícil (rías, cabos, mecheros).

## Qué hay

| Ruta | Rol |
|------|-----|
| `lib/natural-earth.js` | Carga NE + bbox por polígono → `esTierra` |
| `lib/exposure-curve.js` | Rayos, curva `distance(θ)`, ventana útil, score |
| `lib/offshore-origin.js` | Desplaza el origen mar adentro en la dirección de máxima apertura rápida |
| `profiles-registry.js` | Lista de hipótesis numeradas (`baseline`, más alcance, offshore…) |
| `compare-matrix.js` | Ejecuta playas × perfiles y saca tabla agregada + JSON |
| `strategies/osm-coastline-placeholder.js` | Ancla para futura máscara OSM |

## Uso rápido

Desde la raíz del repo (`surf-app/`):

```bash
node scripts/experiments/orientacion/compare-matrix.js --limit=10
node scripts/experiments/orientacion/compare-matrix.js --solo=Riazor
node scripts/experiments/orientacion/compare-matrix.js --profiles=baseline-5deg-1km-25km,offshore-nudge-5deg-1km-25km
node scripts/experiments/orientacion/compare-matrix.js --json > experiments/orient-resultados.json
```

Requiere `scripts/ne_10m_land.geojson` (igual que el resto de scripts de orientación).

## Cómo escalar la investigación

1. **Nuevo perfil** → edita `profiles-registry.js` (un objeto más).
2. **Nuevo detector de tierra** → nueva función `esTierra` + nuevo archivo en `strategies/` y perfil que la use (cuando exista OSM).
3. **Interpretación** → mira `meanDiffDeg` / `within30` por perfil respecto a `orient` en `beach-data.js` (referencia manual, no verdad absoluta).

Los números altos en tiempo (`ms`) son normales con NE fino; optimización posterior (índice espacial, workers) puede ir en otro experimento sin tocar este árbol.

## Pipeline hasta la app (lista para usar)

1. **Export sugerencias** (sin modificar `beach-data.js` todavía):
   ```bash
   node scripts/experiments/orientacion/emit-beach-sectors.js --solo=NombrePlaya
   node scripts/experiments/orientacion/emit-beach-sectors.js --limit=20 > scripts/experiments/orientacion/sugerencias.json
   ```
1b. **Lote completo → `beach-data.js`** (tarda ~25 min las 51 playas; hace backup `.bak`):
   ```bash
   node scripts/experiments/orientacion/apply-sectors-to-beach-data.js --dry-run   # escribe beach-data.preview.js
   node scripts/experiments/orientacion/apply-sectors-to-beach-data.js --write      # sobrescribe beach-data.js
   ```
2. **Revisión humana**: contrastar `orientComputed` / arco con mapa y conocimiento local (Galicia castiga errores de máscora NE).
3. **Volcar en catálogo**: si preferís control manual, pegáis desde `emit-beach-sectors`.
   Si ejecutaste **`apply-sectors-to-beach-data.js --write`**, el paso ya está hecho en masa (revisad mapa igualmente).
4. **La app ya interpreta**: `index.html` aplica `diffSwellRespectoPlaya()` — swell fuera del arco penaliza fuerte; dentro sigue midiendo vs `orient` y `tol`.

Sin esos campos opcionales, el comportamiento es el de siempre (solo `orient` + `tol`).
