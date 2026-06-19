import { Router } from 'express'
import { pool } from '../db'

export const zonasRouter = Router()

// GET /api/zonas  -> lista todas las zonas
zonasRouter.get('/', async (_req, res) => {
  try {
    const r = await pool.query(
      'SELECT id, numero, nombre, lat, lng FROM zona ORDER BY numero NULLS LAST, nombre, id',
    )
    res.json(r.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al listar zonas' })
  }
})

// POST /api/zonas  -> crea una zona { nombre, numero?, lat?, lng? }
// El nombre es obligatorio; el número es opcional (orden/identificador interno).
zonasRouter.post('/', async (req, res) => {
  const { numero, nombre, lat, lng } = req.body ?? {}
  if (!nombre || String(nombre).trim() === '') {
    return res.status(400).json({ error: 'El nombre de la zona es obligatorio' })
  }
  try {
    const r = await pool.query(
      'INSERT INTO zona (numero, nombre, lat, lng) VALUES ($1, $2, $3, $4) RETURNING id, numero, nombre, lat, lng',
      [numero === undefined || numero === '' ? null : numero, String(nombre).trim(), lat ?? null, lng ?? null],
    )
    res.status(201).json(r.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear la zona' })
  }
})

// DELETE /api/zonas/:id  -> elimina una zona
// - Se bloquea si la zona forma parte de alguna ruta (habría que quitarla de la ruta primero).
// - Si solo está asignada a checadores, los desvincula (id_zona = NULL) y la borra.
zonasRouter.delete('/:id', async (req, res) => {
  const id = req.params.id
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // ¿La zona se usa en alguna ruta? En ese caso no la borramos para no
    // corromper la composición de la ruta en silencio.
    const enRuta = await client.query(
      'SELECT 1 FROM zona_ruta WHERE id_zona = $1 LIMIT 1',
      [id],
    )
    if (enRuta.rowCount) {
      await client.query('ROLLBACK')
      return res.status(409).json({
        error:
          'No se puede borrar: la zona forma parte de una ruta. Quítala de esa ruta antes de borrarla.',
      })
    }

    // Desvincula a los checadores que tuvieran asignada esta zona (quedan sin zona).
    await client.query('UPDATE checador SET id_zona = NULL WHERE id_zona = $1', [id])

    await client.query('DELETE FROM zona WHERE id = $1', [id])
    await client.query('COMMIT')
    res.status(204).end()
  } catch (err: any) {
    await client.query('ROLLBACK')
    if (err?.code === '23503') {
      return res
        .status(409)
        .json({ error: 'No se puede borrar: la zona está en uso.' })
    }
    console.error(err)
    res.status(500).json({ error: 'Error al borrar la zona' })
  } finally {
    client.release()
  }
})
