# Clasificación definitiva de exposición — Salitre
# Fecha: 2026-04-29
# Fuentes: surf-forecast.com, surfline.com, surfatlas.com, surfsphere.com, wildsuits.eu, escueladesurfsopelana.com
#
# METODOLOGÍA:
# factorSombra (0.0–1.0): fracción del swell atlántico offshore que realmente llega a la playa.
# Se calcula cruzando:
#   1. Categoría de surf-forecast (exposed / fairly exposed / sheltered / very sheltered)
#   2. Geometría costera (rías, cabos, islas protectoras)
#   3. Orientación real vs dirección dominante del Atlántico NW-NO
#   4. Datos cuantitativos: % tiempo con olas limpias en mejor mes (surf-forecast stats)
#
# ESCALA:
#   0.90–1.00 = exposed, sin obstáculos, recibe swell a plena potencia
#   0.75–0.89 = fairly exposed, alguna protección menor
#   0.50–0.74 = semi-expuesta, orientación no ideal o algo de sombra
#   0.25–0.49 = fairly sheltered, necesita mar decente para funcionar
#   0.10–0.24 = very sheltered, solo con maretón serio
#
# CORRECCIONES RESPECTO AL beach-data.js ACTUAL:
# Las marcadas con [CAMBIO] difieren del valor actual de exposicion en beach-data.js

## ─── RÍAS BAIXAS ────────────────────────────────────────────────────────────

# Patos | exp actual: 0.20
# surf-forecast: "fairly exposed, unreliable, swell NW, offshore SSO"
# wildsuits: "needs substantial swells 2-10m NW, sheltered from open ocean"
# surfatlas: "one of best spots in country, proximity to Cíes filters swell"
# Islas Cíes hacen sombra parcial. NW potente dobla las islas y llega.
# 48% olas limpias en diciembre (surf-forecast) → no es tan protegida como el 0.20 actual
# [CAMBIO] factorSombra: 0.45

# Prado | exp actual: 0.20
# Más al interior que Patos. Sin datos directos.
# Por posición geográfica: más protegida que Patos, similar a Vao.
# factorSombra: 0.20 ✓ (mantener)

# Vao | exp actual: 0.22
# surfmarket: "muy resguardada, solo con grandes marejadas invernales"
# Confirmado protegida. 0.22 es correcto.
# factorSombra: 0.20 ✓ (ajustar ligeramente)

# Samil | exp actual: 0.35
# surfatlas: "shelter cast by Atlantic Islands means it's never big, lake in summer"
# Dentro de la ría de Vigo, muy protegida por Cíes. Peor que Patos.
# [CAMBIO] factorSombra: 0.20

# Nerga | exp actual: 0.30
# surf-forecast: "sheltered, swell SW, unreliable, 10% limpias en febrero (mejor mes)"
# 10% es el peor dato de toda la lista. Muy protegida, punta de la ría.
# [CAMBIO] factorSombra: 0.20

# Melide | exp actual: 0.32
# Punta exterior de la ría de Vigo. Arco muy amplio (190→355°).
# Sin datos directos pero posición geográfica apunta a semi-expuesta.
# factorSombra: 0.45 [CAMBIO desde 0.32]

# Caneliñas | exp actual: 0.38
# Arco estrecho (205→230°, 25°). Muy selectiva con el swell.
# Semi-protegida, bahía pequeña.
# factorSombra: 0.35 [CAMBIO desde 0.38 — arco estrecho penaliza]

# Canelas | exp actual: 0.36
# Arco 195→280° (85°). Más abierta que Caneliñas.
# factorSombra: 0.40 [CAMBIO desde 0.36]

# Montalvo | exp actual: 0.50
# surfatlas: "potential for tubular shore breaks, good fall to spring, summers flat"
# Razonablemente expuesta al SO. El 0.50 actual es correcto.
# factorSombra: 0.50 ✓

