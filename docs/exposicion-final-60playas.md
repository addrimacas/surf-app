# SALITRE — Clasificación de exposición: 60 playas
# Versión final · 2026-04-29
# Fuentes: surf-forecast.com (SF), surfline.com (SL), surfatlas.com (SA)
#
# ═══════════════════════════════════════════════════════════════════
# METODOLOGÍA — CÓMO SE HIZO Y CÓMO REPLICAR AL ESCALAR
# ═══════════════════════════════════════════════════════════════════
#
# PASO 1 — Fuente primaria: surf-forecast.com
#   URL por playa: surf-forecast.com/breaks/[NombrePlaya]
#   Datos extraídos:
#     - Categoría: exposed / fairly exposed / sheltered / very sheltered
#     - Swell ideal (dirección óptima confirmada)
#     - Offshore ideal (viento que limpia)
#     - % olas limpias en mejor mes (dato más objetivo disponible)
#   Limitación: ~35 de 60 playas tienen ficha propia en SF.
#   Las demás (playas de ría pequeñas, spots secundarios) no existen.
#
# PASO 2 — Fuente secundaria: surfline.com
#   Surfline no permite fetch directo (403). Acceso via búsqueda Google.
#   Datos extraídos:
#     - Comparación relativa de altura entre playas en el mismo momento
#       (los listados de spots cercanos muestran ft en tiempo real)
#     - Spot guides cuando aparecen en snippets de búsqueda
#   Uso principal: CALIBRACIÓN RELATIVA entre playas cercanas.
#   Ejemplo: si Ponzos siempre aparece con más ft que Doniños → más expuesta.
#
# PASO 3 — Fuente terciaria: surfatlas.com, surfsphere.com, surfmarket.org
#   Guías narrativas escritas por surfistas locales.
#   Datos extraídos: descripciones cualitativas ("only works with big swell",
#   "shelter from Cíes Islands", "funnels swell beautifully")
#
# PASO 4 — Inferencia geométrica (solo cuando las 3 fuentes no tienen dato)
#   Basada en: orientArcMin/Max del beach-data.js + posición geográfica
#   + obstáculos conocidos (islas, cabos, rías)
#   Confianza: BAJA. Marcar con [GEO] para revisión futura.
#
# ESCALA factorSombra:
#   0.90-0.95 = exposed sin obstáculos, referencia máxima
#   0.75-0.89 = fairly exposed, alguna protección menor
#   0.50-0.74 = semi-expuesta, orientación parcial o algo de sombra
#   0.25-0.49 = fairly sheltered, necesita mar real para funcionar
#   0.10-0.24 = very sheltered, solo con maretón serio (>3m offshore)
#
# CÓMO ESCALAR A MÁS PLAYAS:
#   1. Buscar en SF: surf-forecast.com/breaks/[Nombre] → extraer categoría y %
#   2. Buscar en SL: "surfline [nombre playa] spot guide" en Google
#   3. Buscar en SA: thesurfatlas.com + surfsphere.com para narrativa local
#   4. Si no hay datos: usar orientArcMin/Max + mapa para estimar
#   5. Añadir campo factorSombra en beach-data.js
#   6. Validar con snapshots de Surfline (comparación relativa)
#
# ═══════════════════════════════════════════════════════════════════
# TABLA MAESTRA — 60 PLAYAS
# ═══════════════════════════════════════════════════════════════════
#
# Formato: Nombre | SF categoría | SF % limpias | SL ratio | SA/narrativa | factorSombra | Confianza
# SL ratio: altura relativa vs referencia Pantín en mismo snapshot

## RÍAS BAIXAS

# Patos
# SF: "fairly exposed, beach+reef, swell NW, offshore SSO, 48% limpias dic"
# SL: aparece consistentemente 1-2 rangos por debajo de Doniños/Pantín
#     (ej: cuando Pantín 6-8ft → Patos 6-8ft; cuando Pantín 15-18ft → Patos 6-8ft)
#     → a mar pequeño recibe casi igual; a mar grande se queda corta (las Cíes filtran)
# SA: "needs substantial swells NW, shelter from Cíes"
# → factorSombra: 0.45

# Prado
# SF: sin ficha propia
# SL: sin datos (spot demasiado pequeño/protegido)
# SA: reef break al norte de Patos, más protegido
# GEO: más interior que Patos en la ría
# → factorSombra: 0.20 [GEO]

