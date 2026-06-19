import { Router } from 'express'
import { pool } from '../db'

export const transportesRouter = Router()

// GET /api/transportes -> lista todos los transportes y su conductor asignado
transportesRouter.get('/', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.id, t.num_placas, t.clase, c.id_usuario AS id_transportista, u.nombre, u.apellidos
      FROM transporte t
      LEFT JOIN conductor c ON c.id_transporte = t.id
      LEFT JOIN usuario u ON u.id = c.id_usuario
      ORDER BY t.id DESC
    `)
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener transportes' })
  }
})

// POST /api/transportes -> crea un nuevo transporte
transportesRouter.post('/', async (req, res) => {
  const { num_placas, clase, id_transportista } = req.body

  if (!num_placas || !clase) {
    return res.status(400).json({ error: 'Número de placas y clase son obligatorios' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const result = await client.query(
      'INSERT INTO transporte (num_placas, clase) VALUES ($1, $2) RETURNING id, num_placas, clase',
      [num_placas, clase]
    )
    const newTransporteId = result.rows[0].id

    if (id_transportista) {
      // Remover este transportista de otro vehículo si lo tenía
      await client.query('UPDATE conductor SET id_transporte = NULL WHERE id_usuario = $1', [id_transportista])
      
      const cond = await client.query('SELECT id FROM conductor WHERE id_usuario = $1', [id_transportista])
      if (cond.rows[0]) {
        await client.query('UPDATE conductor SET id_transporte = $1 WHERE id_usuario = $2', [newTransporteId, id_transportista])
      } else {
        await client.query('INSERT INTO conductor (id_usuario, id_transporte) VALUES ($1, $2)', [id_transportista, newTransporteId])
      }
    }

    await client.query('COMMIT')
    res.json(result.rows[0])
  } catch (err: any) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ error: 'Error al crear transporte' })
  } finally {
    client.release()
  }
})

// PUT /api/transportes/:id -> actualiza un transporte
transportesRouter.put('/:id', async (req, res) => {
  const { id } = req.params
  const { num_placas, clase, id_transportista } = req.body

  if (!num_placas || !clase) {
    return res.status(400).json({ error: 'Número de placas y clase son obligatorios' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    await client.query(
      'UPDATE transporte SET num_placas = $1, clase = $2 WHERE id = $3',
      [num_placas, clase, id]
    )

    // Quitar a cualquier otro conductor que estuviera asignado a este transporte
    await client.query('UPDATE conductor SET id_transporte = NULL WHERE id_transporte = $1', [id])

    if (id_transportista) {
      // Quitar a este conductor de otro transporte si lo tenía
      await client.query('UPDATE conductor SET id_transporte = NULL WHERE id_usuario = $1', [id_transportista])
      
      const cond = await client.query('SELECT id FROM conductor WHERE id_usuario = $1', [id_transportista])
      if (cond.rows[0]) {
        await client.query('UPDATE conductor SET id_transporte = $1 WHERE id_usuario = $2', [id, id_transportista])
      } else {
        await client.query('INSERT INTO conductor (id_usuario, id_transporte) VALUES ($1, $2)', [id_transportista, id])
      }
    }

    await client.query('COMMIT')
    res.json({ success: true })
  } catch (err: any) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ error: 'Error al actualizar transporte' })
  } finally {
    client.release()
  }
})

// DELETE /api/transportes/:id -> elimina un transporte
transportesRouter.delete('/:id', async (req, res) => {
  const { id } = req.params

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    // Limpiar dependencias
    await client.query('UPDATE ruta SET id_transporte = NULL WHERE id_transporte = $1', [id])
    await client.query('UPDATE conductor SET id_transporte = NULL WHERE id_transporte = $1', [id])
    
    await client.query('DELETE FROM transporte WHERE id = $1', [id])
    
    await client.query('COMMIT')
    res.json({ success: true })
  } catch (err: any) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ error: 'Error al eliminar transporte' })
  } finally {
    client.release()
  }
})