# Foxos | exp actual: 0.65
# wildsuits: "can handle bigger waves than Lanzada, best swell N/NW/W"
# Más expuesta que Lanzada. El 0.65 actual parece correcto.
# factorSombra: 0.65 ✓

# Lanzada | exp actual: 0.75
# surf-forecast: "exposed, swell SW, todas las mareas"
# surfatlas: "finest all-level break, chest-high sets even small swells"
# escueladesurfsopelana: "works across most tides, turns on with NE breeze"
# Una de las más consistentes de Rías Baixas. El 0.75 actual es correcto.
# factorSombra: 0.80 [CAMBIO — ligeramente hacia arriba, es más expuesta de lo que teníamos]

## ─── COSTA DE BARBANZA ──────────────────────────────────────────────────────

# Vilar | exp actual: 0.40
# surfline tiene el spot pero sin datos accesibles.
# Posición: playa abierta en Costa de Barbanza, arco 210→290° (80°), sin obstáculos.
# Por geometría costera es más expuesta que el 0.40 actual.
# [CAMBIO] factorSombra: 0.75

# Ladeira | exp actual: 0.60
# surf-forecast: "fairly exposed, swell SW, offshore NE, dependable"
# factorSombra: 0.70 [CAMBIO ligero hacia arriba]

# Balieiros | exp actual: 0.62
# Arco muy amplio (160→5°, casi 205°). Costa de Barbanza abierta.
# factorSombra: 0.75 [CAMBIO]

# Seráns | exp actual: 0.65
# Similar a Balieiros. Arco 250→10° (120°). Expuesta.
# factorSombra: 0.75 [CAMBIO]

# Furnas | exp actual: 0.65
# surf-forecast (Río Sieira/Furnas): "exposed, swell W, offshore SE, quite reliable"
# factorSombra: 0.80 [CAMBIO — exposed confirmado]

# Río Sieira | exp actual: 0.65
# surf-forecast: "exposed, swell W, offshore SE, quite reliable, todas las mareas"
# Mismo spot que Furnas prácticamente.
# factorSombra: 0.80 [CAMBIO]

# Queiruga | exp actual: 0.70
# Sin datos directos. Posición similar a Furnas/Río Sieira.
# factorSombra: 0.78

# Baroña | exp actual: 0.65
# Arco 205→310° (105°). Expuesta al SO-O-NO.
# factorSombra: 0.75 [CAMBIO]

# Fonforrón | exp actual: 0.70
# Arco 225→285° (60°). Algo más selectiva.
# factorSombra: 0.72

# Aguieira | exp actual: 0.72
# Arco 285→35° (110°). Bien expuesta al NO-N.
# factorSombra: 0.75

## ─── COSTA DA MORTE ─────────────────────────────────────────────────────────

# Ancoradoiro | exp actual: 0.75
# Entrada de Costa da Morte. Arco 175→250° (75°). Expuesta al SO.
# factorSombra: 0.78

# Lariño | exp actual: 0.85
# Arco muy amplio 165→325° (160°). Enormemente expuesta.
# factorSombra: 0.85 ✓

# Carnota | exp actual: 0.90
# surf-forecast: "fairly exposed, swell NW, offshore NE, 44% limpias en marzo"
# Una de las más grandes y consistentes. El 0.90 parece algo alto para "fairly exposed".
# [CAMBIO] factorSombra: 0.82

# Mar de Fora | exp actual: 0.95
# National Geographic: "totalmente expuesta, olas rugiendo desde lejos"
# Finisterre, sin ninguna protección. 0.95 correcto.
# factorSombra: 0.92 [CAMBIO mínimo — ninguna playa merece 0.95, dejamos margen]

# Rostro | exp actual: 1.00
# La más expuesta de Galicia. Finisterre sur.
# factorSombra: 0.95 [CAMBIO — dejamos 0.95 como máximo real, 1.0 es teórico]

