-- ============================================================================
-- Migración: soporte de "viajes" (varios camiones simultáneos por ruta).
-- Aplica los cambios sobre una BD existente SIN borrar datos.
-- Uso:  docker compose exec -T db psql -U <usuario> -d <bd> < db/migration_viajes.sql
-- (Si recreas con ./sigf reset-db no hace falta: ya está en init.sql.)
-- ============================================================================

-- 1. Tabla de viajes
CREATE TABLE IF NOT EXISTS viaje (
  id            BIGSERIAL PRIMARY KEY,
  id_ruta       BIGINT,
  id_transporte BIGINT,
  id_conductor  BIGINT,
  estado        VARCHAR(20) NOT NULL DEFAULT 'en_curso',
  inicio        TIMESTAMPTZ NOT NULL DEFAULT now(),
  fin           TIMESTAMPTZ
);

-- 2. Columna id_viaje en check_in
ALTER TABLE check_in ADD COLUMN IF NOT EXISTS id_viaje BIGINT;

-- 3. Llaves foráneas (idempotentes)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_viaje_ruta') THEN
    ALTER TABLE viaje ADD CONSTRAINT fk_viaje_ruta       FOREIGN KEY (id_ruta)       REFERENCES ruta(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_viaje_transporte') THEN
    ALTER TABLE viaje ADD CONSTRAINT fk_viaje_transporte FOREIGN KEY (id_transporte) REFERENCES transporte(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_viaje_conductor') THEN
    ALTER TABLE viaje ADD CONSTRAINT fk_viaje_conductor  FOREIGN KEY (id_conductor)  REFERENCES conductor(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_checkin_viaje') THEN
    ALTER TABLE check_in ADD CONSTRAINT fk_checkin_viaje FOREIGN KEY (id_viaje)      REFERENCES viaje(id);
  END IF;
END$$;