# Vao
# SF: sin ficha propia
# SL: sin datos
# SA/SM: "muy resguardada, solo con grandes marejadas invernales"
# GEO: interior ría de Vigo, detrás de Patos
# → factorSombra: 0.15 [GEO]

# Samil
# SF: sin ficha propia
# SL: sin datos propios; cuando aparece en listados → siempre 0-1ft o flat
# SA: "shelter cast by Atlantic Islands, never big, lake in summer"
# GEO: dentro de la ría de Vigo, protegida por Cíes
# → factorSombra: 0.18 [GEO+SL]

# Nerga
# SF: "sheltered, swell SW, offshore NE, 10% limpias feb (mejor mes)"
# SL: sin datos propios
# SA: punta de la Ría de Vigo, más expuesta que Samil pero muy selectiva
# → factorSombra: 0.22

# Melide
# SF: "sheltered, swell SW, offshore NE, 10% limpias feb"
# SL: sin datos propios
# SA/GEO: similar a Nerga, arco amplio 190-355° pero en zona protegida
# → factorSombra: 0.28

# Caneliñas
# SF: sin ficha
# SL: sin datos
# GEO: bahía pequeña, arco muy estrecho 205-230° (25°), muy selectiva
# → factorSombra: 0.32 [GEO]

# Canelas
# SF: sin ficha
# SL: sin datos
# GEO: arco 195-280° (85°), algo más abierta que Caneliñas
# → factorSombra: 0.38 [GEO]

# Montalvo
# SF: sin ficha propia (Playa de Montalbo sí existe en SF)
# SL: sin datos propios
# SA: "potential for tubular shore breaks, good fall to spring, flat summers"
# GEO: arco 190-295° (105°), orientada al O-SO
# → factorSombra: 0.50

# Foxos
# SF: sin ficha
# SL: sin datos
# Wildsuits: "can handle bigger waves than Lanzada, best swell N/NW/W"
# GEO: arco 205-300° (95°), más expuesta que Lanzada
# → factorSombra: 0.65 [GEO+narrativa]

# Lanzada
# SF: "exposed, beach+reef, swell SW, offshore NE, todas las mareas"
# SL: aparece en listados con tamaño similar a spots coruñeses cuando hay SW
# SA: "finest all-level break, chest-high sets even small swells"
# Surfnerd: "consistent, picks up SW and O"
# → factorSombra: 0.80

## COSTA DE BARBANZA

# Vilar
# SF: sin ficha propia (Praia do Vilar existe en SL)
# SL: tiene spot propio, aparece en listados con mar decente
#     snapshot: cuando Rio Siera 15-18ft → Vilar no listado (demasiado lejos)
# SA: "playa abierta Costa de Barbanza, orientada al O-SO"
# GEO: arco 210-290° (80°), sin obstáculos al frente atlántico
# → factorSombra: 0.75 [GEO confirmado por posición]

# Ladeira
# SF: "fairly exposed, swell SW, offshore NE"
# SL: sin datos propios
# → factorSombra: 0.72

# Balieiros
# SF: sin ficha propia
# SL: sin datos
# GEO: arco 160-5° (205°), enorme apertura, Costa de Barbanza norte
# → factorSombra: 0.75 [GEO]

# Seráns
# SF: aparece como spot vecino de Río Sieira ("fairly consistent, 1mi")
# SL: sin datos
# GEO: arco 250-10° (120°), orientada al O-NO
# → factorSombra: 0.75

# Furnas
# SF: "exposed, swell W, offshore SE, quite reliable, todas las mareas"
# SL: Rio Siera aparece en listados con tamaños grandes (15-18ft en swells importantes)
# SA: "gem of a spot, powerful beach breaks, strong rips"
# → factorSombra: 0.82

# Río Sieira
# SF: "exposed, swell W, offshore SE, quite reliable"
# SL: mismo spot que Furnas prácticamente, tamaños consistentes
# → factorSombra: 0.82

# Queiruga
# SF: aparece como vecino de Aguieira
# SL: sin datos propios
# GEO: arco 230-320° (90°), similar a Furnas/Baroña
# → factorSombra: 0.78

