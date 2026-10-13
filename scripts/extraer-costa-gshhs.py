#!/usr/bin/env python3
"""
extraer-costa-gshhs.py — genera data/costa-galicia-gshhs-f.geojson

Recorta la línea de costa GSHHG en resolución completa ("f") a la zona de Galicia
(lon -12..-4.5, lat 40.5..45.5) y la guarda como GeoJSON. Solo hace falta ejecutarlo
si se quiere regenerar el archivo o ampliar la zona.

Fuente: GSHHG (Wessel & Smith), tal como la distribuye el paquete PyPI
"basemap-data-hires" (archivos gshhs_f.dat / gshhsmeta_f.dat). Licencia LGPL.

Uso:
  pip install shapely numpy
  pip download --no-deps basemap-data-hires   # y descomprimir el .whl (es un zip)
  python3 scripts/extraer-costa-gshhs.py RUTA/mpl_toolkits/basemap_data data/costa-galicia-gshhs-f.geojson
"""
import json, sys
import numpy as np
from shapely.geometry import Polygon, box, mapping
from shapely.ops import unary_union

BBOX = (-12.0, 40.5, -4.5, 45.5)

def main(dir_datos, salida):
    zona = box(*BBOX)
    datos = open(f"{dir_datos}/gshhs_f.dat", "rb").read()
    poligonos = []
    for linea in open(f"{dir_datos}/gshhsmeta_f.dat"):
        f = linea.split()
        nivel, n, lat0, lat1, off, nbytes = int(f[0]), int(f[2]), float(f[3]), float(f[4]), int(f[5]), int(f[6])
        if nivel != 1 or lat1 < BBOX[1] or lat0 > BBOX[3]:
            continue  # nivel 1 = tierra frente a océano
        xy = np.frombuffer(datos[off:off + nbytes], dtype="<f4").reshape(-1, 2).astype(float)
        xy[xy[:, 0] > 180, 0] -= 360
        if xy[:, 0].max() < BBOX[0] or xy[:, 0].min() > BBOX[2]:
            continue
        p = Polygon(xy).buffer(0)
        if p.intersects(zona):
            poligonos.append(p.intersection(zona))
    tierra = unary_union(poligonos)
    geo = {
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {"fuente": "GSHHG full (basemap-data-hires)", "bbox": BBOX},
            "geometry": json.loads(json.dumps(mapping(tierra), default=float)),
        }],
    }
    # 5 decimales (~1 m) para reducir tamaño
    def redondear(o):
        if isinstance(o, float): return round(o, 5)
        if isinstance(o, (list, tuple)): return [redondear(x) for x in o]
        if isinstance(o, dict): return {k: redondear(v) for k, v in o.items()}
        return o
    json.dump(redondear(geo), open(salida, "w"), separators=(",", ":"))
    print(f"{salida}: {len(getattr(tierra, 'geoms', [tierra]))} polígonos")

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
