// beach-data.js — datos de playas Galicia
// Orientaciones calculadas geométricamente por perpendicular a línea de costa
// Exposición: modelo GEBCO 7 factores — scripts/calcular-exposicion-v3.js (o v2)
// Última actualización: 2026-04-22

const SPOTS = {
  'España': {
    'Galicia': {

      'Rías Baixas': [
        { nombre:'Patos',        lat:42.1555, lon:-8.8237, orient:215, tol:30, swell:'SO',    viento:'NE',    hMin:0.3, hMax:1.2, pMin:7,  portIHM:'vigo',       exposicion:0.20 },
        { nombre:'Prado',        lat:42.1590, lon:-8.8200, orient:220, tol:30, swell:'SO',    viento:'NE',    hMin:0.3, hMax:1.2, pMin:7,  portIHM:'vigo',       exposicion:0.20 },
        { nombre:'Vao',          lat:42.1978, lon:-8.7928, orient:225, tol:30, swell:'SO',    viento:'NE',    hMin:0.3, hMax:1.5, pMin:7,  portIHM:'vigo',       exposicion:0.22 },
        { nombre:'Samil',        lat:42.2074, lon:-8.7772, orient:255, tol:35, swell:'O-SO',  viento:'NE',    hMin:0.5, hMax:2.0, pMin:8,  portIHM:'vigo',       exposicion:0.35 },
        { nombre:'Nerga',        lat:42.2573, lon:-8.8364, orient:248, tol:35, swell:'O-SO',  viento:'NE',    hMin:0.5, hMax:2.0, pMin:8,  portIHM:'vigo',       exposicion:0.30 },
        { nombre:'Melide',       lat:42.2513, lon:-8.8673, orient:270, tol:35, swell:'O',     viento:'NE',    hMin:0.5, hMax:1.8, pMin:8,  portIHM:'vigo',       exposicion:0.32 },
        { nombre:'Caneliñas',    lat:42.3912, lon:-8.8256, orient:268, tol:35, swell:'O',     viento:'NE',    hMin:0.5, hMax:1.8, pMin:8,  portIHM:'vilagarcia', exposicion:0.38 },
        { nombre:'Canelas',      lat:42.3892, lon:-8.8320, orient:262, tol:35, swell:'O-SO',  viento:'NE',    hMin:0.5, hMax:1.8, pMin:8,  portIHM:'vilagarcia', exposicion:0.36 },
        { nombre:'Montalvo',     lat:42.3961, lon:-8.8480, orient:268, tol:40, swell:'O',     viento:'NE',    hMin:0.6, hMax:2.0, pMin:9,  portIHM:'vilagarcia', exposicion:0.50 },
        { nombre:'Foxos',        lat:42.4264, lon:-8.8746, orient:250, tol:45, swell:'O',     viento:'NE-E',  hMin:0.8, hMax:2.5, pMin:9,  portIHM:'vilagarcia', exposicion:0.65 },
        { nombre:'Lanzada',      lat:42.4401, lon:-8.8723, orient:275, tol:55, swell:'O',     viento:'NE-E',  hMin:0.8, hMax:3.0, pMin:9,  portIHM:'vilagarcia', exposicion:0.75 },
      ],

      'Costa de Barbanza': [
        { nombre:'Vilar',        lat:42.5530, lon:-9.0300, orient:225, tol:40, swell:'SO-O',  viento:'NE',    hMin:0.8, hMax:2.5, pMin:9,  portIHM:'portosin',   exposicion:0.40 },
        { nombre:'Ladeira',      lat:42.5780, lon:-9.0589, orient:260, tol:45, swell:'O',     viento:'NE',    hMin:0.8, hMax:2.5, pMin:9,  portIHM:'portosin',   exposicion:0.60 },
        { nombre:'Balieiros',    lat:42.5805, lon:-9.0783, orient:270, tol:45, swell:'O',     viento:'NE',    hMin:0.8, hMax:2.5, pMin:9,  portIHM:'portosin',   exposicion:0.62 },
        { nombre:'Seráns',       lat:42.6028, lon:-9.0621, orient:265, tol:45, swell:'O-SO',  viento:'NE',    hMin:0.8, hMax:2.5, pMin:9,  portIHM:'portosin',   exposicion:0.65 },
        { nombre:'Furnas',       lat:42.6396, lon:-9.0391, orient:235, tol:45, swell:'O-SO',  viento:'NE',    hMin:0.8, hMax:2.5, pMin:9,  portIHM:'portosin',   exposicion:0.65 },
        { nombre:'Río Sieira',   lat:42.6469, lon:-9.0364, orient:230, tol:45, swell:'O-SO',  viento:'NE',    hMin:0.8, hMax:2.5, pMin:9,  portIHM:'portosin',   exposicion:0.65 },
        { nombre:'Queiruga',     lat:42.6762, lon:-9.0309, orient:245, tol:45, swell:'O',     viento:'NE',    hMin:0.8, hMax:3.0, pMin:10, portIHM:'portosin',   exposicion:0.70 },
        { nombre:'Baroña',       lat:42.6912, lon:-9.0278, orient:260, tol:40, swell:'O',     viento:'NE',    hMin:0.8, hMax:2.5, pMin:9,  portIHM:'portosin',   exposicion:0.65 },
        { nombre:'Fonforrón',    lat:42.7178, lon:-9.0081, orient:272, tol:45, swell:'O',     viento:'NE',    hMin:0.8, hMax:2.5, pMin:9,  portIHM:'portosin',   exposicion:0.70 },
        { nombre:'Aguieira',     lat:42.7402, lon:-8.9746, orient:275, tol:45, swell:'O',     viento:'NE',    hMin:0.8, hMax:2.5, pMin:9,  portIHM:'portosin',   exposicion:0.72 },
      ],

      'Costa da Morte': [
        { nombre:'Ancoradoiro',  lat:42.7558, lon:-9.1007, orient:255, tol:45, swell:'O-SO',  viento:'NE',    hMin:1.0, hMax:3.0, pMin:10, portIHM:'portosin',   exposicion:0.75 },
        { nombre:'Lariño',       lat:42.7706, lon:-9.1228, orient:250, tol:45, swell:'O-SO',  viento:'NE',    hMin:1.0, hMax:3.0, pMin:10, portIHM:'portosin',   exposicion:0.85 },
        { nombre:'Carnota',      lat:42.8292, lon:-9.1051, orient:250, tol:55, swell:'SO-O',  viento:'NE',    hMin:1.0, hMax:3.5, pMin:11, portIHM:'portosin',   exposicion:0.90 },
        { nombre:'Mar de Fora',  lat:42.9083, lon:-9.2746, orient:278, tol:55, swell:'O',     viento:'NE',    hMin:1.0, hMax:3.5, pMin:10, portIHM:'camarinas',  exposicion:0.95 },
        { nombre:'Rostro',       lat:42.9701, lon:-9.2619, orient:290, tol:55, swell:'O',     viento:'NE',    hMin:1.0, hMax:4.0, pMin:10, portIHM:'camarinas',  exposicion:1.00 },
        { nombre:'Nemiña',       lat:43.0095, lon:-9.2635, orient:280, tol:55, swell:'O',     viento:'NE-SE', hMin:0.8, hMax:3.0, pMin:9,  portIHM:'camarinas',  exposicion:0.95 },
        { nombre:'Traba',        lat:43.1936, lon:-9.0409, orient:290, tol:45, swell:'O',     viento:'NE-SE', hMin:0.8, hMax:2.5, pMin:9,  portIHM:'camarinas',  exposicion:0.80 },
        { nombre:'Soesto',       lat:43.2139, lon:-9.0213, orient:275, tol:45, swell:'O',     viento:'SE',    hMin:0.8, hMax:2.5, pMin:9,  portIHM:'camarinas',  exposicion:0.80 },
        { nombre:'Seaia',        lat:43.3278, lon:-8.8280, orient:295, tol:45, swell:'O-NO',  viento:'SE',    hMin:0.8, hMax:2.5, pMin:9,  portIHM:'malpica',    exposicion:0.72 },
        { nombre:'Malpica',      lat:43.3231, lon:-8.8141, orient:305, tol:45, swell:'O-NO',  viento:'SE',    hMin:0.8, hMax:2.5, pMin:9,  portIHM:'malpica',    exposicion:0.70 },
        { nombre:'Razo',         lat:43.2911, lon:-8.7021, orient:312, tol:55, swell:'O-NO',  viento:'SE-S',  hMin:0.8, hMax:3.0, pMin:9,  portIHM:'malpica',    exposicion:0.81 },
        { nombre:'Baldaio',      lat:43.3004, lon:-8.6678, orient:310, tol:55, swell:'O-NO',  viento:'SE-S',  hMin:0.8, hMax:3.0, pMin:10, portIHM:'malpica',    exposicion:0.75 },
      ],

      'Costa Coruñesa': [
        { nombre:'Caión',         lat:43.3157, lon:-8.6094, orient:314, tol:45, swell:'NO-O',  viento:'SE-S',  hMin:0.8, hMax:2.5, pMin:9,  portIHM:'coruna',     exposicion:0.68 },
        { nombre:'Barrañán',      lat:43.3112, lon:-8.5512, orient:310, tol:45, swell:'NO-O',  viento:'SE-S',  hMin:0.8, hMax:2.5, pMin:9,  portIHM:'coruna',     exposicion:0.65 },
        { nombre:'Valcovo',       lat:43.3160, lon:-8.5331, orient:295, tol:45, swell:'NO-O',  viento:'SE-S',  hMin:0.7, hMax:2.0, pMin:9,  portIHM:'coruna',     exposicion:0.60 },
        { nombre:'Repibelo',      lat:43.3226, lon:-8.5215, orient:290, tol:45, swell:'NO-O',  viento:'SE-S',  hMin:0.7, hMax:2.0, pMin:9,  portIHM:'coruna',     exposicion:0.58 },
        { nombre:'Sabón',         lat:43.3278, lon:-8.5098, orient:290, tol:45, swell:'NO-O',  viento:'SE-S',  hMin:0.7, hMax:2.0, pMin:9,  portIHM:'coruna',     exposicion:0.55 },
        { nombre:'Orzán',         lat:43.3739, lon:-8.4033, orient:300, tol:50, swell:'NO-O',  viento:'SE-S',  hMin:0.8, hMax:2.5, pMin:9,  portIHM:'coruna',     exposicion:0.50 },
        { nombre:'Riazor',        lat:43.3683, lon:-8.4089, orient:330, tol:50, swell:'NO-N',  viento:'SE-S',  hMin:0.8, hMax:2.5, pMin:9,  portIHM:'coruna',     exposicion:0.45 },
        { nombre:'Matadero',      lat:43.3755, lon:-8.4036, orient:300, tol:45, swell:'NO-O',  viento:'SE-S',  hMin:0.7, hMax:2.0, pMin:9,  portIHM:'coruna',     exposicion:0.42 },
        { nombre:'Santa Cristina',lat:43.3393, lon:-8.3769, orient:10, tol:40, swell:'N-NO',  viento:'SO-S',  hMin:0.6, hMax:2.0, pMin:8,  portIHM:'sada',       exposicion:0.28 },
        { nombre:'Bastiagueiro',  lat:43.3408, lon:-8.3635, orient:350, tol:40, swell:'N-NO',  viento:'SO-S',  hMin:0.6, hMax:2.0, pMin:8,  portIHM:'sada',       exposicion:0.28 },
      ],

      'Ferrolterra': [
        { nombre:'Doniños',    lat:43.5001, lon:-8.3188, orient:335, tol:45, swell:'N-NO',  viento:'SO-S',  hMin:0.8, hMax:2.5, pMin:9,  portIHM:'ferrol',  exposicion:0.65 },
        { nombre:'San Jorge',  lat:43.5321, lon:-8.2972, orient:338, tol:45, swell:'N-NO',  viento:'SO',    hMin:0.8, hMax:2.5, pMin:9,  portIHM:'ferrol',  exposicion:0.68 },
        { nombre:'Santa Comba',lat:43.5562, lon:-8.2908, orient:340, tol:45, swell:'N-NO',  viento:'SO',    hMin:0.8, hMax:2.5, pMin:9,  portIHM:'ferrol',  exposicion:0.70 },
        { nombre:'Ponzos',     lat:43.5550, lon:-8.2692, orient:342, tol:45, swell:'N-NO',  viento:'SO',    hMin:0.8, hMax:2.5, pMin:9,  portIHM:'ferrol',  exposicion:0.72 },
        { nombre:'Campelo',    lat:43.5831, lon:-8.2155, orient:345, tol:45, swell:'N-NO',  viento:'SO',    hMin:0.8, hMax:2.5, pMin:9,  portIHM:'ferrol',  exposicion:0.72 },
        { nombre:'Valdoviño',  lat:43.6150, lon:-8.1526, orient:348, tol:45, swell:'N-NO',  viento:'SO-S',  hMin:0.8, hMax:2.5, pMin:9,  portIHM:'cedeira', exposicion:0.75 },
        { nombre:'Pantín',     lat:43.6405, lon:-8.1124, orient:340, tol:55, swell:'N-NO',  viento:'SO-S',  hMin:0.8, hMax:2.5, pMin:10, portIHM:'cedeira', exposicion:0.78 },
        { nombre:'Vilarrube',  lat:43.6422, lon:-8.0718, orient:340, tol:45, swell:'N-NO',  viento:'SO-S',  hMin:0.8, hMax:2.5, pMin:9,  portIHM:'cedeira', exposicion:0.70 },
      ],

    }
  }
};

// Devuelve todas las playas como array plano
function todasLasPlayas() {
  return Object.values(SPOTS['España']['Galicia']).flat();
}

// Calcula exposición para todas las playas (ya incluida en los datos)
// Mantenemos la función por compatibilidad pero no hace llamadas de red
async function inicializarExposicion() {
  // Los valores de exposición ya están hardcodeados en SPOTS
  // No se necesita calcular nada
  console.log('=== EXPOSICIÓN (hardcoded) ===');
  todasLasPlayas().forEach(p =>
    console.log(`[exposición] ${p.nombre}: exp=${p.exposicion?.toFixed(3)}`)
  );
}
