import { Router } from 'express'
import { pool } from '../db'

export const progressRouter = Router()

// GET /api/progress
// Calcula, por cada ruta, el avance = zonas con check-in / total de zonas.
// Una "zona completada" es una zona_ruta que tiene al menos un check_in marcado.
progressRouter.get('/', async (_req, res) => {
  try {
    const r = await pool.query(`
      SELECT
        r.id,
        r.numero_ruta,
        COUNT(DISTINCT zr.id)::int               AS total,
        COUNT(DISTINCT ci.id_zona_ruta)::int     AS completadas,
        MIN(NULLIF(TRIM(COALESCE(ci.fecha, '') || ' ' || COALESCE(ci.hora, '')), '')) AS fecha_inicio,
        MAX(NULLIF(TRIM(COALESCE(ci.fecha, '') || ' ' || COALESCE(ci.hora, '')), '')) AS fecha_fin,
        NULLIF(TRIM(MAX(COALESCE(u.nombre, '') || ' ' || COALESCE(u.apellidos, ''))), '') AS transportista
      FROM ruta r
      LEFT JOIN zona_ruta zr ON zr.id_ruta = r.id
      LEFT JOIN check_in  ci ON ci.id_zona_ruta = zr.id AND ci.is_check = true
      LEFT JOIN conductor c  ON c.id_ruta = r.id
      LEFT JOIN usuario   u  ON u.id = c.id_usuario
      GROUP BY r.id, r.numero_ruta
      ORDER BY r.numero_ruta, r.id
    `)

    const data = r.rows.map((row) => {
      const total = row.total ?? 0
      const completadas = row.completadas ?? 0
      const porcentaje = total > 0 ? Math.round((completadas / total) * 100) : 0
      // La fecha de fin solo tiene sentido cuando la ruta está completa.
      const completa = total > 0 && completadas === total
      return {
        id: row.id,
        numero_ruta: row.numero_ruta,
        total,
        completadas,
        porcentaje,
        fecha_inicio: row.fecha_inicio ?? null,
        fecha_fin: completa ? row.fecha_fin ?? null : null,
        transportista: row.transportista ?? null,
      }
    })

    res.json(data)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al calcular el progreso' })
  }
})
