-- ============================================================================
-- SIGL — Esquema de base de datos (logística)
-- Se ejecuta UNA sola vez, cuando el volumen de Postgres se crea por primera vez.
-- Para recrearlo desde cero:  ./sigf reset-db
-- pgcrypto: hashea contraseñas en formato bcrypt ($2a$) compatible con bcryptjs.
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- Catálogos / entidades base
-- ----------------------------------------------------------------------------

-- Roles del sistema: admin, transportista, checador
CREATE TABLE rol (
  id      BIGSERIAL PRIMARY KEY,
  id_tipo BIGINT,
  nombre  VARCHAR(50) NOT NULL UNIQUE
);

-- Datos de seguridad social del usuario
CREATE TABLE seguro (
  id     BIGSERIAL PRIMARY KEY,
  nns    VARCHAR(50),
  status VARCHAR(30)
);

-- Usuario que inicia sesión. La columna password guarda el HASH bcrypt.
CREATE TABLE usuario (
  id         BIGSERIAL PRIMARY KEY,
  email      VARCHAR(255) UNIQUE NOT NULL,
  password   VARCHAR(255) NOT NULL,
  nombre     VARCHAR(100),
  apellidos  VARCHAR(100),
  id_rol     BIGINT,
  id_seguro  BIGINT,
  is_admin   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vehículos
CREATE TABLE transporte (
  id         BIGSERIAL PRIMARY KEY,
  num_placas VARCHAR(20),
  clase      VARCHAR(50)
);

-- Conductor (transportista). Vinculado a un usuario y a una ruta.
CREATE TABLE conductor (
  id             BIGSERIAL PRIMARY KEY,
  folio_licencia VARCHAR(50),
  id_ruta        BIGINT,
  id_usuario     BIGINT,
  id_transporte  BIGINT
);

-- Ruta. Vinculada a un conductor y a un transporte.
CREATE TABLE ruta (
  id            BIGSERIAL PRIMARY KEY,
  numero_ruta   BIGINT,
  id_conductor  BIGINT,
  id_transporte BIGINT
);

-- Zona geográfica (punto con lat/lng). nombre = etiqueta legible (ej. "Cántaros").
CREATE TABLE zona (
  id           BIGSERIAL PRIMARY KEY,
  lng          DOUBLE PRECISION,
  lat          DOUBLE PRECISION,
  numero       BIGINT,
  nombre       VARCHAR(100),
  id_zona_ruta BIGINT
);

-- Relación zona <-> ruta, con el orden de paso
CREATE TABLE zona_ruta (
  id      BIGSERIAL PRIMARY KEY,
  id_ruta BIGINT,
  id_zona BIGINT,
  orden   BIGINT
);

-- Checador. Vinculado a un usuario y a una zona.
CREATE TABLE checador (
  id         BIGSERIAL PRIMARY KEY,
  id_usuario BIGINT,
  id_zona    BIGINT
);

-- Viaje: un recorrido concreto de UN transporte (camión) sobre UNA ruta.
-- Permite varios camiones simultáneos en la misma ruta: cada uno tiene su
-- propio viaje "en_curso" y, por tanto, su propia posición y avance.
CREATE TABLE viaje (
  id            BIGSERIAL PRIMARY KEY,
  id_ruta       BIGINT,
  id_transporte BIGINT,
  id_conductor  BIGINT,
  estado        VARCHAR(20) NOT NULL DEFAULT 'en_curso',  -- en_curso | finalizado
  inicio        TIMESTAMPTZ NOT NULL DEFAULT now(),
  fin           TIMESTAMPTZ
);

-- Registro de paso (check) que hace el checador en una zona_ruta.
-- id_viaje liga el paso al recorrido del camión concreto que pasó por la zona.
CREATE TABLE check_in (
  id           BIGSERIAL PRIMARY KEY,
  is_check     BOOLEAN NOT NULL DEFAULT FALSE,
  id_zona_ruta BIGINT,
  id_viaje     BIGINT,
  fecha        VARCHAR(20),
  hora         VARCHAR(20),
  id_checador  BIGINT
);

-- ----------------------------------------------------------------------------
-- Llaves foráneas (al final para resolver las dependencias circulares:
-- conductor <-> ruta  y  zona <-> zona_ruta)
-- ----------------------------------------------------------------------------
ALTER TABLE usuario   ADD CONSTRAINT fk_usuario_rol      FOREIGN KEY (id_rol)       REFERENCES rol(id);
ALTER TABLE usuario   ADD CONSTRAINT fk_usuario_seguro   FOREIGN KEY (id_seguro)    REFERENCES seguro(id);

ALTER TABLE conductor ADD CONSTRAINT fk_conductor_ruta   FOREIGN KEY (id_ruta)      REFERENCES ruta(id);
ALTER TABLE conductor ADD CONSTRAINT fk_conductor_usuario FOREIGN KEY (id_usuario)  REFERENCES usuario(id);

ALTER TABLE ruta      ADD CONSTRAINT fk_ruta_conductor   FOREIGN KEY (id_conductor)  REFERENCES conductor(id);
ALTER TABLE ruta      ADD CONSTRAINT fk_ruta_transporte  FOREIGN KEY (id_transporte) REFERENCES transporte(id);

ALTER TABLE zona      ADD CONSTRAINT fk_zona_zonaruta    FOREIGN KEY (id_zona_ruta)  REFERENCES zona_ruta(id);

ALTER TABLE zona_ruta ADD CONSTRAINT fk_zonaruta_ruta    FOREIGN KEY (id_ruta)       REFERENCES ruta(id);
ALTER TABLE zona_ruta ADD CONSTRAINT fk_zonaruta_zona    FOREIGN KEY (id_zona)       REFERENCES zona(id);

ALTER TABLE checador  ADD CONSTRAINT fk_checador_usuario FOREIGN KEY (id_usuario)    REFERENCES usuario(id);
ALTER TABLE checador  ADD CONSTRAINT fk_checador_zona    FOREIGN KEY (id_zona)       REFERENCES zona(id);

ALTER TABLE viaje     ADD CONSTRAINT fk_viaje_ruta       FOREIGN KEY (id_ruta)       REFERENCES ruta(id);
ALTER TABLE viaje     ADD CONSTRAINT fk_viaje_transporte FOREIGN KEY (id_transporte) REFERENCES transporte(id);
ALTER TABLE viaje     ADD CONSTRAINT fk_viaje_conductor  FOREIGN KEY (id_conductor)  REFERENCES conductor(id);

ALTER TABLE check_in  ADD CONSTRAINT fk_checkin_zonaruta FOREIGN KEY (id_zona_ruta)  REFERENCES zona_ruta(id);
ALTER TABLE check_in  ADD CONSTRAINT fk_checkin_viaje    FOREIGN KEY (id_viaje)      REFERENCES viaje(id);
ALTER TABLE check_in  ADD CONSTRAINT fk_checkin_checador FOREIGN KEY (id_checador)   REFERENCES checador(id);

-- ----------------------------------------------------------------------------
-- Datos semilla
-- ----------------------------------------------------------------------------
INSERT INTO rol (id_tipo, nombre) VALUES
  (1, 'admin'),
  (2, 'transportista'),
  (3, 'checador')
ON CONFLICT (nombre) DO NOTHING;

-- Un usuario de prueba por rol. Contraseña para todos: admin123
-- (carlos = segundo transportista para tener 2 camiones simultáneos en la ruta 100)
INSERT INTO usuario (email, password, nombre, apellidos, id_rol, is_admin) VALUES
  ('admin@sigl.com',          crypt('admin123', gen_salt('bf')), 'Admin',  'General', (SELECT id FROM rol WHERE nombre = 'admin'),         TRUE),
  ('transportista@sigl.com',  crypt('admin123', gen_salt('bf')), 'Juan',   'Pérez',   (SELECT id FROM rol WHERE nombre = 'transportista'), FALSE),
  ('transportista2@sigl.com', crypt('admin123', gen_salt('bf')), 'Carlos', 'Ramírez', (SELECT id FROM rol WHERE nombre = 'transportista'), FALSE),
  ('checador@sigl.com',       crypt('admin123', gen_salt('bf')), 'María',  'López',   (SELECT id FROM rol WHERE nombre = 'checador'),      FALSE)
ON CONFLICT (email) DO NOTHING;

-- Transportes (camiones)
INSERT INTO transporte (num_placas, clase) VALUES
  ('ABC-100', 'Autobús'),
  ('XYZ-200', 'Autobús'),
  ('JKL-300', 'Microbús');

-- ----------------------------------------------------------------------------
-- Datos de ejemplo para el panel (zonas, rutas y avance)
-- Ruta 100 -> 3 zonas, 2 con check-in  (≈67%)
-- Ruta 200 -> 3 zonas, 1 con check-in  (≈33%)
-- ----------------------------------------------------------------------------
INSERT INTO zona (numero, nombre, lat, lng) VALUES
  (1, 'Constitución', 19.4326, -99.1332),
  (2, 'Cántaros',     19.4400, -99.1400),
  (3, 'Centro',       19.4500, -99.1500),
  (4, 'Alameda',      19.4600, -99.1600),
  (5, 'Terminal',     19.4700, -99.1700);

INSERT INTO ruta (numero_ruta) VALUES (100), (200);

-- Composición de cada ruta (zona_ruta con su orden)
INSERT INTO zona_ruta (id_ruta, id_zona, orden)
SELECT r.id, z.id, z.numero
FROM ruta r JOIN zona z ON z.numero IN (1, 2, 3)
WHERE r.numero_ruta = 100;

INSERT INTO zona_ruta (id_ruta, id_zona, orden)
SELECT r.id, z.id, z.numero - 2
FROM ruta r JOIN zona z ON z.numero IN (3, 4, 5)
WHERE r.numero_ruta = 200;

-- El checador (usuario María) ligado a la zona 3 (paso aún sin marcar de la ruta 100)
INSERT INTO checador (id_usuario, id_zona)
SELECT u.id, (SELECT id FROM zona WHERE numero = 3)
FROM usuario u WHERE u.email = 'checador@sigl.com';

-- Conductores: Juan -> camión ABC-100 en ruta 100; Carlos -> XYZ-200 en ruta 100.
-- Dos camiones en la misma ruta = recorridos simultáneos.
INSERT INTO conductor (folio_licencia, id_ruta, id_usuario, id_transporte)
SELECT 'LIC-0001',
       (SELECT id FROM ruta WHERE numero_ruta = 100),
       u.id,
       (SELECT id FROM transporte WHERE num_placas = 'ABC-100')
FROM usuario u WHERE u.email = 'transportista@sigl.com';

INSERT INTO conductor (folio_licencia, id_ruta, id_usuario, id_transporte)
SELECT 'LIC-0002',
       (SELECT id FROM ruta WHERE numero_ruta = 100),
       u.id,
       (SELECT id FROM transporte WHERE num_placas = 'XYZ-200')
FROM usuario u WHERE u.email = 'transportista2@sigl.com';

-- ----------------------------------------------------------------------------
-- Viajes de ejemplo (en curso) + sus check-ins, para ver camiones a media ruta.
--   Camión ABC-100 (Juan)   -> ruta 100, ya pasó zonas en orden 1 y 2 (va en la 2)
--   Camión XYZ-200 (Carlos) -> ruta 100, ya pasó la zona en orden 1 (va detrás)
-- ----------------------------------------------------------------------------
INSERT INTO viaje (id_ruta, id_transporte, id_conductor, estado)
SELECT c.id_ruta, c.id_transporte, c.id, 'en_curso'
FROM conductor c
JOIN usuario u ON u.id = c.id_usuario
WHERE u.email = 'transportista@sigl.com';

INSERT INTO viaje (id_ruta, id_transporte, id_conductor, estado)
SELECT c.id_ruta, c.id_transporte, c.id, 'en_curso'
FROM conductor c
JOIN usuario u ON u.id = c.id_usuario
WHERE u.email = 'transportista2@sigl.com';

-- Check-ins del camión ABC-100 (viaje del conductor de Juan): zonas orden 1 y 2.
INSERT INTO check_in (is_check, id_zona_ruta, id_viaje, fecha, hora, id_checador)
SELECT true, zr.id,
       (SELECT v.id FROM viaje v JOIN transporte t ON t.id = v.id_transporte WHERE t.num_placas = 'ABC-100'),
       '2026-06-13', '08:00', (SELECT id FROM checador LIMIT 1)
FROM zona_ruta zr JOIN ruta r ON r.id = zr.id_ruta
WHERE r.numero_ruta = 100 AND zr.orden IN (1, 2);

-- Check-in del camión XYZ-200 (viaje del conductor de Carlos): zona orden 1.
INSERT INTO check_in (is_check, id_zona_ruta, id_viaje, fecha, hora, id_checador)
SELECT true, zr.id,
       (SELECT v.id FROM viaje v JOIN transporte t ON t.id = v.id_transporte WHERE t.num_placas = 'XYZ-200'),
       '2026-06-13', '08:05', (SELECT id FROM checador LIMIT 1)
FROM zona_ruta zr JOIN ruta r ON r.id = zr.id_ruta
WHERE r.numero_ruta = 100 AND zr.orden = 1;
