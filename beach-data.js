// beach-data.js — datos de playas y cálculo de exposición

const SPOTS = {
  'España': {
    'Galicia': [
      { nombre:'Riazor',         lat:43.3683, lon:-8.4089, orient:315, tol:50, swell:'NO-N',   viento:'SE-S',  hMin:0.8, hMax:2.5, pMin:9  },
      { nombre:'Orzán',          lat:43.3721, lon:-8.4201, orient:300, tol:50, swell:'NO-O',   viento:'SE-S',  hMin:0.8, hMax:2.5, pMin:9  },
      { nombre:'Santa Cristina', lat:43.3950, lon:-8.3200, orient:350, tol:40, swell:'N-NE',   viento:'SO-S',  hMin:0.6, hMax:2.0, pMin:8  },
      { nombre:'Bastiagueiro',   lat:43.3980, lon:-8.3050, orient:350, tol:40, swell:'N-NE',   viento:'SO-S',  hMin:0.6, hMax:2.0, pMin:8  },
      { nombre:'Baldaio',        lat:43.3167, lon:-8.6333, orient:280, tol:50, swell:'O-NO',   viento:'SE-S',  hMin:0.8, hMax:3.0, pMin:10 },
      { nombre:'Razo',           lat:43.2833, lon:-8.6833, orient:275, tol:55, swell:'O-NO',   viento:'SE-S',  hMin:0.8, hMax:3.0, pMin:9  },
      { nombre:'Rebordelo',      lat:43.2600, lon:-8.7500, orient:270, tol:45, swell:'O',      viento:'SE',    hMin:1.0, hMax:3.0, pMin:10 },
      { nombre:'Nemiña',         lat:43.1000, lon:-9.0500, orient:255, tol:50, swell:'OSO-O',  viento:'NE-SE', hMin:0.8, hMax:2.5, pMin:9  },
      { nombre:'Carnota',        lat:42.8833, lon:-9.1000, orient:245, tol:45, swell:'SO-OSO', viento:'NE',    hMin:1.0, hMax:3.5, pMin:11 },
      { nombre:'Lariño',         lat:42.8667, lon:-9.1167, orient:250, tol:45, swell:'SO-O',   viento:'NE',    hMin:1.0, hMax:3.0, pMin:10 },
      { nombre:'Louro',          lat:42.7667, lon:-8.9833, orient:240, tol:40, swell:'SO',     viento:'NE',    hMin:1.2, hMax:3.5, pMin:11 },
      { nombre:'Área (Viveiro)', lat:43.6667, lon:-7.6000, orient:340, tol:45, swell:'N-NO',   viento:'SO-S',  hMin:0.6, hMax:2.0, pMin:8  },
      { nombre:'Llas',           lat:43.7000, lon:-7.5500, orient:345, tol:40, swell:'N-NO',   viento:'SO',    hMin:0.6, hMax:2.0, pMin:8  },
      { nombre:'Esteiro',        lat:43.6500, lon:-7.6500, orient:335, tol:45, swell:'N-NO',   viento:'SO-SE', hMin:0.6, hMax:2.0, pMin:8  },
      { nombre:'Pantín',         lat:43.7167, lon:-7.7000, orient:350, tol:40, swell:'N-NNO',  viento:'SO-S',  hMin:0.8, hMax:2.5, pMin:10 },
      { nombre:'Frouxeira',      lat:43.6833, lon:-7.8833, orient:340, tol:45, swell:'N-NO',   viento:'SO-S',  hMin:0.8, hMax:2.5, pMin:9  },
      { nombre:'Langosteira',    lat:43.1833, lon:-8.9000, orient:260, tol:50, swell:'O-OSO',  viento:'NE-SE', hMin:0.8, hMax:2.5, pMin:9  },
      { nombre:'Rostro',         lat:43.0500, lon:-9.1833, orient:250, tol:40, swell:'OSO-SO', viento:'NE',    hMin:1.0, hMax:3.0, pMin:10 },
    ]
  }
};

// Consulta GEBCO via opentopodata para obtener la profundidad a 1 km offshore
// en la dirección de orientación de la playa
async function calcularProfundidadGEBCO(lat, lon, orientDeg) {
  const rad = orientDeg * Math.PI / 180;
  const offsetKm = 1.0;
  const latOffset = (offsetKm / 111) * Math.cos(rad);
  const lonOffset = (offsetKm / (111 * Math.cos(lat * Math.PI / 180))) * Math.sin(rad);
  const latMar = lat + latOffset;
  const lonMar = lon + lonOffset;
  const res = await fetch(`https://api.opentopodata.org/v1/gebco2020?locations=${latMar},${lonMar}`);
  const data = await res.json();
  const elev = data.results?.[0]?.elevation ?? 0;
  return Math.abs(elev);
}

// Detecta km de mar abierto en la dirección principal de la playa usando Overpass OSM
async function calcularFetchOSM(lat, lon, orientDeg) {
  const maxKm = 200;
  const pasos = [10, 25, 50, 100, 150, 200];
  const rad = orientDeg * Math.PI / 180;
  for (const km of pasos) {
    const latCheck = lat + (km / 111) * Math.cos(rad);
    const lonCheck = lon + (km / (111 * Math.cos(lat * Math.PI / 180))) * Math.sin(rad);
    const query = `[out:json];is_in(${latCheck},${lonCheck})->.a;way(pivot.a)[natural=coastline];out;`;
    const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (data.elements?.length > 0) return km;
  }
  return maxKm;
}

// Calcula exposición para todas las playas y cachea en localStorage
async function inicializarExposicion() {
  const cached = localStorage.getItem('salitre_exposicion');
  if (cached) {
    const datos = JSON.parse(cached);
    for (const pais of Object.values(SPOTS)) {
      for (const region of Object.values(pais)) {
        for (const playa of region) {
          const d = datos[playa.nombre];
          if (d) {
            playa.profundidad = d.profundidad;
            playa.fetch       = d.fetch;
            playa.exposicion  = d.exposicion;
          }
        }
      }
    }
    return;
  }

  const resultado = {};
  for (const pais of Object.values(SPOTS)) {
    for (const region of Object.values(pais)) {
      for (const playa of region) {
        try {
          const profundidad = await calcularProfundidadGEBCO(playa.lat, playa.lon, playa.orient);
          const fetchKm     = await calcularFetchOSM(playa.lat, playa.lon, playa.orient);
          const exposicion  = Math.min(1, (Math.log(fetchKm + 1) / Math.log(201)) * (Math.min(profundidad, 100) / 100));
          playa.profundidad = profundidad;
          playa.fetch       = fetchKm;
          playa.exposicion  = exposicion;
          resultado[playa.nombre] = { profundidad, fetch: fetchKm, exposicion };
        } catch (e) {
          playa.exposicion = 0.5;
        }
      }
    }
  }
  localStorage.setItem('salitre_exposicion', JSON.stringify(resultado));
}
