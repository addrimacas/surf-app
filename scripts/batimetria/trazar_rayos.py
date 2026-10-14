#!/usr/bin/env python3
"""Batimetría (paso 2): trazado de rayos de oleaje sobre el fondo EMODnet para cada playa.

Para cada playa, período Tp ∈ {6…18 s} y dirección de procedencia cada 5°, se lanza un frente de
rayos paralelos desde ~25 km mar adentro y se propagan sobre la batimetría con las ecuaciones de
los rayos (refracción por gradiente de celeridad, ley de Snell local). Se cuenta cuántos rayos
llegan a un disco de 600 m centrado en el punto de 10 m de fondo frente a la playa:

    Kr = sqrt(N · Δ / W)      (Δ = separación inicial, W = anchura del disco)

Kr es el coeficiente de refracción (incluye abrigo y focalización por el fondo): la altura
equivalente en aguas profundas que llega a la playa es Kr·H. Además se guarda la profundidad
mínima que han cruzado los rayos que llegan (bajos que hacen romper antes) y la dirección local
de llegada a 10 m.
Salida: atlas-batimetria.js (lo usa el motor si existe).
"""
import json, math, os, sys, time
import numpy as np

RAIZ = os.path.join(os.path.dirname(__file__), '..', '..')
G = 9.81
PERIODOS = [6, 8, 10, 12, 14, 16, 18]
PASO_DIR = 5
DS = 0.08          # km por paso (menor que la celda de ~115 m)
DIST0 = 25.0       # km mar adentro donde nace el frente
ANCHO = 14.0       # km de frente
DELTA = 0.01       # km entre rayos (≈100 rayos por Kr=1 en el disco)
RADIO = 0.5        # km del disco de llegada


def cargar():
    b = np.load(os.path.join(RAIZ, 'data', 'batimetria-galicia.npz'))
    prof = b['prof'].astype('float64')
    prof[~np.isfinite(prof)] = -1.0                       # sin dato = tierra
    return prof, float(b['lon0']), float(b['lat0']), float(b['dx']), float(b['dy'])


def kh_de(w2h_g):
    """Resuelve w²h/g = kh·tanh(kh) (aprox. de Fenton–McKee, error < 0,1 %)."""
    x = np.maximum(w2h_g, 1e-9)
    return x / np.tanh(np.power(x, 0.75)) ** (2 / 3)


def celeridad(h, T):
    w = 2 * math.pi / T
    hh = np.maximum(h, 0.05)
    kh = kh_de(w * w * hh / G)
    k = kh / hh
    c = w / k
    return np.where(h > 0, c, np.nan)


