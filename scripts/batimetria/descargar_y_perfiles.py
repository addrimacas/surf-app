#!/usr/bin/env python3
"""Batimetría (paso 1 del cálculo con fondo, ronda 6).

Descarga el DTM de EMODnet (~115 m) de la costa gallega por WCS y, para cada playa, saca el perfil
del fondo mar adentro siguiendo la normal de la costa: profundidad cada 50 m, distancia a las
isóbatas de 2, 5, 10, 20, 50 y 100 m, y pendiente media entre 2 y 10 m (tanβ, para el número de
Iribarren). Guarda la malla comprimida (data/batimetria-galicia.npz) para el trazado de rayos
(paso 2) y el resumen por playa en data/batimetria-playas.json.
"""
import io, json, math, os, re, sys, urllib.request
import numpy as np
import tifffile

RAIZ = os.path.join(os.path.dirname(__file__), '..', '..')
BBOX = dict(lat0=41.80, lat1=43.85, lon0=-9.45, lon1=-7.00)
COBERTURAS = ['emodnet__mean', 'emodnet:mean', 'emodnet__mean_2022', 'emodnet:mean_2022']


def descargar():
    # Capacidades del servicio (para ver los nombres reales de las coberturas)
    try:
        with urllib.request.urlopen('https://ows.emodnet-bathymetry.eu/wcs?service=WCS&version=2.0.1&request=GetCapabilities', timeout=120) as r:
            cap = r.read().decode('utf8', 'replace')
        ids = re.findall(r'<wcs:CoverageId>([^<]+)</wcs:CoverageId>', cap)
        print('Coberturas WCS:', ids[:40])
        COBERTURAS[:0] = [i for i in ids if 'mean' in i.lower()][:4]
    except Exception as e:
        print('GetCapabilities error', e)
    for cov in COBERTURAS:
        u = ('https://ows.emodnet-bathymetry.eu/wcs?service=WCS&version=2.0.1&request=GetCoverage'
             f'&coverageId={cov}&subset=Lat({BBOX["lat0"]},{BBOX["lat1"]})&subset=Long({BBOX["lon0"]},{BBOX["lon1"]})'
             '&format=image/tiff')
        for intento in range(6):
            try:
                with urllib.request.urlopen(u, timeout=300) as r:
                    datos = r.read()
                if datos[:2] in (b'II', b'MM'):
                    print('WCS OK', cov, len(datos), 'bytes')
                    return datos
                print('WCS', cov, 'no es TIFF:', datos[:600]); break
            except Exception as e:
                print('WCS', cov, 'intento', intento + 1, 'error', e)
                import time; time.sleep(45 * (intento + 1))
    sys.exit('No se pudo descargar la batimetría')


def leer(datos):
    with tifffile.TiffFile(io.BytesIO(datos)) as tif:
        pag = tif.pages[0]
        z = pag.asarray().astype('float32')
        if z.ndim == 3: z = z[..., 0] if z.shape[-1] < 5 else z[0]
        print('etiquetas TIFF:', [t.name for t in pag.tags.values()][:40])
        escala = pag.tags.get('ModelPixelScaleTag'); punto = pag.tags.get('ModelTiepointTag')
        trans = pag.tags.get('ModelTransformationTag')
        nodata = pag.tags.get('GDAL_NODATA')
    ny, nx = z.shape
    if escala is not None and punto is not None:
        dx, dy = escala.value[0], escala.value[1]; lon0, lat0 = punto.value[3], punto.value[4]
    elif trans is not None:
        m = trans.value; dx, dy = m[0], -m[5]; lon0, lat0 = m[3], m[7]
    else:
        # sin georreferencia en el fichero: la da la caja pedida
        dx = (BBOX['lon1'] - BBOX['lon0']) / nx; dy = (BBOX['lat1'] - BBOX['lat0']) / ny
        lon0, lat0 = BBOX['lon0'], BBOX['lat1']
    print('georreferencia', lon0, lat0, dx, dy, 'forma', z.shape)
    if nodata is not None:
        try: z[z == float(nodata.value)] = np.nan
        except Exception: pass
    z[np.abs(z) > 12000] = np.nan
    return z, lon0, lat0, dx, dy


def cargar_playas():
    txt = open(os.path.join(RAIZ, 'beach-data.js'), encoding='utf8').read()
    playas = []
    for m in re.finditer(r"nombre:'([^']+)',\s*lat:([-\d.]+),\s*lon:([-\d.]+),\s*orient:(\d+)", txt):
        playas.append(dict(nombre=m.group(1), lat=float(m.group(2)), lon=float(m.group(3)), orient=float(m.group(4))))
    return playas


def main():
    z, lon0, lat0, dx, dy = leer(descargar())
    ny, nx = z.shape
    # EMODnet da elevación (negativa en el mar) o profundidad (positiva): se normaliza a profundidad > 0
    mar = np.nanmedian(z[ny // 2, :nx // 5])          # franja oeste: océano
    prof = -z if mar < 0 else z
    print('malla', z.shape, 'paso', dx, dy, 'profundidad oeste', float(np.nanmedian(prof[ny // 2, :nx // 5])))
    np.savez_compressed(os.path.join(RAIZ, 'data', 'batimetria-galicia.npz'),
                        prof=prof.astype('float32'), lon0=lon0, lat0=lat0, dx=dx, dy=dy)

    atlas_txt = open(os.path.join(RAIZ, 'atlas-playas.js'), encoding='utf8').read()

    def normal_atlas(nombre):
        m = re.search(r'"' + re.escape(nombre) + r'":\{[^}]*?"normal":([\d.]+)', atlas_txt)
        return float(m.group(1)) if m else None

    def h(lat, lon):
        j = int((lon - lon0) / dx); i = int((lat0 - lat) / dy)
        if 0 <= i < ny and 0 <= j < nx:
            v = prof[i, j]
            return None if np.isnan(v) else float(v)
        return None

    res = {}
    for p in cargar_playas():
        rumbo = normal_atlas(p['nombre']) or p['orient']
        r = math.radians(rumbo)
        perfil = []
        for k in range(0, 301):                         # 0–15 km cada 50 m
            d = k * 0.05
            la = p['lat'] + d / 111.2 * math.cos(r)
            lo = p['lon'] + d / (111.2 * math.cos(math.radians(p['lat']))) * math.sin(r)
            perfil.append((round(d, 2), h(la, lo)))
        def dist_a(iso):
            for d, v in perfil:
                if v is not None and v >= iso: return d
            return None
        d2, d10 = dist_a(2), dist_a(10)
        tanb = round((10 - 2) / ((d10 - d2) * 1000), 4) if d2 is not None and d10 is not None and d10 > d2 else None
        res[p['nombre']] = dict(normal=rumbo, isobatas_km={str(i): dist_a(i) for i in (2, 5, 10, 20, 50, 100)},
                                pendiente_2_10m=tanb, perfil=[v if v is None else round(v, 1) for _, v in perfil[::4]])
        print(p['nombre'], 'tanβ', tanb, 'iso', res[p['nombre']]['isobatas_km'])
    json.dump(dict(fuente='EMODnet DTM (WCS)', malla_grados=[dx, dy], playas=res),
              open(os.path.join(RAIZ, 'data', 'batimetria-playas.json'), 'w'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
