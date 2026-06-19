import { Router } from 'express'
import { pool } from '../db'

export const rutasRouter = Router()

// GET /api/rutas  -> lista rutas con las zonas que las componen (ordenadas)
rutasRouter.get('/', async (_req, res) => {
  try {
    const r = await pool.query(`
      SELECT r.id, r.numero_ruta,
        COALESCE(
          json_agg(
            json_build_object('id_zona', z.id, 'numero', z.numero, 'nombre', z.nombre, 'orden', zr.orden)
            ORDER BY zr.orden
          ) FILTER (WHERE zr.id IS NOT NULL),
          '[]'
        ) AS zonas
      FROM ruta r
      LEFT JOIN zona_ruta zr ON zr.id_ruta = r.id
      LEFT JOIN zona z       ON z.id = zr.id_zona
      GROUP BY r.id, r.numero_ruta
      ORDER BY r.numero_ruta, r.id
    `)
    res.json(r.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al listar rutas' })
  }
})

// Inserta las filas de zona_ruta para una ruta, en el orden recibido.
async function setZonas(client: any, idRuta: number, zonas: number[]) {
  for (let i = 0; i < zonas.length; i++) {
    await client.query(
      'INSERT INTO zona_ruta (id_ruta, id_zona, orden) VALUES ($1, $2, $3)',
      [idRuta, zonas[i], i + 1],
    )
  }
}

// POST /api/rutas  -> crea ruta { numero_ruta, zonas: number[] }
rutasRouter.post('/', async (req, res) => {
  const { numero_ruta, zonas = [] } = req.body ?? {}
  if (numero_ruta === undefined || numero_ruta === null || numero_ruta === '') {
    return res.status(400).json({ error: 'El número de ruta es obligatorio' })
  }
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const r = await client.query(
      'INSERT INTO ruta (numero_ruta) VALUES ($1) RETURNING id',
      [numero_ruta],
    )
    await setZonas(client, r.rows[0].id, zonas)
    await client.query('COMMIT')
    res.status(201).json({ id: r.rows[0].id, numero_ruta, zonas })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ error: 'Error al crear la ruta' })
  } finally {
    client.release()
  }
})

// PUT /api/rutas/:id  -> actualiza número y zonas (reemplaza la composición)
rutasRouter.put('/:id', async (req, res) => {
  const { numero_ruta, zonas = [] } = req.body ?? {}
  const id = req.params.id
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    if (numero_ruta !== undefined && numero_ruta !== '') {
      await client.query('UPDATE ruta SET numero_ruta = $1 WHERE id = $2', [
        numero_ruta,
        id,
      ])
    }
    // Reemplaza la composición: primero quita check-ins y zona_ruta previas.
    await client.query(
      'DELETE FROM check_in WHERE id_zona_ruta IN (SELECT id FROM zona_ruta WHERE id_ruta = $1)',
      [id],
    )
    await client.query('DELETE FROM zona_ruta WHERE id_ruta = $1', [id])
    await setZonas(client, Number(id), zonas)
    await client.query('COMMIT')
    res.json({ id: Number(id), numero_ruta, zonas })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ error: 'Error al actualizar la ruta' })
  } finally {
    client.release()
  }
})

// DELETE /api/rutas/:id  -> borra ruta y todo lo que cuelga de ella
rutasRouter.delete('/:id', async (req, res) => {
  const id = req.params.id
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      'DELETE FROM check_in WHERE id_zona_ruta IN (SELECT id FROM zona_ruta WHERE id_ruta = $1)',
      [id],
    )
    await client.query('DELETE FROM zona_ruta WHERE id_ruta = $1', [id])
    await client.query('DELETE FROM ruta WHERE id = $1', [id])
    await client.query('COMMIT')
    res.status(204).end()
  } catch (err: any) {
    await client.query('ROLLBACK')
    if (err?.code === '23503') {
      return res
        .status(409)
        .json({ error: 'No se puede borrar: la ruta tiene un conductor asignado' })
    }
    console.error(err)
    res.status(500).json({ error: 'Error al borrar la ruta' })
  } finally {
    client.release()
  }
})