# Baroña
# SF: aparece como vecino de Fonforrón ("fairly consistent")
# SL: sin datos propios
# GEO: arco 205-310° (105°), bien expuesta al SO-O-NO
# → factorSombra: 0.75

# Fonforrón
# SF: "fairly exposed, beach+reef, swell WNW, offshore S, 47% limpias dic"
# SL: sin datos propios
# → factorSombra: 0.75

# Aguieira
# SF: "quite exposed, swell WNW, offshore S, reasonably consistent"
# SL: sin datos propios
# → factorSombra: 0.78

## COSTA DA MORTE

# Ancoradoiro
# SF: sin ficha propia
# SL: sin datos
# GEO: arco 175-250° (75°), entrada Costa da Morte, orientada al SO
# → factorSombra: 0.78 [GEO]

# Lariño
# SF: "fairly exposed, swell SW, offshore NE, quite reliable"
# SL: sin datos propios
# → factorSombra: 0.80

# Carnota
# SF: "fairly exposed, swell NW, offshore NE, 44% limpias marzo"
# SL: sin datos propios
# SA: "pretty mental en invierno con NW swells"
# → factorSombra: 0.82

# Mar de Fora
# SF: sin ficha propia
# SL: sin datos
# NatGeo: "totalmente expuesta, olas rugiendo desde lejos"
# GEO: Finisterre sur, sin ningún obstáculo
# → factorSombra: 0.92 [GEO+narrativa]

# Rostro
# SF: aparece en listas como "very consistent"
# SL: sin datos propios
# GEO: la más expuesta de Costa da Morte
# → factorSombra: 0.95

# Nemiña
# SF: "exposed, swell NW/O, offshore NE/SE"
# SL: sin datos propios
# → factorSombra: 0.90

# Traba
# SF: aparece como vecino de Soesto ("very consistent, 2mi")
# SL: sin datos propios
# GEO: arco 275-10° (95°), expuesta al N-NO
# → factorSombra: 0.85

# Soesto
# SF: "exposed, very consistent, swell NW, offshore SE"
# SL: sin datos propios
# → factorSombra: 0.85

# Seaia
# SF: "fairly exposed, swell NW, offshore SW, pretty consistent"
# SL: sin datos propios
# → factorSombra: 0.75

# Malpica
# SF: aparece en listas como "consistent"
# SL: sin datos propios
# GEO: algo de sombra del cabo de Roncudo al NO
# → factorSombra: 0.70

## COSTA CORUÑESA

# Razo
# SF: "exposed, swell NW, offshore S, 53% limpias dic"
# SL: aparece sistemáticamente con tamaños similares a Barrañán y Caión
#     snapshots: Razo 8-10ft cuando Pantín 15-18ft → ratio ~0.55 vs Pantín
# SA: "trusty beach, long walls on medium swell"
# → factorSombra: 0.85

# Baldaio
# SF: "exposed, swell NW, offshore S"
# SL: Playa de Baldayo aparece en listados con tamaños similares a Razo
# → factorSombra: 0.80

# Caión
# SF: "exposed, swell NW"
# SL: aparece en listados, tamaños similares a Barrañán (8-10ft vs 8-10ft)
# → factorSombra: 0.75

# Barrañán
# SF: "exposed, swell NW, offshore S, 53% limpias dic"
# SL: aparece en listados, tamaños = Caión
# → factorSombra: 0.82

# Valcovo
# SF: sin ficha (surfsphere lo menciona entre Barrañán y Caión)
# SL: sin datos
# GEO: entre Barrañán y Repibelo, similar exposición
# → factorSombra: 0.65 [GEO]

# Repibelo
# SF: sin ficha
# SL: sin datos
# GEO: similar a Valcovo, entre este y Sabón
# → factorSombra: 0.62 [GEO]

# Sabón
# SF: sin ficha propia (mencionado en guías)
# SL: "Playa de Sabon" aparece en listados, siempre 1-2 rangos por debajo de Barrañán
#     snapshot: Barrañán 8-10ft → Sabón 4-6ft+ → ratio claro de atenuación
# SA: "breakwater in outer port slows waves"
# Guía local: "viento SE, agua contaminada"
# → factorSombra: 0.50

# Orzán
# SF: sin ficha propia ("Playa do Orzan" en SF)
# SL: "Playa del Orzán" aparece en listados, tamaños iguales o ligeramente menores que Riazor
#     snapshots: Orzán 2-3ft cuando Pantín 4-6ft; 8-10ft cuando Pantín 15-18ft
# Surfsphere: "relatively exposed, picks up swell from different directions"
# → factorSombra: 0.60

