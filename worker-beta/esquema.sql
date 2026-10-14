-- Base de datos D1 «salitre-beta». Pegar entera en la consola de D1 (pestaña «Console») y ejecutar.
CREATE TABLE IF NOT EXISTS valoraciones (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  recibida    TEXT NOT NULL,              -- fecha y hora en que llegó (UTC)
  dispositivo TEXT NOT NULL,              -- identificador anónimo aleatorio del móvil
  playa       TEXT NOT NULL,
  fecha       TEXT NOT NULL,              -- día de la sesión (AAAA-MM-DD, hora de Madrid)
  nota        INTEGER NOT NULL,           -- 1..10 que pone el surfista
  coincidio   TEXT,                       -- si | mas_grande | mas_pequena | null
  perfil      TEXT,
  comentario  TEXT,
  prediccion  TEXT                        -- JSON: nota del modelo, datos del mar, versión del motor
);
CREATE UNIQUE INDEX IF NOT EXISTS val_unica ON valoraciones (dispositivo, playa, fecha);

CREATE TABLE IF NOT EXISTS comentarios (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  recibida    TEXT NOT NULL,
  dispositivo TEXT NOT NULL,
  texto       TEXT NOT NULL,
  playa       TEXT,
  contacto    TEXT,                       -- opcional: solo si la persona quiere respuesta
  version_app TEXT,
  navegador   TEXT
);

-- Avisos («se repite una sesión buena»). Añadido el 14-oct-2026.
CREATE TABLE IF NOT EXISTS suscripciones (
  dispositivo TEXT PRIMARY KEY,
  endpoint    TEXT NOT NULL,
  creada      TEXT NOT NULL,
  activa      INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS avisos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  dispositivo TEXT NOT NULL,
  playa       TEXT,
  objetivo    TEXT,                       -- día del mar parecido (AAAA-MM-DD)
  titulo      TEXT NOT NULL,
  cuerpo      TEXT NOT NULL,
  url         TEXT,
  creado      TEXT NOT NULL,
  entregado   TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS aviso_unico ON avisos (dispositivo, playa, objetivo);

-- Alias opcional de la persona (añadido el 14-oct-2026). En una base ya creada, ejecutar una vez:
ALTER TABLE valoraciones ADD COLUMN alias TEXT;
ALTER TABLE comentarios ADD COLUMN alias TEXT;
