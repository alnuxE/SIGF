import { Router } from 'express'
import { pool } from '../db'

export const conductorRouter = Router()

// GET /api/conductor/info/:usuario
// Devuelve la ruta asignada al conductor y sus zonas, marcando cuáles ya
// tienen check-in.
conductorRouter.get('/info/:usuario', async (req, res) => {
  try {
    const c = await pool.query(
      `SELECT c.id AS conductor_id, c.id_ruta, r.numero_ruta
         FROM conductor c
         JOIN ruta r ON r.id = c.id_ruta
        WHERE c.id_usuario = $1`,
      [req.params.usuario],
    )
    if (!c.rows[0]) return res.json({ asignado: false })

    const info = c.rows[0]

    // Viaje en curso de este conductor (su camión). Si no hay, su avance es 0.
    const v = await pool.query(
      `SELECT id FROM viaje
        WHERE id_conductor = $1 AND estado = 'en_curso'
        ORDER BY inicio DESC LIMIT 1`,
      [info.conductor_id],
    )
    const idViaje = v.rows[0]?.id ?? null

    // "checked" se evalúa contra el viaje actual, no contra otros camiones.
    const zonas = await pool.query(
      `SELECT z.id AS id_zona, z.numero, z.nombre, zr.orden, zr.id AS id_zona_ruta,
              EXISTS(
                SELECT 1 FROM check_in ci
                 WHERE ci.id_zona_ruta = zr.id AND ci.is_check = true
                   AND ci.id_viaje = $2
              ) AS checked
         FROM zona_ruta zr
         JOIN zona z ON z.id = zr.id_zona
        WHERE zr.id_ruta = $1
        ORDER BY zr.orden`,
      [info.id_ruta, idViaje],
    )

    res.json({ asignado: true, ...info, id_viaje: idViaje, zonas: zonas.rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener la info del conductor' })
  }
})