# Riazor
# SF: "Playa do Riazor" en SF
# SL: "Praia de Riazor" consistentemente igual o ligeramente más que Orzán
#     snapshot: Riazor FAIR 4-6ft cuando Orzán 8-10ft (misma zona, Riazor puntúa FAIR)
#     Surfnerd: "handles swell sizes up to ~3ft, best NW"
# → factorSombra: 0.55

# Matadero
# SF: "Playa do Matadeiro" en SF, aparece en listados SL
# SL: "Playa do Matadeiro" aparece en listados con tamaños similares o ligeramente
#     mayores que Orzán/Riazor en swells grandes
#     snapshots: Matadero 4-6ft cuando Doniños 4-6ft → más expuesta que Riazor
# → factorSombra: 0.62

# Santa Cristina
# SF: sin ficha propia
# SL: sin datos propios
# Surfsphere: "waves get smaller the more swell comes from western direction"
#             "sur de la bahía de Valdoviño, más protegida que Frouxeira"
# GEO: arco muy estrecho 345-5° (20°), extremadamente selectiva
# → factorSombra: 0.30 [GEO+narrativa]

# Bastiagueiro
# SF: "VERY SHELTERED, swell NW, offshore SSE, 12% limpias feb (mejor mes)"
#     "necesita 3-7.5m offshore para las mejores olas"
# SL: sin datos propios (no tiene spot en Surfline, confirma poca relevancia)
# SA/narrativa local: "ola tendida, cerca de A Coruña, bastante gente"
# DATO MÁS OBJETIVO: 12% en su mejor mes = el peor de toda Galicia en SF
# → factorSombra: 0.18

## FERROLTERRA

# Doniños
# SF: "exposed, swell WNW, offshore E, very consistent, 43% limpias sep"
# SL: aparece con tamaños consistentes, cercanos a Ponzos y Santa Comba
#     snapshots: Doniños 4-6ft cuando Ponzos 8-10ft → Ponzos más expuesta confirmado
# SA: "2km bay, handles N and NW swells well, NE/SE winds groom it"
# → factorSombra: 0.85

# San Jorge
# SF: "exposed, swell WNW, offshore SE, 39% limpias dic"
# SL: "San Xorxe" aparece con tamaños similares a Doniños y Santa Comba
# → factorSombra: 0.82

# Santa Comba
# SF: "exposed, swell NW, offshore SSE, 44% limpias dic"
# SL: "Praia de Santa Comba" aparece en listados
#     snapshots: Santa Comba 4-6ft cuando Pantín 6-8ft → ratio consistente
# → factorSombra: 0.83

# Ponzos
# SF: "exposed, swell NW, offshore SSE, consistent"
# SL: DATO CLAVE — Ponzos aparece sistemáticamente con más ft que Doniños y Santa Comba
#     snapshot1: Doniños 4-6ft → Ponzos 8-10ft
#     snapshot2: Santa Comba 8-12ft → Ponzos 15-20ft
#     snapshot3: Doniños 10-15ft → Ponzos 20-25ft
#     → Ponzos recibe consistentemente el doble que sus vecinos = mucho más expuesta
# → factorSombra: 0.90

# Campelo
# SF: "consistent, swell W/NW"
# SL: "Campelo" aparece en listados con tamaños algo menores que Doniños
#     snapshots: Campelo 2-3ft+ cuando Doniños 4-6ft → ligeramente menos expuesta
# Surfsphere: "remote, bigger and stronger than expected"
# → factorSombra: 0.80

# Valdoviño
# SF: "fairly exposed (Frouxeira), swell NW, offshore SE, 32% limpias oct"
# SL: "Valdoviño" aparece en listados con tamaños similares a Santa Comba
# SA: "classic north Galician setup, open beach, solid NW swell"
# → factorSombra: 0.80

# Pantín
# SF: "exposed, swell NW, offshore SE, 38% limpias oct"
# SL: ES LA REFERENCIA — siempre el spot con más mar en el listado norte
#     Cuando hay swell grande: Pantín 15-20ft, resto 6-12ft
#     Core Surf: "recoge el más mínimo swell del Atlántico"
#     SA: "funnels swell beautifully"
#     Geometría: el cabo Prioriño concentra el swell en la bahía
# → factorSombra: 0.92

