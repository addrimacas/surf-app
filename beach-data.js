// beach-data.js — datos de playas Galicia
// Orientaciones calculadas geométricamente por perpendicular a línea de costa
// Exposición: modelo GEBCO 7 factores — scripts/calcular-exposicion-v3.js (o v2)
// Última actualización: 2026-04-28
//
// Opcional por spot: orientArcMin/orientArcMax/orientComputed/exposureAngular (ver scripts/experiments/orientacion/).

const SPOTS = {
  'España': {
    'Galicia': {

      'Rías Baixas': [
        { nombre:'Patos',        lat:42.1555, lon:-8.8237, orient:215, tol:30, swell:'SO',    viento:'NE',    hMin:0.3, hMax:1.2, pMin:7,  portIHM:'vigo',       exposicion:0.20, orientArcMin:275, orientArcMax:340, orientComputed:306, exposureAngular:0.214 },
        { nombre:'Prado',        lat:42.1590, lon:-8.8200, orient:220, tol:30, swell:'SO',    viento:'NE',    hMin:0.3, hMax:1.2, pMin:7,  portIHM:'vigo',       exposicion:0.20, orientArcMin:265, orientArcMax:335, orientComputed:290, exposureAngular:0.198 },
        { nombre:'Vao',          lat:42.1978, lon:-8.7928, orient:225, tol:30, swell:'SO',    viento:'NE',    hMin:0.3, hMax:1.5, pMin:7,  portIHM:'vigo',       exposicion:0.22, orientArcMin:245, orientArcMax:310, orientComputed:276, exposureAngular:0.211 },
        { nombre:'Samil',        lat:42.2074, lon:-8.7772, orient:127, tol:35, swell:'O-SO',  viento:'NE',    hMin:0.5, hMax:2.0, pMin:8,  portIHM:'vigo',       exposicion:0.35, orientArcMin:235, orientArcMax:300, orientComputed:264, exposureAngular:0.189 },
        { nombre:'Nerga',        lat:42.2573, lon:-8.8364, orient:103, tol:35, swell:'O-SO',  viento:'NE',    hMin:0.5, hMax:2.0, pMin:8,  portIHM:'vigo',       exposicion:0.30, orientArcMin:200, orientArcMax:240, orientComputed:216, exposureAngular:0.178 },
        { nombre:'Melide',       lat:42.2513, lon:-8.8673, orient:9, tol:35, swell:'O',     viento:'NE',    hMin:0.5, hMax:1.8, pMin:8,  portIHM:'vigo',       exposicion:0.32, orientArcMin:190, orientArcMax:355, orientComputed:277, exposureAngular:0.474 },
        { nombre:'Caneliñas',    lat:42.3912, lon:-8.8256, orient:85, tol:35, swell:'O',     viento:'NE',    hMin:0.5, hMax:1.8, pMin:8,  portIHM:'vilagarcia', exposicion:0.38, orientArcMin:205, orientArcMax:230, orientComputed:217, exposureAngular:0.184 },
        { nombre:'Canelas',      lat:42.3892, lon:-8.8320, orient:85, tol:35, swell:'O-SO',  viento:'NE',    hMin:0.5, hMax:1.8, pMin:8,  portIHM:'vilagarcia', exposicion:0.36, orientArcMin:195, orientArcMax:280, orientComputed:228, exposureAngular:0.286 },
        { nombre:'Montalvo',     lat:42.3961, lon:-8.8480, orient:93, tol:40, swell:'O',     viento:'NE',    hMin:0.6, hMax:2.0, pMin:9,  portIHM:'vilagarcia', exposicion:0.50, orientArcMin:190, orientArcMax:295, orientComputed:236, exposureAngular:0.264 },
        { nombre:'Foxos',        lat:42.4264, lon:-8.8746, orient:156, tol:45, swell:'O',     viento:'NE-E',  hMin:0.8, hMax:2.5, pMin:9,  portIHM:'vilagarcia', exposicion:0.65, orientArcMin:205, orientArcMax:300, orientComputed:261, exposureAngular:0.246 },
        { nombre:'Lanzada',      lat:42.4401, lon:-8.8723, orient:156, tol:55, swell:'O',     viento:'NE-E',  hMin:0.8, hMax:3.0, pMin:9,  portIHM:'vilagarcia', exposicion:0.75, orientArcMin:200, orientArcMax:280, orientComputed:243, exposureAngular:0.244 },
      ],

      'Costa de Barbanza': [
        { nombre:'Vilar',        lat:42.5530, lon:-9.0300, orient:177, tol:40, swell:'SO-O',  viento:'NE',    hMin:0.8, hMax:2.5, pMin:9,  portIHM:'portosin',   exposicion:0.40, orientArcMin:210, orientArcMax:290, orientComputed:250, exposureAngular:0.253 },
        { nombre:'Ladeira',      lat:42.5780, lon:-9.0589, orient:66, tol:45, swell:'O',     viento:'NE',    hMin:0.8, hMax:2.5, pMin:9,  portIHM:'portosin',   exposicion:0.60, orientArcMin:170, orientArcMax:235, orientComputed:202, exposureAngular:0.212 },
        { nombre:'Balieiros',    lat:42.5805, lon:-9.0783, orient:126, tol:45, swell:'O',     viento:'NE',    hMin:0.8, hMax:2.5, pMin:9,  portIHM:'portosin',   exposicion:0.62, orientArcMin:160, orientArcMax:5, orientComputed:295, exposureAngular:0.348 },
        { nombre:'Seráns',       lat:42.6028, lon:-9.0621, orient:128, tol:45, swell:'O-SO',  viento:'NE',    hMin:0.8, hMax:2.5, pMin:9,  portIHM:'portosin',   exposicion:0.65, orientArcMin:250, orientArcMax:10, orientComputed:295, exposureAngular:0.325 },
        { nombre:'Furnas',       lat:42.6396, lon:-9.0391, orient:153, tol:45, swell:'O-SO',  viento:'NE',    hMin:0.8, hMax:2.5, pMin:9,  portIHM:'portosin',   exposicion:0.65, orientArcMin:220, orientArcMax:330, orientComputed:275, exposureAngular:0.352 },
        { nombre:'Río Sieira',   lat:42.6469, lon:-9.0364, orient:153, tol:45, swell:'O-SO',  viento:'NE',    hMin:0.8, hMax:2.5, pMin:9,  portIHM:'portosin',   exposicion:0.65, orientArcMin:215, orientArcMax:330, orientComputed:273, exposureAngular:0.346 },
        { nombre:'Queiruga',     lat:42.6762, lon:-9.0309, orient:155, tol:45, swell:'O',     viento:'NE',    hMin:0.8, hMax:3.0, pMin:10, portIHM:'portosin',   exposicion:0.70, orientArcMin:230, orientArcMax:320, orientComputed:275, exposureAngular:0.309 },
        { nombre:'Baroña',       lat:42.6912, lon:-9.0278, orient:3, tol:40, swell:'O',     viento:'NE',    hMin:0.8, hMax:2.5, pMin:9,  portIHM:'portosin',   exposicion:0.65, orientArcMin:205, orientArcMax:310, orientComputed:258, exposureAngular:0.343 },
        { nombre:'Fonforrón',    lat:42.7178, lon:-9.0081, orient:170, tol:45, swell:'O',     viento:'NE',    hMin:0.8, hMax:2.5, pMin:9,  portIHM:'portosin',   exposicion:0.70, orientArcMin:225, orientArcMax:285, orientComputed:255, exposureAngular:0.242 },
        { nombre:'Aguieira',     lat:42.7402, lon:-8.9746, orient:105, tol:45, swell:'O',     viento:'NE',    hMin:0.8, hMax:2.5, pMin:9,  portIHM:'portosin',   exposicion:0.72, orientArcMin:285, orientArcMax:35, orientComputed:318, exposureAngular:0.082 },
      ],

      'Costa da Morte': [
        { nombre:'Ancoradoiro',  lat:42.7558, lon:-9.1007, orient:36, tol:45, swell:'O-SO',  viento:'NE',    hMin:1.0, hMax:3.0, pMin:10, portIHM:'portosin',   exposicion:0.75, orientArcMin:175, orientArcMax:250, orientComputed:215, exposureAngular:0.252 },
        { nombre:'Lariño',       lat:42.7706, lon:-9.1228, orient:29, tol:45, swell:'O-SO',  viento:'NE',    hMin:1.0, hMax:3.0, pMin:10, portIHM:'portosin',   exposicion:0.85, orientArcMin:165, orientArcMax:325, orientComputed:245, exposureAngular:0.467 },
        { nombre:'Carnota',      lat:42.8292, lon:-9.1051, orient:171, tol:55, swell:'SO-O',  viento:'NE',    hMin:1.0, hMax:3.5, pMin:11, portIHM:'portosin',   exposicion:0.90, orientArcMin:225, orientArcMax:290, orientComputed:258, exposureAngular:0.243 },
        { nombre:'Mar de Fora',  lat:42.9083, lon:-9.2746, orient:10, tol:55, swell:'O',     viento:'NE',    hMin:1.0, hMax:3.5, pMin:10, portIHM:'camarinas',  exposicion:0.95, orientArcMin:200, orientArcMax:310, orientComputed:255, exposureAngular:0.322 },
        { nombre:'Rostro',       lat:42.9701, lon:-9.2619, orient:141, tol:55, swell:'O',     viento:'NE',    hMin:1.0, hMax:4.0, pMin:10, portIHM:'camarinas',  exposicion:1.00, orientArcMin:225, orientArcMax:340, orientComputed:283, exposureAngular:0.343 },
        { nombre:'Nemiña',       lat:43.0095, lon:-9.2635, orient:42, tol:55, swell:'O',     viento:'NE-SE', hMin:0.8, hMax:3.0, pMin:9,  portIHM:'camarinas',  exposicion:0.95, orientArcMin:200, orientArcMax:270, orientComputed:235, exposureAngular:0.223 },
        { nombre:'Traba',        lat:43.1936, lon:-9.0409, orient:128, tol:45, swell:'O',     viento:'NE-SE', hMin:0.8, hMax:2.5, pMin:9,  portIHM:'camarinas',  exposicion:0.80, orientArcMin:275, orientArcMax:10, orientComputed:320, exposureAngular:0.279 },
        { nombre:'Soesto',       lat:43.2139, lon:-9.0213, orient:27, tol:45, swell:'O',     viento:'SE',    hMin:0.8, hMax:2.5, pMin:9,  portIHM:'camarinas',  exposicion:0.80, orientArcMin:265, orientArcMax:15, orientComputed:322, exposureAngular:0.307 },
        { nombre:'Seaia',        lat:43.3278, lon:-8.8280, orient:76, tol:45, swell:'O-NO',  viento:'SE',    hMin:0.8, hMax:2.5, pMin:9,  portIHM:'malpica',    exposicion:0.72, orientArcMin:0, orientArcMax:90, orientComputed:43, exposureAngular:0.292 },
        { nombre:'Malpica',      lat:43.3231, lon:-8.8141, orient:94, tol:45, swell:'O-NO',  viento:'SE',    hMin:0.8, hMax:2.5, pMin:9,  portIHM:'malpica',    exposicion:0.70, orientArcMin:325, orientArcMax:90, orientComputed:27, exposureAngular:0.383 },
        { nombre:'Razo',         lat:43.2911, lon:-8.7021, orient:95, tol:55, swell:'O-NO',  viento:'SE-S',  hMin:0.8, hMax:3.0, pMin:9,  portIHM:'malpica',    exposicion:0.81, orientArcMin:300, orientArcMax:60, orientComputed:2, exposureAngular:0.353 },
        { nombre:'Baldaio',      lat:43.3004, lon:-8.6678, orient:110, tol:55, swell:'O-NO',  viento:'SE-S',  hMin:0.8, hMax:3.0, pMin:10, portIHM:'malpica',    exposicion:0.75, orientArcMin:290, orientArcMax:60, orientComputed:357, exposureAngular:0.396 },
      ],

      'Costa Coruñesa': [
        { nombre:'Caión',         lat:43.3157, lon:-8.6094, orient:138, tol:45, swell:'NO-O',  viento:'SE-S',  hMin:0.8, hMax:2.5, pMin:9,  portIHM:'coruna',     exposicion:0.68, orientArcMin:280, orientArcMax:55, orientComputed:350, exposureAngular:0.404 },
        { nombre:'Barrañán',      lat:43.3112, lon:-8.5512, orient:100, tol:45, swell:'NO-O',  viento:'SE-S',  hMin:0.8, hMax:2.5, pMin:9,  portIHM:'coruna',     exposicion:0.65, orientArcMin:295, orientArcMax:30, orientComputed:340, exposureAngular:0.279 },
        { nombre:'Valcovo',       lat:43.3160, lon:-8.5331, orient:112, tol:45, swell:'NO-O',  viento:'SE-S',  hMin:0.7, hMax:2.0, pMin:9,  portIHM:'coruna',     exposicion:0.60, orientArcMin:280, orientArcMax:20, orientComputed:330, exposureAngular:0.308 },
        { nombre:'Repibelo',      lat:43.3226, lon:-8.5215, orient:290, tol:45, swell:'NO-O',  viento:'SE-S',  hMin:0.7, hMax:2.0, pMin:9,  portIHM:'coruna',     exposicion:0.58, orientArcMin:270, orientArcMax:20, orientComputed:324, exposureAngular:0.31 },
        { nombre:'Sabón',         lat:43.3278, lon:-8.5098, orient:146, tol:45, swell:'NO-O',  viento:'SE-S',  hMin:0.7, hMax:2.0, pMin:9,  portIHM:'coruna',     exposicion:0.55, orientArcMin:265, orientArcMax:345, orientComputed:308, exposureAngular:0.233 },
        { nombre:'Orzán',         lat:43.3739, lon:-8.4033, orient:85, tol:50, swell:'NO-O',  viento:'SE-S',  hMin:0.8, hMax:2.5, pMin:9,  portIHM:'coruna',     exposicion:0.50, orientArcMin:290, orientArcMax:320, orientComputed:305, exposureAngular:0.154 },
        { nombre:'Riazor',        lat:43.3683, lon:-8.4089, orient:85, tol:50, swell:'NO-N',  viento:'SE-S',  hMin:0.8, hMax:2.5, pMin:9,  portIHM:'coruna',     exposicion:0.45, orientArcMin:310, orientArcMax:355, orientComputed:333, exposureAngular:0.163 },
        { nombre:'Matadero',      lat:43.3755, lon:-8.4036, orient:85, tol:45, swell:'NO-O',  viento:'SE-S',  hMin:0.7, hMax:2.0, pMin:9,  portIHM:'coruna',     exposicion:0.42, orientArcMin:285, orientArcMax:345, orientComputed:309, exposureAngular:0.173 },
        { nombre:'Santa Cristina',lat:43.3393, lon:-8.3769, orient:10, tol:40, swell:'N-NO',  viento:'SO-S',  hMin:0.6, hMax:2.0, pMin:8,  portIHM:'sada',       exposicion:0.28, orientArcMin:345, orientArcMax:5, orientComputed:355, exposureAngular:0.109 },
        { nombre:'Bastiagueiro',  lat:43.3408, lon:-8.3635, orient:350, tol:40, swell:'N-NO',  viento:'SO-S',  hMin:0.6, hMax:2.0, pMin:8,  portIHM:'sada',       exposicion:0.28, orientArcMin:330, orientArcMax:5, orientComputed:348, exposureAngular:0.138 },
      ],

      'Ferrolterra': [
        { nombre:'Doniños',    lat:43.5001, lon:-8.3188, orient:173, tol:45, swell:'N-NO',  viento:'SO-S',  hMin:0.8, hMax:2.5, pMin:9,  portIHM:'ferrol',  exposicion:0.65, orientArcMin:220, orientArcMax:310, orientComputed:270, exposureAngular:0.274 },
        { nombre:'San Jorge',  lat:43.5321, lon:-8.2972, orient:133, tol:45, swell:'N-NO',  viento:'SO',    hMin:0.8, hMax:2.5, pMin:9,  portIHM:'ferrol',  exposicion:0.68, orientArcMin:250, orientArcMax:320, orientComputed:285, exposureAngular:0.215 },
        { nombre:'Santa Comba',lat:43.5562, lon:-8.2908, orient:107, tol:45, swell:'N-NO',  viento:'SO',    hMin:0.8, hMax:2.5, pMin:9,  portIHM:'ferrol',  exposicion:0.70, orientArcMin:315, orientArcMax:45, orientComputed:2, exposureAngular:0.272 },
        { nombre:'Ponzos',     lat:43.5550, lon:-8.2692, orient:70, tol:45, swell:'N-NO',  viento:'SO',    hMin:0.8, hMax:2.5, pMin:9,  portIHM:'ferrol',  exposicion:0.72, orientArcMin:295, orientArcMax:40, orientComputed:348, exposureAngular:0.316 },
        { nombre:'Campelo',    lat:43.5831, lon:-8.2155, orient:125, tol:45, swell:'N-NO',  viento:'SO',    hMin:0.8, hMax:2.5, pMin:9,  portIHM:'ferrol',  exposicion:0.72, orientArcMin:260, orientArcMax:5, orientComputed:310, exposureAngular:0.309 },
        { nombre:'Valdoviño',  lat:43.6150, lon:-8.1526, orient:105, tol:45, swell:'N-NO',  viento:'SO-S',  hMin:0.8, hMax:2.5, pMin:9,  portIHM:'cedeira', exposicion:0.75, orientArcMin:270, orientArcMax:25, orientComputed:330, exposureAngular:0.323 },
        { nombre:'Pantín',     lat:43.6405, lon:-8.1124, orient:116, tol:55, swell:'N-NO',  viento:'SO-S',  hMin:0.8, hMax:2.5, pMin:10, portIHM:'cedeira', exposicion:0.78, orientArcMin:270, orientArcMax:25, orientComputed:328, exposureAngular:0.341 },
        { nombre:'Vilarrube',  lat:43.6422, lon:-8.0718, orient:91, tol:45, swell:'N-NO',  viento:'SO-S',  hMin:0.8, hMax:2.5, pMin:9,  portIHM:'cedeira', exposicion:0.70, orientArcMin:330, orientArcMax:350, orientComputed:340, exposureAngular:0.089 },
      ],

      /** Ortigueira — cabo Ortegal (entre Ferrolterra y Mariña lucense); nombre editable */
      'Costa do Ortegal': [
        { nombre:'A Concha',        lat:43.7178368, lon:-7.8087553, orient:13, tol:48, swell:'N-NO', viento:'SO-S', hMin:0.8, hMax:2.5, pMin:9, portIHM:'cedeira', exposicion:0.74, orientArcMin:325, orientArcMax:25, orientComputed:354, exposureAngular:0.208 },
        { nombre:'San Antón',       lat:43.7233012, lon:-7.7999885, orient:13, tol:48, swell:'N-NO', viento:'SO-S', hMin:0.8, hMax:2.5, pMin:9, portIHM:'cedeira', exposicion:0.74, orientArcMin:315, orientArcMax:10, orientComputed:343, exposureAngular:0.196 },
        { nombre:'Sarridal',        lat:43.7337690, lon:-7.7790428, orient:98, tol:48, swell:'N-NO', viento:'SO-S', hMin:0.8, hMax:2.5, pMin:9, portIHM:'cedeira', exposicion:0.75, orientArcMin:300, orientArcMax:50, orientComputed:355, exposureAngular:0.343 },
      ],

      'Mariña Lucense': [
        { nombre:'Bares',           lat:43.7701186, lon:-7.6756842, orient:125, tol:50, swell:'N-NO', viento:'SO-S', hMin:0.8, hMax:2.5, pMin:9, portIHM:'viveiro', exposicion:0.76, orientArcMin:75, orientArcMax:105, orientComputed:90, exposureAngular:0.131 },
        { nombre:'Esteiro',         lat:43.7109174, lon:-7.5588851, orient:114, tol:48, swell:'N-NO', viento:'SO-S', hMin:0.8, hMax:2.5, pMin:9, portIHM:'viveiro', exposicion:0.74, orientArcMin:315, orientArcMax:5, orientComputed:340, exposureAngular:0.183 },
        { nombre:'Peizás',          lat:43.5881775, lon:-7.2781353, orient:63, tol:48, swell:'N-NO', viento:'SO-S', hMin:0.8, hMax:2.5, pMin:9, portIHM:'ribadeo', exposicion:0.72, orientArcMin:330, orientArcMax:100, orientComputed:32, exposureAngular:0.403 },
        { nombre:'Rapadoira',       lat:43.5725663, lon:-7.2465264, orient:129, tol:48, swell:'N-NO', viento:'SO-S', hMin:0.8, hMax:2.5, pMin:9, portIHM:'ribadeo', exposicion:0.71, orientArcMin:325, orientArcMax:95, orientComputed:27, exposureAngular:0.411 },
        { nombre:'San Cosme',       lat:43.5678639, lon:-7.2424609, orient:35, tol:48, swell:'N-NO', viento:'SO-S', hMin:0.8, hMax:2.5, pMin:9, portIHM:'ribadeo', exposicion:0.71, orientArcMin:335, orientArcMax:90, orientComputed:30, exposureAngular:0.349 },
        { nombre:'Reinante',        lat:43.5570641, lon:-7.1767186, orient:68, tol:48, swell:'N-NO', viento:'SO-S', hMin:0.8, hMax:2.5, pMin:9, portIHM:'ribadeo', exposicion:0.70, orientArcMin:315, orientArcMax:80, orientComputed:17, exposureAngular:0.386 },
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
