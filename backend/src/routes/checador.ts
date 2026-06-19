import { Router } from 'express'
import { pool } from '../db'

export const checadorRouter = Router()

// GET /api/checador/info/:usuario
// Devuelve la zona asignada al checador y las rutas que pasan por ella.
checadorRouter.get('/info/:usuario', async (req, res) => {
  try {
    const c = await pool.query(
      `SELECT c.id AS checador_id, c.id_zona, z.numero AS zona_numero, z.nombre AS zona_nombre, z.lat, z.lng
         FROM checador c
         JOIN zona z ON z.id = c.id_zona
        WHERE c.id_usuario = $1`,
      [req.params.usuario],
    )
    if (!c.rows[0]) return res.json({ asignado: false })

    const info = c.rows[0]
    const rutas = await pool.query(
      `SELECT r.id, r.numero_ruta, zr.orden
         FROM zona_ruta zr
         JOIN ruta r ON r.id = zr.id_ruta
        WHERE zr.id_zona = $1
        ORDER BY r.numero_ruta`,
      [info.id_zona],
    )

    res.json({ asignado: true, ...info, rutas: rutas.rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener la info del checador' })
  }
})