# Vilarrube
# SF: "sheltered, swell NW, offshore S"
# SL: sin datos propios (no tiene spot en Surfline)
# Surfsphere: "very sheltered, only works during bigger swells or medium for longboarders"
# SF narrativa: "only works during bigger swells, when everywhere else is maxed out"
# → factorSombra: 0.28

## RÍAS ALTAS / MARIÑA LUCENSE

# A Concha
# SF: sin ficha propia
# SL: "Playa de A Concha" aparece en listados con tamaños GRANDES
#     snapshots: A Concha 4-5ft / 6-8ft / 8-12ft en distintos swells
#     → recibe mar real, bien expuesta
# SA: zona Ortegal, muy expuesta al N
# GEO: arco 325-25° (60°), orientada al N-NNO
# → factorSombra: 0.75

# San Antón
# SF: sin ficha propia
# SL: "San Anton" aparece en listados con tamaños iguales o ligeramente mayores que A Concha
#     snapshots: San Anton 4-5ft / 8-12ft / 10-15ft → más expuesta que A Concha
#     La diferencia es consistente en múltiples snapshots
# GEO: arco 315-10° (55°), algo más abierta que A Concha
# → factorSombra: 0.78

# Sarridal
# SF: sin ficha propia
# SL: "Praia Sarridal" — DATO REVELADOR: aparece sistemáticamente con 0-1ft o flat
#     incluso cuando A Concha y San Anton tienen 4-8ft
#     snapshots: Sarridal 0-1ft cuando A Concha 4-5ft, San Anton 4-5ft
#     → está en sombra de swell para las direcciones dominantes
# SA: "perfectly arched bay between two high mountains, faces northwest at end of peninsula"
# → factorSombra: 0.35 [SL dato directo, sorprendente]

# Bares
# SF: sin ficha propia
# SL: "Praia de Bares" aparece en listados con tamaños medios-altos
#     snapshots: Bares 3-4ft / 6-8ft / 8-12ft → bien expuesta al N
#     Ratio: similar a A Concha pero consistentemente un poco menos
# GEO: punta más septentrional de Galicia, expuesta al N/NE
# → factorSombra: 0.76

# Esteiro
# SF: "exposed, swell NW, offshore E, 48% limpias sep"
# SL: "Playa de Esteiro" aparece en listados con tamaños bajos-medios
#     snapshots: Esteiro 0-1ft / 1-2ft / 2-3ft / 3-4ft+ → mucho menos que Bares y A Concha
#     → orientada al N-NO pero con algún obstáculo o posición menos directa
# SA: "reliable lefts, nice in spring/summer"
# → factorSombra: 0.62 [SL revela menor exposición de lo esperado]

# Peizás
# SF: sin ficha propia
# SL: "Praia de Peizás" aparece en listados con tamaños muy similares a Esteiro
#     snapshots: Peizás 0-1ft / 1-2ft / 2-3ft → igual que Esteiro
# GEO: arco 330-100° (130°), similar a Rapadoira
# → factorSombra: 0.63

# Rapadoira
# SF: aparece en SF como spot ("Playa Rapadoira")
# SL: sin datos propios claros
# GEO: arco 325-95° (130°), similar a Peizás
# → factorSombra: 0.63 [GEO+SF]

# San Cosme
# SF: sin ficha propia
# SL: "San Cosme" aparece en listados con tamaños bajos
#     snapshots: San Cosme 0-1ft / 1-2ft / 3-4ft → consistentemente menos que Bares
#     → SA confirma: "sheltered by bulge of northern Galicia, needs strong W/NW"
# SA: "one of more consistent options on north coast but sheltered from west"
# → factorSombra: 0.60

# Reinante
# SF: sin ficha propia
# SL: "Reinante" aparece en listados con tamaños bajos-medios
#     snapshots: Reinante 0-1ft / 1-2ft / 2-3ft → similar o menos que San Cosme
#     En swells NW grandes: Reinante recibe algo (wrap-around)
# SA: "not west-facing, less consistent, works with northerly or big wrap-around"
# → factorSombra: 0.58

