-- ============================================================================
-- Migración: nombre legible para las zonas (ej. "Constitución", "Cántaros").
-- Aplica sobre una BD existente SIN borrar datos.
-- Uso:  docker compose exec -T db psql -U <usuario> -d <bd> < db/migration_zona_nombre.sql
-- ============================================================================

ALTER TABLE zona ADD COLUMN IF NOT EXISTS nombre VARCHAR(100);