# Nemiña | exp actual: 0.95
# surf-forecast: "exposed, swell NW/O, offshore NE/SE"
# factorSombra: 0.90 ✓ (ajuste mínimo)

# Traba | exp actual: 0.80
# Arco 275→10° (95°). Expuesta al N-NO. Sin datos directos.
# factorSombra: 0.82

# Soesto | exp actual: 0.80
# Similar a Traba. factorSombra: 0.82

# Seaia | exp actual: 0.72
# Orient 43°, arco 0→90°. Mira al NE. Costa da Morte norte.
# factorSombra: 0.72 ✓

# Malpica | exp actual: 0.70
# Cabo Roncudo la protege parcialmente del NO más directo.
# factorSombra: 0.68

## ─── COSTA CORUÑESA ─────────────────────────────────────────────────────────

# Razo | exp actual: 0.81
# surf-forecast: "exposed, swell NW, offshore S, 53% limpias en diciembre"
# surfatlas: "trusty beach, long walls on medium swell"
# 53% en diciembre es de los mejores datos. Muy consistente.
# factorSombra: 0.85 [CAMBIO]

# Baldaio | exp actual: 0.75
# surf-forecast: exposed, swell NW. Laguna interior protege algo.
# factorSombra: 0.78

# Caión | exp actual: 0.68
# surf-forecast: exposed, swell NW. Orientación NO-N.
# factorSombra: 0.72 [CAMBIO ligero]

# Barrañán | exp actual: 0.65
# surf-forecast: "exposed, swell NW, offshore S, 53% limpias en diciembre"
# Igual de consistente que Razo. El 0.65 actual está bajo.
# [CAMBIO] factorSombra: 0.82

# Valcovo | exp actual: 0.60
# Sin datos directos. Entre Barrañán y Repibelo.
# factorSombra: 0.65 [CAMBIO ligero]

# Repibelo | exp actual: 0.58
# Similar a Valcovo. factorSombra: 0.62

# Sabón | exp actual: 0.55
# surf-forecast: "needs some sea, breakwater in outer port slows waves"
# El puerto de Langosteira atenúa significativamente. El 0.55 es correcto o alto.
# [CAMBIO] factorSombra: 0.50

# Orzán | exp actual: 0.50
# surfsphere: "relatively exposed, picks up swell from different directions"
# Playa urbana A Coruña. Algo protegida por la ciudad/cabo.
# factorSombra: 0.58 [CAMBIO — más expuesta de lo que teníamos]

# Riazor | exp actual: 0.45
# Más protegida que Orzán por la Torre de Hércules al norte.
# factorSombra: 0.50 [CAMBIO]

# Matadero | exp actual: 0.42
# Similar a Orzán pero más pequeña. factorSombra: 0.52 [CAMBIO]

# Santa Cristina | exp actual: 0.28
# surfsphere: "waves get smaller the more swell comes from western direction"
# Sur de la bahía de Valdoviño, bastante protegida.
# Arco muy estrecho (345→5°, solo 20°). Muy selectiva.
# factorSombra: 0.30 ✓

# Bastiagueiro | exp actual: 0.28
# surf-forecast: "VERY SHELTERED, solo 12% limpias en febrero (mejor mes)"
# Necesita 3-7.5m NW para funcionar bien. Dato más claro de toda la investigación.
# [CAMBIO] factorSombra: 0.18

## ─── FERROLTERRA ────────────────────────────────────────────────────────────

# Doniños | exp actual: 0.65
# surf-forecast: "exposed, swell WNW, offshore E, 43% limpias en septiembre"
# surfatlas: "2km bay, handles N and NW swells well"
# El 0.65 actual está muy bajo para una playa "exposed" con 43% de consistencia.
# [CAMBIO] factorSombra: 0.85

# San Jorge | exp actual: 0.68
# surf-forecast: exposed, swell NW. Similar a Doniños.
# factorSombra: 0.80 [CAMBIO]