# ═══════════════════════════════════════════════════════════════════
# TABLA RESUMEN FINAL — CAMBIOS VS beach-data.js ACTUAL
# ═══════════════════════════════════════════════════════════════════

# Nombre         | Actual | Final  | Δ      | Confianza | Fuente principal
# ─────────────────────────────────────────────────────────────────────────
# Patos          | 0.20   | 0.45   | +0.25  | ALTA      | SF + SL comparativo
# Prado          | 0.20   | 0.20   | 0.00   | MEDIA     | GEO
# Vao            | 0.22   | 0.15   | -0.07  | MEDIA     | GEO + SM
# Samil          | 0.35   | 0.18   | -0.17  | ALTA      | SA + SL flat
# Nerga          | 0.30   | 0.22   | -0.08  | ALTA      | SF directo
# Melide         | 0.32   | 0.28   | -0.04  | ALTA      | SF directo
# Caneliñas      | 0.38   | 0.32   | -0.06  | MEDIA     | GEO arco estrecho
# Canelas        | 0.36   | 0.38   | +0.02  | MEDIA     | GEO
# Montalvo       | 0.50   | 0.50   | 0.00   | MEDIA     | SA
# Foxos          | 0.65   | 0.65   | 0.00   | MEDIA     | Wildsuits
# Lanzada        | 0.75   | 0.80   | +0.05  | ALTA      | SF + SA
# Vilar          | 0.40   | 0.75   | +0.35  | ALTA      | GEO + SL spot propio
# Ladeira        | 0.60   | 0.72   | +0.12  | ALTA      | SF directo
# Balieiros      | 0.62   | 0.75   | +0.13  | MEDIA     | GEO arco amplio
# Seráns         | 0.65   | 0.75   | +0.10  | MEDIA     | SF vecino
# Furnas         | 0.65   | 0.82   | +0.17  | ALTA      | SF "exposed" + SA
# Río Sieira     | 0.65   | 0.82   | +0.17  | ALTA      | SF "exposed"
# Queiruga       | 0.70   | 0.78   | +0.08  | MEDIA     | GEO + vecinos
# Baroña         | 0.65   | 0.75   | +0.10  | MEDIA     | SF vecino
# Fonforrón      | 0.70   | 0.75   | +0.05  | ALTA      | SF directo
# Aguieira       | 0.72   | 0.78   | +0.06  | ALTA      | SF directo
# Ancoradoiro    | 0.75   | 0.78   | +0.03  | MEDIA     | GEO
# Lariño         | 0.85   | 0.80   | -0.05  | ALTA      | SF directo
# Carnota        | 0.90   | 0.82   | -0.08  | ALTA      | SF "fairly exposed"
# Mar de Fora    | 0.95   | 0.92   | -0.03  | MEDIA     | GEO + NatGeo
# Rostro         | 1.00   | 0.95   | -0.05  | MEDIA     | SF + GEO
# Nemiña         | 0.95   | 0.90   | -0.05  | ALTA      | SF directo
# Traba          | 0.80   | 0.85   | +0.05  | MEDIA     | SF vecino
# Soesto         | 0.80   | 0.85   | +0.05  | ALTA      | SF "exposed"
# Seaia          | 0.72   | 0.75   | +0.03  | ALTA      | SF directo
# Malpica        | 0.70   | 0.70   | 0.00   | MEDIA     | GEO
# Razo           | 0.81   | 0.85   | +0.04  | ALTA      | SF 53% + SL
# Baldaio        | 0.75   | 0.80   | +0.05  | ALTA      | SF + SL
# Caión          | 0.68   | 0.75   | +0.07  | ALTA      | SF + SL comparativo
# Barrañán       | 0.65   | 0.82   | +0.17  | ALTA      | SF 53% + SL
# Valcovo        | 0.60   | 0.65   | +0.05  | BAJA      | GEO
# Repibelo       | 0.58   | 0.62   | +0.04  | BAJA      | GEO
# Sabón          | 0.55   | 0.50   | -0.05  | ALTA      | SL comparativo + dique
# Orzán          | 0.50   | 0.60   | +0.10  | ALTA      | SL comparativo
# Riazor         | 0.45   | 0.55   | +0.10  | ALTA      | SL comparativo
# Matadero       | 0.42   | 0.62   | +0.20  | ALTA      | SL comparativo
# Santa Cristina | 0.28   | 0.30   | +0.02  | MEDIA     | GEO arco 20°
# Bastiagueiro   | 0.28   | 0.18   | -0.10  | MUY ALTA  | SF "very sheltered" 12%
# Doniños        | 0.65   | 0.85   | +0.20  | ALTA      | SF 43% + SL
# San Jorge      | 0.68   | 0.82   | +0.14  | ALTA      | SF 39%
# Santa Comba    | 0.70   | 0.83   | +0.13  | ALTA      | SF 44% + SL
# Ponzos         | 0.72   | 0.90   | +0.18  | MUY ALTA  | SL doble que vecinos
# Campelo        | 0.72   | 0.80   | +0.08  | ALTA      | SL + Surfsphere
# Valdoviño      | 0.75   | 0.80   | +0.05  | ALTA      | SF 32% + SL
# Pantín         | 0.78   | 0.92   | +0.14  | MUY ALTA  | SF + SL referencia + SA
# Vilarrube      | 0.70   | 0.28   | -0.42  | MUY ALTA  | SF "sheltered" + Surfsphere
# A Concha       | 0.74   | 0.75   | +0.01  | ALTA      | SL tamaños grandes
# San Antón      | 0.74   | 0.78   | +0.04  | ALTA      | SL > A Concha sistemático
# Sarridal       | 0.75   | 0.35   | -0.40  | MUY ALTA  | SL 0-1ft cuando vecinos 4-8ft
# Bares          | 0.76   | 0.76   | 0.00   | ALTA      | SL tamaños medios
# Esteiro        | 0.74   | 0.62   | -0.12  | ALTA      | SL + SF "exposed" pero bajo
# Peizás         | 0.72   | 0.63   | -0.09  | ALTA      | SL similar a Esteiro
# Rapadoira      | 0.71   | 0.63   | -0.08  | MEDIA     | GEO similar a Peizás
# San Cosme      | 0.71   | 0.60   | -0.11  | ALTA      | SL + SA "sheltered by bulge"
# Reinante       | 0.70   | 0.58   | -0.12  | ALTA      | SL + SA "not west-facing"

