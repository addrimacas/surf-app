// motor-v1.js — motor de evaluación de Salitre. v2.0 = especificación v1.1 + ronda 6 de la consulta
// multi-IA (14-oct-2026): «la nota medía la ausencia de problemas, no la presencia de buenas olas».
//
// Cadena: oleaje offshore por particiones (período de PICO estimado: el modelo da período medio)
//         → transferencia K(θ,Tp) del atlas → altura en la playa → rompiente Hb (Komar-Gaughan con Tp)
//         → calidad Q = tamaño × media geométrica ponderada de (forma, limpieza, fuerza, marea)
//           · forma: ángulo de llegada a la playa tras refractar a 10 m (Snell): de frente cierra
//           · limpieza: viento, mar de viento, pendiente del oleaje (Hs/L0) y cruce de mares
//           · fuerza: período de pico según el nivel
//         → cuello de botella: si un componente es muy malo, la nota no pasa de 4
//         → escala calibrada con la climatología (calibracion-nota.js) → topes de seguridad.
//
// Funciona en el navegador (window.MotorV1) y en Node (module.exports) para los tests.
// Todos los números marcados "prior" son puntos de partida a calibrar con el panel ciego.
(function (global) {
  'use strict';

  const VERSION = 'v2.1.0';
  const G = 9.81;
  const PERIODOS = [6, 8, 10, 12, 14, 16, 18];

  // ---------------------------------------------------------------- utilidades
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const lerp = (x, x0, x1, y0, y1) => y0 + (y1 - y0) * clamp((x - x0) / (x1 - x0), 0, 1);
  const difAng = (a, b) => { const d = ((a - b) % 360 + 360) % 360; return d > 180 ? 360 - d : d; };
  const valido = v => v != null && !Number.isNaN(v);

  function decodificarBase64(b64) {
    if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(b64, 'base64'));
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  // ---------------------------------------------------------------- atlas y transferencia
  const cacheTablas = new Map();
  function tablaK2(atlasPlaya) {
    if (!atlasPlaya?.k2) return null;
    if (!cacheTablas.has(atlasPlaya.k2)) cacheTablas.set(atlasPlaya.k2, decodificarBase64(atlasPlaya.k2));
    return cacheTablas.get(atlasPlaya.k2);
  }

  // K² puntual (sin dispersión) en la dirección g (grados, entero) y período T, interpolando en T
  function k2Puntual(tabla, g, T) {
    const gi = ((Math.round(g) % 360) + 360) % 360;
    const Tc = clamp(T, PERIODOS[0], PERIODOS[PERIODOS.length - 1]);
    let i = 0;
    while (i < PERIODOS.length - 2 && Tc > PERIODOS[i + 1]) i++;
    const f = (Tc - PERIODOS[i]) / (PERIODOS[i + 1] - PERIODOS[i]);
    const a = tabla[i * 360 + gi] / 255, b = tabla[(i + 1) * 360 + gi] / 255;
    return a + (b - a) * f;
  }

  // Dispersión direccional asumida (Open-Meteo no la da): prior
  const SIGMA = { swell: 17.5, swell2: 17.5, viento: 32.5 };

  // Coeficiente de transmisión en altura para una partición: K = √(Σ W(Δθ)·K²(θ+Δθ, T))
  // (dispersión ponderada en energía, corrección de la ronda 4)
  function transmision(atlasPlaya, dir, T, tipo) {
    const tabla = tablaK2(atlasPlaya);
    if (!tabla || !valido(dir)) return null;
    const s = SIGMA[tipo] ?? 20;
    let suma = 0, pesos = 0;
    for (let d = -3 * s; d <= 3 * s; d += 1) {
      const w = Math.exp(-0.5 * (d / s) * (d / s));
      suma += w * k2Puntual(tabla, dir + d, T ?? 10);
      pesos += w;
    }
    // Atenuación global por recorrido en aguas confinadas (rías, bahías), calculada en el atlas
    return Math.sqrt(suma / pesos) * (atlasPlaya.factorConfinamiento ?? 1);
  }

  // ---------------------------------------------------------------- refracción sobre el fondo real
  // atlas-batimetria.js (EMODnet ~115 m + trazado de rayos hasta la isobata de 10 m) da Kr[T][dir]:
  // concentración (Kr>1) o dispersión (Kr<1) de la energía por la forma del fondo. Se suaviza con la
  // misma dispersión direccional que la transmisión y solo cuenta las direcciones cuyos rayos llegan:
  // la sombra de la costa ya la pone el atlas de exposición (no se cuenta dos veces). Sin datos → 1.
  let BATI = global.ATLAS_BATIMETRIA || null;
  if (!BATI && typeof require === 'function') { try { BATI = require('./atlas-batimetria.js'); } catch (e) { BATI = null; } }
  // Nivel absoluto: el trazado a 115 m pierde rayos (islotes, bajos sin resolver) y sesga Kr a la baja.
  // La altura absoluta ya está validada contra Surf-Forecast (sobre todo en playas abiertas) con el atlas
  // de exposición, así que de la batimetría se toma la diferencia RELATIVA: Kr / Kr de referencia, con la
  // referencia en el percentil 75 (fondo de costa abierta). Concentrar por encima de eso no está validado
  // (tope 1,1); dispersar sí se aplica (hasta 0,6): bajos, plataformas y fondos de ría pierden energía.
  const KR_REF = (() => {
    if (!BATI) return 1;
    const v = [];
    for (const b of Object.values(BATI.playas)) BATI.meta.periodos.forEach((T, i) => {
      if (T >= 10 && T <= 16) for (const k of b.kr[i]) if (k > 0) v.push(k);
    });
    v.sort((a, b) => a - b);
    return v.length ? v[Math.floor(v.length * 0.75)] : 1;
  })();
  function factorBatimetria(nombre, dir, T, tipo) {
    const b = BATI && nombre && BATI.playas[nombre];
    if (!b || !valido(dir) || !valido(T)) return 1;
    const per = BATI.meta.periodos, paso = BATI.meta.pasoDireccion, n = 360 / paso;
    const Tc = clamp(T, per[0], per[per.length - 1]);
    let i = 0; while (i < per.length - 2 && Tc > per[i + 1]) i++;
    const f = (Tc - per[i]) / (per[i + 1] - per[i]);
    const s = SIGMA[tipo] ?? 20;
    let suma = 0, pesos = 0, total = 0;
    for (let d = -3 * s; d <= 3 * s; d += paso) {
      const w = Math.exp(-0.5 * (d / s) * (d / s));
      const k = ((Math.round((dir + d) / paso) % n) + n) % n;
      const kr = (1 - f) * b.kr[i][k] + f * b.kr[i + 1][k];
      suma += w * kr * kr; pesos += w;          // promedio de energía (Kr²); sin rayos = sombra = 0
      if (kr > 0) total += w;
    }
    if (!total) return 1;                        // ningún rayo llega en esa ventana: sin dato fiable
    return clamp(Math.sqrt(suma / pesos) / KR_REF, 0.6, 1.1);
  }

  // ---------------------------------------------------------------- física
  // Potencia del oleaje en aguas profundas, kW/m. Te ≈ 0,9·Tp si no hay período de energía.
  const potencia = (H, Tp) => (valido(H) && valido(Tp)) ? 0.49 * H * H * 0.9 * Tp : null;

  // Altura de rompiente con varias particiones: Hb = 0,39·g^0,2·(Σ Ti·H0i'²)^0,4
  function alturaRompiente(parts) {
    const flujo = parts.reduce((s, p) => s + p.T * p.hLocal * p.hLocal, 0);
    return flujo > 0 ? 0.39 * Math.pow(G, 0.2) * Math.pow(flujo, 0.4) : 0;
  }

  // ---------------------------------------------------------------- tablas por nivel (Hb, m) — prior
  const NIVELES = {
    principiante: { aceptMin: 0.3, idealMin: 0.4, idealMax: 0.8, aceptMax: 1.2, duro: 1.5 },
    intermedio:   { aceptMin: 0.5, idealMin: 0.8, idealMax: 1.8, aceptMax: 2.5, duro: 3.0 },
    pro:          { aceptMin: 0.8, idealMin: 1.5, idealMax: 3.5, aceptMax: 5.0, duro: 6.5 },
  };

  // Adecuación del tamaño al nivel (0..1), curva suave sin reintroducir el período
  function factorTamano(hb, nivel) {
    const r = NIVELES[nivel] ?? NIVELES.pro;
    if (hb <= 0.05) return 0;
    if (hb < r.aceptMin) return lerp(hb, 0.05, r.aceptMin, 0.03, 0.25);
    if (hb < r.idealMin) return lerp(hb, r.aceptMin, r.idealMin, 0.25, 0.85);
    if (hb <= r.idealMax) {
      // dentro del rango ideal: 0,85 en los bordes y 1 en el centro (el 10 queda para el centro)
      const c = (r.idealMin + r.idealMax) / 2, semi = (r.idealMax - r.idealMin) / 2;
      return 1 - 0.15 * Math.pow(Math.abs(hb - c) / semi, 2);
    }
    if (hb <= r.aceptMax) return lerp(hb, r.idealMax, r.aceptMax, 0.85, 0.45);
    return lerp(hb, r.aceptMax, r.duro, 0.45, 0.08);
  }

  // Capacidad: tamaño de rompiente al que la playa empieza a cerrar (prior por tipo)
  const CAPACIDAD_TIPO = { beach: 2.7, abierta: 3.5, punta: 4.5, arrecife: 4.5 };
  function factorCapacidad(hb, playa) {
    const cap = playa?.capacidadHb ?? CAPACIDAD_TIPO[playa?.tipoRompiente] ?? CAPACIDAD_TIPO.beach;
    if (hb <= cap) return 1;
    return lerp(hb, cap, cap + 1, 1, 0.3);
  }

  // Viento: ángulo respecto al offshore de la playa + velocidad. Devuelve 0.15..1 (prior)
  // Dirección del viento de tierra (offshore) de una playa. Única fuente para toda la app.
  // 1.º la normal de la costa calculada en el atlas (GSHHG); 2.º el centro del arco de exposición;
  // 3.º la orientación. (El antiguo offshoreWindDeg de beach-data era un valor por zona y fallaba
  // en 38 de las 60 playas por más de 30°: ya no se usa.)
  function direccionOffshore(playa, atlasPlaya) {
    if (valido(atlasPlaya?.normal)) return (atlasPlaya.normal + 180) % 360;
    if (valido(playa?.orientArcMin) && valido(playa?.orientArcMax)) {
      const ap = ((playa.orientArcMax - playa.orientArcMin) + 360) % 360;
      return ((playa.orientArcMin + ap / 2 + 360) % 360 + 180) % 360;
    }
    return ((playa?.orient ?? 0) + 180) % 360;
  }

  function clasificarViento(dirViento, playa, atlasPlaya) {
    const offDeg = direccionOffshore(playa, atlasPlaya);
    const d = difAng(dirViento, offDeg);
    if (d <= 20) return { etiqueta: 'OFFSHORE', base: 1.0, tipo: 'off' };
    if (d <= 55) return { etiqueta: 'CROSS-OFF', base: 0.95, tipo: 'off' };
    if (d <= 100) return { etiqueta: 'CROSS', base: 0.78, tipo: 'cross' };
    if (d <= 140) return { etiqueta: 'CROSS-ON', base: 0.58, tipo: 'on' };
    return { etiqueta: 'ONSHORE', base: 0.42, tipo: 'on' };
  }

  function factorViento(vel, dir, hb, playa, atlasPlaya) {
    if (!valido(vel) || !valido(dir)) return { f: 0.85, etiqueta: '—', tipo: null };
    if (vel < 8) return { f: 1, etiqueta: 'GLASSY', tipo: 'glassy' };
    const c = clasificarViento(dir, playa, atlasPlaya);
    let f;
    if (c.tipo === 'off') {
      // offshore moderado ayuda; fuerte dificulta remar y entrar, más con olas pequeñas
      const umbral = hb < 1 ? 20 : 28;
      f = vel <= umbral ? 1 : lerp(vel, umbral, umbral + 25, 1, 0.55);
      f *= c.base;
    } else {
      // penalización creciente con la velocidad: nada a 8 km/h, la base a 25 km/h y más allá peor;
      // por encima de 30 km/h cualquier viento que no sea de tierra estropea el mar
      const s = Math.max(0, (vel - 8) / 17);
      f = 1 - (1 - c.base) * Math.min(s, 1.6);
      if (vel > 30) f *= lerp(vel, 30, 50, 1, 0.4);
    }
    return { f: clamp(f, 0.15, 1), etiqueta: c.etiqueta, tipo: c.tipo };
  }

  // Limpieza por mar de viento local (fracción de energía de mar de viento en la playa)
  function factorLimpieza(parts) {
    const e = parts.reduce((s, p) => s + p.hLocal * p.hLocal, 0);
    if (e <= 0) return 1;
    const ev = parts.filter(p => p.tipo === 'viento').reduce((s, p) => s + p.hLocal * p.hLocal, 0);
    return 1 - 0.6 * (ev / e);
  }

  // ---------------------------------------------------------------- componentes de calidad (v2.0)
  // Dirección dominante y período de pico ponderados por la energía que llega a la playa
  function dominante(parts) {
    const base = parts.filter(p => valido(p.dir) && p.hLocal > 0);
    if (!base.length) return { dir: null, T: null };
    let x = 0, y = 0, e = 0, t = 0;
    for (const p of base) {
      const w = p.hLocal * p.hLocal * p.T;
      x += w * Math.cos(p.dir * Math.PI / 180); y += w * Math.sin(p.dir * Math.PI / 180);
      e += p.hLocal * p.hLocal; t += p.T * p.hLocal * p.hLocal;
    }
    return { dir: (Math.atan2(y, x) * 180 / Math.PI + 360) % 360, T: t / e };
  }
  // Número de onda por la relación de dispersión (iteración de punto fijo)
  function numeroOnda(T, h) {
    const w = 2 * Math.PI / T;
    let k = w * w / G;
    for (let n = 0; n < 30; n++) k = w * w / (G * Math.tanh(k * h));
    return k;
  }
  // Ángulo de llegada a 10 m de fondo respecto a la normal de la playa (Snell desde aguas profundas)
  function anguloLlegada(dir, T, atlasPlaya, playa) {
    const normal = valido(atlasPlaya?.normal) ? atlasPlaya.normal : playa?.orient;
    if (!valido(dir) || !valido(normal) || !valido(T)) return null;
    const t0 = difAng(dir, normal);
    if (t0 >= 90) return 90;
    const c0 = G * T / (2 * Math.PI);
    const c10 = (2 * Math.PI / T) / numeroOnda(T, 10);
    const s10 = Math.sin(t0 * Math.PI / 180) * c10 / c0;
    return Math.asin(clamp(s10, -1, 1)) * 180 / Math.PI;
  }
  // Forma: de frente (< 4°) en arena tiende a cerrar; 10–25° abre la ola; muy de lado pierde fuerza
  // y genera corriente lateral. Prior de la ronda 6 (D); en puntas y arrecifes pesa menos.
  function factorForma(angulo, playa) {
    if (!valido(angulo)) return 1;
    let f;
    if (angulo < 4) f = 0.7;
    else if (angulo < 10) f = lerp(angulo, 4, 10, 0.7, 1);
    else if (angulo <= 25) f = 1;
    else if (angulo <= 35) f = lerp(angulo, 25, 35, 1, 0.8);
    else f = Math.max(0.6, lerp(angulo, 35, 50, 0.8, 0.6));
    const arena = !playa?.tipoRompiente || playa.tipoRompiente === 'beach' || playa.tipoRompiente === 'abierta';
    return arena ? f : 1 - (1 - f) * 0.4;
  }
  // Pendiente del oleaje s = Hs/L0p: mar joven y con bultos aunque el modelo lo llame mar de fondo
  function factorPendiente(hs, tp) {
    if (!valido(hs) || !valido(tp) || tp <= 0) return 1;
    const s = hs / (G * tp * tp / (2 * Math.PI));
    if (s <= 0.005) return 1;
    if (s <= 0.010) return lerp(s, 0.005, 0.010, 1, 0.8);
    if (s <= 0.015) return lerp(s, 0.010, 0.015, 0.8, 0.62);
    return Math.max(0.5, lerp(s, 0.015, 0.02, 0.62, 0.5));
  }
  // Fuerza: período de pico según el nivel (intermedio ideal 12–15 s)
  const FUERZA = {
    principiante: [[5, 0.5], [7, 0.75], [9, 0.95], [10, 1], [13, 1], [16, 0.9]],
    intermedio:   [[5, 0.35], [7, 0.55], [9, 0.75], [11, 0.92], [12, 1], [15, 1], [18, 0.95]],
    pro:          [[5, 0.25], [8, 0.45], [10, 0.7], [12, 0.88], [14, 1], [18, 1]],
  };
  function factorFuerza(T, nivel) {
    const t = FUERZA[nivel] ?? FUERZA.intermedio;
    if (!valido(T)) return 1;
    if (T <= t[0][0]) return t[0][1];
    for (let i = 0; i < t.length - 1; i++) if (T <= t[i + 1][0]) return lerp(T, t[i][0], t[i + 1][0], t[i][1], t[i + 1][1]);
    return t[t.length - 1][1];
  }
  // Escala calibrada con la climatología: umbrales de Q para las notas 2…10 por nivel
  // (los genera scripts/calibrar-escala.js en GitHub Actions sobre un año de archivo)
  function calibracion() {
    if (global.CALIBRACION_NOTA) return global.CALIBRACION_NOTA;
    try { if (typeof require === 'function') return require('./calibracion-nota.js'); } catch (e) {}
    return null;
  }
  function notaDesdeQ(Q, nivel) {
    const c = calibracion()?.niveles?.[nivel];
    if (!c || c.length !== 9) return 1 + 9 * Q;
    const u = [0, ...c, 1];                // u[k] = Q mínima para la nota k+1
    for (let k = u.length - 2; k >= 0; k--) {
      if (Q >= u[k]) return k + 1 + clamp((Q - u[k]) / Math.max(1e-6, u[k + 1] - u[k]), 0, 0.999);
    }
    return 1;
  }

  // Cruce de swells: solo entre particiones de swell ya transferidas a la playa
  function factorCruce(parts) {
    const sw = parts.filter(p => p.tipo !== 'viento' && p.hLocal > 0.05 && valido(p.dir))
      .map(p => ({ ...p, E: p.T * p.hLocal * p.hLocal })).sort((a, b) => b.E - a.E);
    if (sw.length < 2) return 1;
    const tot = sw.reduce((s, p) => s + p.E, 0);
    if (sw[1].E < 0.25 * tot) return 1;
    const r = Math.min(sw[1].E / sw[0].E, 1);
    const s = clamp((difAng(sw[0].dir, sw[1].dir) - 40) / 50, 0, 1);
    return 1 - 0.3 * r * s;
  }

  // Marea: T = 1 − A·(1 − forma(fase)). Sin evidencia A ≤ 0,3 (suelo 0,7)
  function factorMarea(marea, playa) {
    if (!marea || !valido(marea.frac)) return 1;
    const opt = playa?.mareaOptima;
    if (!opt || opt === 'cualquiera') return 1;
    const objetivo = { 'baja': 0.15, 'media-baja': 0.3, 'media': 0.5, 'media-alta': 0.7, 'alta': 0.85 }[opt];
    if (objetivo == null) return 1;
    const A = playa?.sensibilidadMarea ?? 0.3;
    const forma = 1 - Math.pow(clamp(Math.abs(marea.frac - objetivo) / 0.5, 0, 1), 2);
    return 1 - A * (1 - forma);
  }

  // ---------------------------------------------------------------- partición de datos
  // Convierte los datos de Open-Meteo de una hora en particiones con altura local
  function prepararParticiones(d, playa, atlasPlaya) {
    const crudas = [
      { tipo: 'swell', h: d.swellH, T: d.swellTp ?? d.swellT, dir: d.swellDir },
      { tipo: 'swell2', h: d.swell2H, T: d.swell2T, dir: d.swell2Dir },
      { tipo: 'viento', h: d.vientoMarH, T: d.vientoMarTp ?? d.vientoMarT, dir: d.vientoMarDir },
    ].filter(p => valido(p.h) && p.h > 0.02);
    // Período de pico: si la API no lo da, Tp ≈ 1,2·Tm en mar de fondo y 1,3·Tm en mar de viento
    // (relaciones espectrales típicas; ronda 6: A, C y D coinciden)
    const pico = (p, tm, tp) => valido(tp) ? tp : (valido(tm) ? tm * (p.tipo === 'viento' ? 1.3 : 1.2) : null);
    let parts = crudas.map(p => {
      const tp = p.tipo === 'swell' ? pico(p, d.swellT, d.swellTp) : p.tipo === 'swell2' ? pico(p, d.swell2T, d.swell2Tp)
        : pico(p, d.vientoMarT, d.vientoMarTp);
      const T = valido(tp) ? tp : (p.tipo === 'viento' ? 5 : (valido(d.tTotal) ? d.tTotal * 1.2 : 12));
      return { ...p, T, dir: valido(p.dir) ? p.dir : d.dirTotal };
    });
    // Si la API no trae particiones, usar el total como una sola partición de swell
    if (!parts.length && valido(d.hTotal)) parts = [{ tipo: 'swell', h: d.hTotal, T: valido(d.tTotal) ? d.tTotal * 1.2 : 12, dir: d.dirTotal }];
    return parts.map(p => {
      const K = transmision(atlasPlaya, p.dir, p.T, p.tipo);
      const Kr = factorBatimetria(playa?.nombre, p.dir, p.T, p.tipo);
      const Kf = (K == null ? (playa?.exposicion ?? 0.5) : K) * Kr;   // sin atlas: escalar antiguo
      return { ...p, K: Kf, Kr, hLocal: Kf * p.h };
    });
  }

  // ---------------------------------------------------------------- evaluación central
  function evaluarSurf(d, playa, nivel, atlasPlaya, opciones = {}) {
    const parts = prepararParticiones(d, playa, atlasPlaya);
    const hLocal = Math.sqrt(parts.reduce((s, p) => s + p.hLocal * p.hLocal, 0));
    const hb = alturaRompiente(parts);
    const dom = dominante(parts);
    // Tamaño (puerta multiplicativa): ajuste al nivel y capacidad con las SERIES (≈ 1,27·Hb)
    const fT = factorTamano(hb, nivel);
    const fCap = factorCapacidad(1.27 * hb, playa);
    const tamano = Math.min(fT, fCap);
    // Forma
    const angulo = anguloLlegada(dom.dir, dom.T, atlasPlaya, playa);
    const forma = factorForma(angulo, playa);
    // Limpieza: lo peor de viento, mar de viento, pendiente del oleaje y cruce
    const viento = factorViento(d.vientoVel, d.vientoDir, hb, playa, atlasPlaya);
    const marViento = factorLimpieza(parts);
    const hsTot = valido(d.hTotal) ? d.hTotal : Math.sqrt(parts.reduce((s, p) => s + p.h * p.h, 0));
    const tpMar = parts.length ? parts.reduce((m, p) => (p.h > m.h ? p : m), parts[0]).T : null;
    const pendiente = factorPendiente(hsTot, tpMar);
    const cruce = factorCruce(parts);
    const limpieza = Math.min(viento.f, marViento, pendiente, cruce);
    // Fuerza y marea
    const fuerza = factorFuerza(dom.T, nivel);
    const marea = factorMarea(d.marea, playa);
    // Q = tamaño × media geométrica ponderada del resto (un fallo no queda oculto; ninguno vale 1 «por defecto»)
    const W = { forma: 0.33, limpieza: 0.33, fuerza: 0.2, marea: 0.14 };
    const resto = Math.pow(forma, W.forma) * Math.pow(limpieza, W.limpieza) * Math.pow(fuerza, W.fuerza) * Math.pow(marea, W.marea);
    const Q = clamp(tamano * resto, 0, 1);
    // Cuello de botella: si algo está claramente mal (< 0,6), la nota queda por debajo de 1 + 6·mínimo
    const minimo = Math.min(forma, limpieza, fuerza, marea);
    // Un 10 exige que TODO sea perfecto a la vez (tamaño, dirección/forma, limpieza y viento, fuerza y marea):
    // todos los componentes ≥ 0,95. Un 9, todos ≥ 0,85. La calibración ordena; esto pone el listón absoluto.
    const peor = Math.min(tamano, forma, limpieza, fuerza, marea);
    const techo = peor >= 0.95 ? 10 : peor >= 0.85 ? 9.49 : 8.49;
    const bruto = Math.min(notaDesdeQ(Q, nivel), minimo < 0.6 ? 1 + 6 * minimo : 10, techo);

    // Período para los topes: el máximo de las particiones con altura local relevante
    const tpTopes = parts.filter(p => p.hLocal >= 0.3).reduce((m, p) => Math.max(m, p.T), 0);
    return {
      parts, hLocal, hb, tpTopes, Q, angulo, dirMar: dom.dir, tpDominante: dom.T,
      factores: { tamano, ajusteNivel: fT, capacidad: fCap, forma, superficie: limpieza, limpieza: marViento, viento: viento.f,
                  pendiente, cruce, fuerza, marea },
      viento,
      bruto,
    };
  }

  // Topes de seguridad (nunca los levanta una valoración). Se evalúan con el extremo alto.
  function topes(nivel, alto, d) {
    const lista = [];
    const cap = (max, motivo) => lista.push({ max, motivo });
    if (valido(d.codigoTiempo) && d.codigoTiempo >= 95) cap(1, 'Posible tormenta eléctrica');
    const vel = d.vientoVel ?? 0;
    const tipoV = alto.viento.tipo;
    if (nivel === 'principiante') {
      if (alto.hb > 1.5) cap(2, 'Olas que podrían ser grandes para tu nivel');
      else if (alto.hb > 1.2) cap(4, 'Olas algo grandes para tu nivel');
      if (alto.tpTopes >= 16) cap(3, 'Mar de fondo largo: podrían entrar series inesperadas');
      else if (alto.tpTopes >= 14 && alto.hb > 0.8) cap(4, 'Mar de fondo largo: podrían entrar series inesperadas');
      if (tipoV === 'off' && vel > 30) cap(4, 'Viento de tierra fuerte');
      if (tipoV === 'on' && vel > 35) cap(3, 'Viento de mar fuerte');
    } else if (nivel === 'intermedio') {
      if (alto.hb > 3.0) cap(3, 'Tamaño fuera de un nivel intermedio');
    } else if (nivel === 'pro') {
      if (alto.hb < 0.6) cap(3, 'Poco tamaño');
    }
    return lista;
  }

  // Perturbaciones para la confianza: dirección ±10°, altura ±(10 % + 3 %/día), viento ±(15 % + 5 %/día)
  function perturbar(d, dDir, signo, dias) {
    const fh = 1 + signo * (0.10 + 0.03 * dias);
    const fv = 1 + signo * (0.15 + 0.05 * dias);
    const rot = v => valido(v) ? (v + dDir + 360) % 360 : v;
    const esc = (v, f) => valido(v) ? v * f : v;
    return {
      ...d,
      hTotal: esc(d.hTotal, fh), swellH: esc(d.swellH, fh), swell2H: esc(d.swell2H, fh), vientoMarH: esc(d.vientoMarH, fh),
      dirTotal: rot(d.dirTotal), swellDir: rot(d.swellDir), swell2Dir: rot(d.swell2Dir), vientoMarDir: rot(d.vientoMarDir),
      vientoVel: esc(d.vientoVel, fv),
    };
  }

  const NOMBRES_FACTOR = {
    tamano: 'el tamaño', superficie: 'el viento y el estado de la superficie', cruce: 'el cruce de mares', marea: 'la marea',
  };

  function textoLimitante(ev, nivel, playa) {
    const f = ev.factores;
    const cand = [
      ['tamano', f.tamano], ['superficie', f.superficie], ['forma', f.forma ?? 1], ['fuerza', f.fuerza ?? 1], ['marea', f.marea],
    ].sort((a, b) => a[1] - b[1]);
    const [clave, valor] = cand[0];
    const r = NIVELES[nivel] ?? NIVELES.pro;
    const paraNivel = `para nivel ${nivel}`;
    if (valor >= 0.85) {
      const enRango = ev.hb >= r.idealMin && ev.hb <= r.idealMax;
      return { clave: null, texto: enRango ? `Buen tamaño ${paraNivel}` : 'Ningún factor parece limitar mucho' };
    }
    let texto;
    if (clave === 'tamano') {
      if (f.capacidad < f.ajusteNivel) texto = 'Series que podrían cerrar con este tamaño';
      else if (ev.hb < r.idealMin) texto = ev.hb < 0.3 ? 'Apenas parece entrar ola en esta playa' : `Podría quedarse pequeño ${paraNivel}`;
      else texto = `Podría estar grande ${paraNivel}`;
    } else if (clave === 'superficie') {
      const peor = Math.min(f.viento, f.limpieza, f.pendiente, f.cruce);
      if (peor === f.viento) texto = ev.viento.tipo === 'off' ? 'Viento de tierra fuerte' : `Viento ${ev.viento.etiqueta.toLowerCase()} que podría estropear la ola`;
      else if (peor === f.cruce) texto = 'Dos mares cruzados: picos que podrían estar desordenados';
      else if (peor === f.pendiente) texto = 'Mar todavía revuelto (ola corta y con bultos), aunque haya poco viento';
      else texto = 'Mucho mar de viento: las olas podrían estar desordenadas';
    } else if (clave === 'forma') {
      texto = (ev.angulo ?? 0) < 10 ? 'Mar de frente a la playa: las olas podrían cerrar' : 'Mar muy de lado: pierde fuerza y puede haber corriente lateral';
    } else if (clave === 'fuerza') texto = 'Período corto: olas con poca fuerza';
    else texto = 'La marea podría no acompañar a esta hora';
    return { clave, texto };
  }

  /**
   * Evalúa una hora para un nivel de surf.
   * d: { hTotal, tTotal, dirTotal, swellH, swellT, swellTp, swellDir, swell2H, swell2T, swell2Dir,
   *      vientoMarH, vientoMarT, vientoMarTp, vientoMarDir, vientoVel, vientoDir, vientoRacha,
   *      codigoTiempo, esDeDia, marea:{frac}, diasVista }
   * nivel: 'principiante' | 'intermedio' | 'pro'
   */
  // De noche la nota es 1 en todos los niveles (tope de seguridad: horas de luz)
  function evaluar(d, playa, nivel, atlasPlaya) {
    const r = evaluarNivel(d, playa, nivel, atlasPlaya);
    if (d?.esDeDia === false) {
      r.nota = 1; r.rango = null;
      r.limitante = { clave: 'noche', texto: 'De noche: sin luz para entrar al agua' };
    }
    return r;
  }

  function evaluarNivel(d, playa, nivel, atlasPlaya) {
    if (nivel === 'banista') return evaluarBano(d, playa, atlasPlaya);
    const ev = evaluarSurf(d, playa, nivel, atlasPlaya);
    const dias = clamp(d.diasVista ?? 0, 0, 10);

    // Confianza: 9 combinaciones (dirección × altura/viento)
    const notas = [];
    let peor = ev;
    for (const dDir of [-10, 0, 10]) for (const s of [-1, 0, 1]) {
      const e = evaluarSurf(perturbar(d, dDir, s, dias), playa, nivel, atlasPlaya);
      notas.push(e.bruto);
      if (e.hb > peor.hb || e.tpTopes > peor.tpTopes) peor = e;
    }
    // Topes con el extremo alto del rango
    const ts = topes(nivel, { ...peor, tpTopes: Math.max(peor.tpTopes, ev.tpTopes) }, d);
    const maxTope = ts.reduce((m, t) => Math.min(m, t.max), 10);
    const aplicar = v => Math.min(Math.round(v), maxTope);
    const nota = clamp(aplicar(ev.bruto), 1, 10);
    const notasT = notas.map(v => clamp(aplicar(v), 1, 10));
    const rango = [Math.min(...notasT, nota), Math.max(...notasT, nota)];
    const ancho = rango[1] - rango[0];
    let nivelConf = ancho <= 1 ? 2 : ancho <= 3 ? 1 : 0;           // 2 alta, 1 media, 0 baja
    if (!playa?.validada) nivelConf = Math.max(0, nivelConf - 1);   // ninguna playa validada aún
    const confianza = ['baja', 'media', 'alta'][nivelConf];

    const lim = textoLimitante(ev, nivel, playa);
    const avisos = ts.map(t => t.motivo);
    if (d.esDeDia === false) avisos.push('Fuera de horas de luz: no recomendado');

    return {
      motor: VERSION,
      nota,
      rango: ancho >= 2 ? rango : null,
      confianza,
      hb: ev.hb,
      hLocal: ev.hLocal,
      // período dominante en la playa (el de la partición con más energía local)
      periodoLocal: ev.parts.reduce((m, p) => (p.T * p.hLocal * p.hLocal > m.e ? { e: p.T * p.hLocal * p.hLocal, T: p.T } : m), { e: -1, T: null }).T,
      particiones: ev.parts,
      factores: ev.factores,
      viento: ev.viento,
      limitante: lim,
      avisos,
      topeAplicado: maxTope < 10 ? maxTope : null,
      Q: ev.Q, angulo: ev.angulo, tpDominante: ev.tpDominante,
      potenciaMar: potencia(d.hTotal, d.swellTp ?? d.tTotal),
      potenciaLlega: potencia(ev.hLocal, ev.parts.length ? ev.parts.reduce((m, p) => p.hLocal > m.h ? { h: p.hLocal, T: p.T } : m, { h: -1, T: 10 }).T : null),
    };
  }

  // ---------------------------------------------------------------- baño (lógica separada)
  function evaluarBano(d, playa, atlasPlaya) {
    const parts = prepararParticiones(d, playa, atlasPlaya);
    const hLocal = Math.sqrt(parts.reduce((s, p) => s + p.hLocal * p.hLocal, 0));
    const hb = alturaRompiente(parts);
    const tp = parts.filter(p => p.hLocal >= 0.3).reduce((m, p) => Math.max(m, p.T), 0);
    // Mar: ideal ≤ 0,4 m de rompiente, aceptable hasta 0,7
    const fMar = hb <= 0.4 ? 1 : hb <= 0.7 ? lerp(hb, 0.4, 0.7, 1, 0.6) : lerp(hb, 0.7, 1.0, 0.6, 0.2);
    // Viento: el de tierra es el malo (arrastra flotadores); el de mar flojo es neutro
    let fV = 1;
    const vel = d.vientoVel, dir = d.vientoDir;
    let tipoV = null;
    if (valido(vel) && valido(dir) && vel >= 8) {
      tipoV = clasificarViento(dir, playa, atlasPlaya).tipo;
      if (tipoV === 'off') fV = lerp(vel, 8, 25, 0.9, 0.45);
      else fV = lerp(vel, 12, 35, 1, 0.4);
    }
    // Agua: confort orientativo
    const ta = d.tempAgua;
    const fAgua = !valido(ta) ? 1 : ta >= 18 ? 1 : ta >= 15 ? 0.9 : 0.8;
    let nota = Math.round(1 + 9 * fMar * fV * fAgua);
    const avisos = [];
    const cap = (max, motivo) => { nota = Math.min(nota, max); avisos.push(motivo); };
    if (valido(d.codigoTiempo) && d.codigoTiempo >= 95) cap(1, 'Posible tormenta eléctrica');
    if (hb > 1.0) cap(2, 'Mar movido: precaución en el baño');
    if (tp >= 14 && hb > 0.3) cap(2, 'Mar de fondo largo: podrían entrar series inesperadas');
    else if (tp >= 13 && hb > 0.5) cap(4, 'Mar de fondo largo: podrían entrar series inesperadas');
    if (tipoV === 'off' && vel > 30) cap(2, 'Viento de tierra fuerte: podría arrastrar flotadores mar adentro');
    else if (tipoV === 'off' && vel > 20) cap(4, 'Viento de tierra: podría arrastrar flotadores mar adentro');
    if (hb > 0.8) avisos.push('Con este mar podrían formarse corrientes de resaca');
    if (d.esDeDia === false) avisos.push('Fuera de horas de luz: no recomendado');
    nota = clamp(nota, 1, 10);
    const lim = fMar <= Math.min(fV, fAgua) ? 'el estado del mar' : fV <= fAgua ? 'el viento' : 'la temperatura del agua';
    return {
      motor: VERSION, nota, rango: null, confianza: playa?.validada ? 'media' : 'baja', hb, hLocal,
      particiones: parts, factores: { mar: fMar, viento: fV, agua: fAgua },
      viento: { etiqueta: tipoV ?? 'GLASSY', tipo: tipoV },
      limitante: { clave: lim, texto: Math.min(fMar, fV, fAgua) >= 0.85 ? 'Ningún factor parece limitar mucho' : `Lo que más resta: ${lim}` },
      avisos, topeAplicado: null, potenciaMar: potencia(d.hTotal, d.tTotal), potenciaLlega: null,
      esBano: true,
    };
  }

  // ---------------------------------------------------------------- frase de la tarjeta principal
  // Se construye solo con los datos (tamaño en la playa y viento), igual para todas las playas.
  // Tamaño: altura de rompiente con referencias del cuerpo de un adulto de pie.
  function tallaTexto(hb) {
    if (!valido(hb)) return null;
    if (hb < 0.25) return 'casi sin ola';
    if (hb < 0.5) return 'olas por la rodilla';
    if (hb < 0.85) return 'olas por la cintura';
    if (hb < 1.25) return 'olas por el pecho';
    if (hb < 1.7) return 'olas por la cabeza';
    if (hb < 2.4) return 'olas de más de una cabeza';
    return 'olas de dos cabezas o más';
  }
  function superficieTexto(r) {
    const v = r.viento || {};
    const desordenado = r.factores?.limpieza != null && r.factores.limpieza < 0.7;
    let t;
    if (v.tipo === 'glassy') t = 'sin apenas viento';
    else if (v.tipo === 'off') t = 'con viento de tierra';
    else if (v.tipo === 'cross') t = 'con viento cruzado';
    else if (v.tipo === 'on') t = 'con viento de mar';
    else t = null;
    if (desordenado) t = t ? `${t} y mar desordenado` : 'con mar desordenado';
    return t;
  }
  // Sin traducir el tamaño a referencias del cuerpo (demasiado arriesgado): solo viento y orden del mar.
  function frase(r) {
    if (!r) return '';
    const v = r.viento || {};
    let t = v.tipo === 'glassy' ? 'Sin apenas viento' : v.tipo === 'off' ? 'Viento de tierra'
      : v.tipo === 'cross' ? 'Viento cruzado' : v.tipo === 'on' ? 'Viento de mar' : '';
    if (!r.esBano && r.factores?.limpieza != null && r.factores.limpieza < 0.7) t = t ? `${t}, mar desordenado` : 'Mar desordenado';
    return t || 'Sin datos de viento';
  }

  // Titular y detalle de la tarjeta: si la nota es baja, manda lo que la hunde (no «Sin apenas
  // viento» con un 1); si es buena, el estado del viento/mar y debajo el veredicto para el nivel.
  function titular(r) {
    if (!r) return { titulo: '', detalle: '' };
    const f = frase(r), lim = r.limitante?.texto || '';
    if (r.nota <= 6 && r.limitante?.clave) return { titulo: lim, detalle: f };
    return { titulo: f, detalle: lim };
  }

  const API = {
    VERSION, PERIODOS, NIVELES, CAPACIDAD_TIPO,
    evaluar, evaluarBano, transmision, factorBatimetria, calidadQ: (d, playa, nivel, atlas) => evaluarSurf(d, playa, nivel, atlas).Q, factorFuerza, factorForma, factorPendiente, anguloLlegada, alturaRompiente, potencia, factorTamano, factorViento, factorCruce, factorMarea,
    clasificarViento, direccionOffshore, prepararParticiones, frase, titular, tallaTexto,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  global.MotorV1 = API;
})(typeof window !== 'undefined' ? window : globalThis);