# Santa Comba | exp actual: 0.70
# surf-forecast: exposed, swell NW. Más al norte que San Jorge.
# factorSombra: 0.80 [CAMBIO]

# Ponzos | exp actual: 0.72
# Surfline muestra 8-10ft cuando Doniños tiene 4-6ft → más expuesta que Doniños.
# surf-forecast: exposed, swell NW.
# [CAMBIO] factorSombra: 0.88

# Campelo | exp actual: 0.72
# surfsphere: "remote, picks up lot of swell from west, bigger and stronger than expected"
# factorSombra: 0.82 [CAMBIO]

# Valdoviño | exp actual: 0.75
# surfatlas: "classic north Galician setup, open beach, solid NW swell"
# factorSombra: 0.82 [CAMBIO]

# Pantín | exp actual: 0.78
# surf-forecast: "exposed, swell NW, offshore SE, 38% limpias en octubre"
# core surf: "recoge el más mínimo swell, surfeable todo el año"
# surfatlas: "funnels swell beautifully" — la geometría del cabo lo concentra.
# El 0.78 actual está BAJO. Es la referencia de Galicia.
# [CAMBIO] factorSombra: 0.92

# Vilarrube | exp actual: 0.70
# surf-forecast: "SHELTERED, only works during bigger swells"
# surfsphere: "very sheltered, only works bigger swells or medium for longboarders"
# El 0.70 actual es un ERROR GRAVE. Vilarrube es casi tan protegida como Bastiagueiro.
# [CAMBIO] factorSombra: 0.28

## ─── RÍAS ALTAS / MARIÑA LUCENSE ────────────────────────────────────────────

# A Concha | exp actual: 0.74
# Zona Ortegal. Orientada al N-NO. Sin datos directos.
# Por posición geográfica: bien expuesta al Cantábrico.
# factorSombra: 0.72 ✓

# San Antón | exp actual: 0.74
# Similar a A Concha. factorSombra: 0.72 ✓

# Sarridal | exp actual: 0.75
# Arco amplio 300→50° (110°). Bien expuesta.
# factorSombra: 0.74

# Bares | exp actual: 0.76
# Punta más septentrional de Galicia. Muy expuesta al N/NE.
# factorSombra: 0.78

# Esteiro | exp actual: 0.74
# Costa de Lugo. Orientada al N-NO. factorSombra: 0.73

# Peizás | exp actual: 0.72
# Arco 330→100° (130°). Expuesta. factorSombra: 0.73

# Rapadoira | exp actual: 0.71
# Similar a Peizás. factorSombra: 0.72

# San Cosme | exp actual: 0.71
# factorSombra: 0.72 ✓

# Reinante | exp actual: 0.70
# surfatlas: "not west-facing, less consistent, works with northerly or big wrap-around"
# Orientada al N, no al O. Menos consistente que las anteriores.
# [CAMBIO] factorSombra: 0.62

## ─── TABLA RESUMEN FINAL ────────────────────────────────────────────────────