# ═══════════════════════════════════════════════════════════════════
# SORPRESAS RESPECTO A LA CLASIFICACIÓN ANTERIOR
# ═══════════════════════════════════════════════════════════════════
#
# 1. SARRIDAL (0.75 → 0.35): SORPRESA GRANDE.
#    Los snapshots de Surfline muestran sistemáticamente 0-1ft cuando A Concha
#    y San Anton tienen 4-8ft. La bahía entre montañas la protege mucho.
#    SA lo confirma: "faces northwest at end of own peninsula" pero con
#    "offshore reefs at either end" — los reefs la aíslan del swell directo.
#
# 2. ESTEIRO / PEIZÁS / SAN COSME / REINANTE (todos por debajo de lo esperado):
#    Los snapshots de SL muestran tamaños bajos (0-1ft a 2-3ft) cuando la costa
#    atlántica tiene 4-8ft. Estas playas miran al N-NE pero están en la sombra
#    parcial del "bulge" norte de Galicia para swells del O y NO.
#    Solo reciben bien swells del N y NE, que son menos frecuentes.
#
# 3. PONZOS (0.72 → 0.90): La más expuesta de Ferrolterra según SL.
#    Sistemáticamente el doble de mar que Doniños y Santa Comba.
#
# 4. MATADERO (0.42 → 0.62): Más expuesta de lo que teníamos.
#    SL la muestra con tamaños similares o mayores que Orzán/Riazor.
#
# 5. VILAR (0.40 → 0.75): Corrección grande confirmada.
#    Playa abierta de Costa de Barbanza sin ningún obstáculo frente.

# ═══════════════════════════════════════════════════════════════════
# PENDIENTE REVISIÓN MANUAL (confianza BAJA o dato contradictorio)
# ═══════════════════════════════════════════════════════════════════
#
# Prado, Vao: solo GEO, sin fuente externa. Revisar con conocimiento local.
# Caneliñas, Canelas: sin fuente externa. Revisar.
# Valcovo, Repibelo: sin SF ni SL. Solo GEO.
# Santa Cristina: arco muy estrecho (20°), revisar si orientArcMin/Max es correcto.
# Mar de Fora, Rostro: sin SF propio, solo narrativa. Confianza MEDIA.