def main():
    prof, lon0, lat0, dx, dy = cargar()
    ny, nx = prof.shape
    latm = lat0 - dy * ny / 2
    kmx = 111.2 * math.cos(math.radians(latm)) * dx      # km por celda en x
    kmy = 111.2 * dy                                     # km por celda en y
    bat = json.load(open(os.path.join(RAIZ, 'data', 'batimetria-playas.json'), encoding='utf8'))['playas']
    import re
    txt = open(os.path.join(RAIZ, 'beach-data.js'), encoding='utf8').read()
    playas = [dict(nombre=m.group(1), lat=float(m.group(2)), lon=float(m.group(3)))
              for m in re.finditer(r"nombre:'([^']+)',\s*lat:([-\d.]+),\s*lon:([-\d.]+)", txt)]
    solo = sys.argv[1:]  # opcional: nombres de playas a calcular

    # coordenadas km: x hacia el este desde lon0, y hacia el sur desde lat0 (filas)
    def a_km(lat, lon):
        return (lon - lon0) / dx * kmx, (lat0 - lat) / dy * kmy

    salida = {}
    t_ini = time.time()
    campos = {}
    for T in PERIODOS:
        c = celeridad(prof, T)
        cz = np.where(np.isfinite(c), c, 0.0)
        gy, gx = np.gradient(cz, kmy, kmx)               # d/dfila (y hacia el sur), d/dcolumna
        campos[T] = (cz, gx, gy)

    def pesos(x, y):
        j = x / kmx; i = y / kmy
        j0 = np.clip(np.floor(j).astype(int), 0, nx - 2); i0 = np.clip(np.floor(i).astype(int), 0, ny - 2)
        fj = np.clip(j - j0, 0, 1); fi = np.clip(i - i0, 0, 1)
        return i0, j0, fi, fj

    def interp(campo, w):
        i0, j0, fi, fj = w
        return ((campo[i0, j0] * (1 - fj) + campo[i0, j0 + 1] * fj) * (1 - fi)
                + (campo[i0 + 1, j0] * (1 - fj) + campo[i0 + 1, j0 + 1] * fj) * fi)

    for p in playas:
        if solo and p['nombre'] not in solo: continue
        info = bat.get(p['nombre'])
        if not info: continue
        normal = info['normal']
        d10 = info['isobatas_km']['10'] or info['isobatas_km']['5'] or 0.3
        r = math.radians(normal)
        lat10 = p['lat'] + d10 / 111.2 * math.cos(r)
        lon10 = p['lon'] + d10 / (111.2 * math.cos(math.radians(p['lat']))) * math.sin(r)
        X0, Y0 = a_km(lat10, lon10)
        tabla = np.zeros((len(PERIODOS), 360 // PASO_DIR), dtype=float)
        hmin = np.full((len(PERIODOS), 360 // PASO_DIR), np.nan)
        for it, T in enumerate(PERIODOS):
            c, gx, gy = campos[T]
            for idr, desde in enumerate(range(0, 360, PASO_DIR)):
                # solo direcciones que pueden llegar (±100° de la normal)
                dn = (desde - normal + 540) % 360 - 180
                if abs(dn) > 85: continue
                # dirección de propagación (hacia dónde va) en ángulo matemático con y hacia el SUR
                hacia = math.radians((desde + 180) % 360)      # rumbo náutico
                ux, uy = math.sin(hacia), -math.cos(hacia)       # este, sur
                # frente perpendicular, centrado mar adentro del punto de 10 m
                cx, cy = X0 - ux * DIST0, Y0 - uy * DIST0
                s = np.arange(-ANCHO / 2, ANCHO / 2 + 1e-9, DELTA)
                x = cx + s * (-uy); y = cy + s * ux
                ang = np.full_like(x, math.atan2(uy, ux))
                llego = np.zeros_like(x, dtype=bool)
                hm = np.full_like(x, 1e9)
                vivo = interp(c, pesos(x, y)) > 0
                for paso in range(int((DIST0 + 4) / DS)):
                    idx = np.nonzero(vivo)[0]
                    if idx.size == 0: break
                    xv, yv, av = x[idx], y[idx], ang[idx]
                    w = pesos(xv, yv)
                    cv = interp(c, w); hv = interp(prof, w)
                    ok = (cv > 0) & (hv > 0.5)
                    hm[idx] = np.where(ok, np.minimum(hm[idx], hv), hm[idx])
                    dcx = interp(gx, w); dcy = interp(gy, w)
                    av = av + DS * (np.sin(av) * dcx - np.cos(av) * dcy) / np.where(cv > 0, cv, 1.0)
                    xv = xv + DS * np.cos(av); yv = yv + DS * np.sin(av)
                    # lejos del objetivo y alejándose: se descarta
                    dist = np.hypot(xv - X0, yv - Y0)
                    dentro = ok & (dist <= RADIO)
                    x[idx], y[idx], ang[idx] = xv, yv, av
                    llego[idx[dentro]] = True
                    vivo[idx[~ok | dentro | (dist > DIST0 + 6)]] = False
                n = int(llego.sum())
                tabla[it, idr] = math.sqrt(n * DELTA / (2 * RADIO)) if n else 0.0
                if n: hmin[it, idr] = float(np.median(hm[llego]))
        salida[p['nombre']] = dict(
            punto10=[round(lat10, 5), round(lon10, 5)], d10_km=d10,
            kr=[[round(v, 3) for v in fila] for fila in tabla],
            hmin=[[None if not np.isfinite(v) else round(v, 1) for v in fila] for fila in hmin])
        kmax = tabla.max()
        print(f"{p['nombre']}: Kr máx {kmax:.2f} · Kr(12 s, normal) {tabla[3, int(round(normal / PASO_DIR)) % (360 // PASO_DIR)]:.2f} · {time.time() - t_ini:.0f} s", flush=True)

    meta = dict(version=1, generado=time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), fuente='EMODnet DTM ~115 m, trazado de rayos',
                periodos=PERIODOS, pasoDireccion=PASO_DIR, radioLlegada_km=RADIO)
    js = ('// atlas-batimetria.js — GENERADO por scripts/batimetria/trazar_rayos.py (no editar a mano)\n'
          '// Kr[periodo][direccion de procedencia cada 5°]: coeficiente de refracción sobre el fondo hasta 10 m.\n'
          '(function (g) {\n  const A = ' + json.dumps(dict(meta=meta, playas=salida), ensure_ascii=False) + ';\n'
          '  g.ATLAS_BATIMETRIA = A;\n  if (typeof module !== "undefined" && module.exports) module.exports = A;\n'
          '})(typeof window !== "undefined" ? window : globalThis);\n')
    destino = os.path.join(RAIZ, 'atlas-batimetria.js' if not solo else 'atlas-batimetria-prueba.js')
    open(destino, 'w', encoding='utf8').write(js)
    print('escrito', destino)


if __name__ == '__main__':
    main()