# CAMBIOS RESPECTO A beach-data.js ACTUAL:
#
# Nombre         | Actual | Propuesto | Fuente principal
# ────────────────────────────────────────────────────────
# Patos          | 0.20   | 0.45      | surf-forecast "fairly exposed", 48% limpias dic
# Prado          | 0.20   | 0.20      | sin cambio
# Vao            | 0.22   | 0.20      | ajuste mínimo
# Samil          | 0.35   | 0.20      | surfatlas "never big, lake in summer"
# Nerga          | 0.30   | 0.20      | surf-forecast "sheltered, 10% limpias"
# Melide         | 0.32   | 0.45      | arco amplio, punta expuesta ría
# Caneliñas      | 0.38   | 0.35      | arco muy estrecho 25°
# Canelas        | 0.36   | 0.40      | arco 85°, algo más abierta
# Montalvo       | 0.50   | 0.50      | sin cambio
# Foxos          | 0.65   | 0.65      | sin cambio
# Lanzada        | 0.75   | 0.80      | surf-forecast "exposed", muy consistente
# Vilar          | 0.40   | 0.75      | playa abierta sin obstáculos, arco 80°
# Ladeira        | 0.60   | 0.70      | surf-forecast "fairly exposed"
# Balieiros      | 0.62   | 0.75      | arco 205°, muy abierta
# Seráns         | 0.65   | 0.75      | arco 120°, expuesta
# Furnas         | 0.65   | 0.80      | surf-forecast "exposed"
# Río Sieira     | 0.65   | 0.80      | surf-forecast "exposed"
# Queiruga       | 0.70   | 0.78      | similar a Furnas
# Baroña         | 0.65   | 0.75      | arco 105°
# Fonforrón      | 0.70   | 0.72      | arco 60°, algo selectiva
# Aguieira       | 0.72   | 0.75      | arco 110°
# Ancoradoiro    | 0.75   | 0.78      | entrada Costa da Morte
# Lariño         | 0.85   | 0.85      | sin cambio
# Carnota        | 0.90   | 0.82      | surf-forecast "fairly exposed" (no fully)
# Mar de Fora    | 0.95   | 0.92      | ajuste mínimo
# Rostro         | 1.00   | 0.95      | máximo real (1.0 es teórico)
# Nemiña         | 0.95   | 0.90      | ajuste
# Traba          | 0.80   | 0.82      | ajuste
# Soesto         | 0.80   | 0.82      | ajuste
# Seaia          | 0.72   | 0.72      | sin cambio
# Malpica        | 0.70   | 0.68      | algo de sombra del cabo
# Razo           | 0.81   | 0.85      | 53% limpias dic, muy consistente
# Baldaio        | 0.75   | 0.78      | ajuste
# Caión          | 0.68   | 0.72      | ajuste
# Barrañán       | 0.65   | 0.82      | surf-forecast "exposed", 53% limpias dic
# Valcovo        | 0.60   | 0.65      | ajuste
# Repibelo       | 0.58   | 0.62      | ajuste
# Sabón          | 0.55   | 0.50      | dique exterior atenúa
# Orzán          | 0.50   | 0.58      | surfsphere "relatively exposed"
# Riazor         | 0.45   | 0.50      | algo protegida por promontorio
# Matadero       | 0.42   | 0.52      | ajuste
# Santa Cristina | 0.28   | 0.30      | ajuste mínimo
# Bastiagueiro   | 0.28   | 0.18      | surf-forecast "VERY SHELTERED, 12% limpias"
# Doniños        | 0.65   | 0.85      | surf-forecast "exposed", 43% limpias
# San Jorge      | 0.68   | 0.80      | exposed, similar a Doniños
# Santa Comba    | 0.70   | 0.80      | exposed, norte de Ferrolterra
# Ponzos         | 0.72   | 0.88      | Surfline muestra más mar que Doniños
# Campelo        | 0.72   | 0.82      | surfsphere "bigger than expected"
# Valdoviño      | 0.75   | 0.82      | surfatlas "classic open beach"
# Pantín         | 0.78   | 0.92      | "recoge el mínimo swell", funnels beautifully
# Vilarrube      | 0.70   | 0.28      | surf-forecast "SHELTERED" — ERROR GRAVE actual
# A Concha       | 0.74   | 0.72      | ajuste mínimo
# San Antón      | 0.74   | 0.72      | ajuste mínimo
# Sarridal       | 0.75   | 0.74      | ajuste mínimo
# Bares          | 0.76   | 0.78      | punta N, muy expuesta
# Esteiro        | 0.74   | 0.73      | ajuste mínimo
# Peizás         | 0.72   | 0.73      | ajuste mínimo
# Rapadoira      | 0.71   | 0.72      | ajuste mínimo
# San Cosme      | 0.71   | 0.72      | sin cambio
# Reinante       | 0.70   | 0.62      | surfatlas "not west-facing, less consistent"
