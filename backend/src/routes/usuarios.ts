import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { pool } from '../db'

export const usuariosRouter = Router()

// GET /api/usuarios/roles -> lista los roles disponibles
usuariosRouter.get('/roles', async (_req, res) => {
  try {
    const result = await pool.query('SELECT id, nombre FROM rol ORDER BY id')
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener roles' })
  }
})

// GET /api/usuarios -> lista todos los usuarios (sin contraseña)
usuariosRouter.get('/', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.email, u.nombre, u.apellidos, u.is_admin, u.created_at, u.id_rol, r.nombre AS rol_nombre, c.id_ruta, ru.numero_ruta, ch.id_zona, z.numero AS zona_numero, z.nombre AS zona_nombre
      FROM usuario u
      LEFT JOIN rol r ON r.id = u.id_rol
      LEFT JOIN conductor c ON c.id_usuario = u.id
      LEFT JOIN ruta ru ON ru.id = c.id_ruta
      LEFT JOIN checador ch ON ch.id_usuario = u.id
      LEFT JOIN zona z ON z.id = ch.id_zona
      ORDER BY u.id DESC
    `)
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener usuarios' })
  }
})

// POST /api/usuarios -> crea un nuevo usuario
usuariosRouter.post('/', async (req, res) => {
  const { email, password, nombre, apellidos, id_rol, is_admin, id_ruta, id_zona } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son obligatorios' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    const result = await client.query(
      `INSERT INTO usuario (email, password, nombre, apellidos, id_rol, is_admin) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, nombre, apellidos, is_admin`,
      [email, hashedPassword, nombre, apellidos, id_rol || null, is_admin || false]
    )
    
    const newUserId = result.rows[0].id

    if (id_ruta) {
      await client.query(
        'INSERT INTO conductor (id_ruta, id_usuario) VALUES ($1, $2)',
        [id_ruta, newUserId]
      )
    }

    if (id_zona) {
      await client.query(
        'INSERT INTO checador (id_zona, id_usuario) VALUES ($1, $2)',
        [id_zona, newUserId]
      )
    }

    await client.query('COMMIT')
    res.json(result.rows[0])
  } catch (err: any) {
    await client.query('ROLLBACK')
    console.error(err)
    if (err.code === '23505') { // unique_violation
      return res.status(400).json({ error: 'El email ya está registrado' })
    }
    res.status(500).json({ error: 'Error al crear el usuario' })
  } finally {
    client.release()
  }
})

// PUT /api/usuarios/:id -> actualiza un usuario (y su contraseña si se provee)
usuariosRouter.put('/:id', async (req, res) => {
  const { id } = req.params
  const { email, password, nombre, apellidos, id_rol, is_admin, id_ruta, id_zona } = req.body

  if (!email) {
    return res.status(400).json({ error: 'El email es obligatorio' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    if (password) {
      // Actualiza también la contraseña
      const salt = await bcrypt.genSalt(10)
      const hashedPassword = await bcrypt.hash(password, salt)
      
      await client.query(
        `UPDATE usuario 
         SET email = $1, password = $2, nombre = $3, apellidos = $4, id_rol = $5, is_admin = $6
         WHERE id = $7`,
        [email, hashedPassword, nombre, apellidos, id_rol || null, is_admin || false, id]
      )
    } else {
      // Actualiza sin tocar la contraseña
      await client.query(
        `UPDATE usuario 
         SET email = $1, nombre = $2, apellidos = $3, id_rol = $4, is_admin = $5
         WHERE id = $6`,
        [email, nombre, apellidos, id_rol || null, is_admin || false, id]
      )
    }

    // Actualiza tabla conductor si se proporcionó id_ruta
    if (id_ruta !== undefined) {
      const conductorCheck = await client.query('SELECT id FROM conductor WHERE id_usuario = $1', [id])
      if (id_ruta !== null && id_ruta !== '') {
        if (conductorCheck.rows.length > 0) {
          await client.query('UPDATE conductor SET id_ruta = $1 WHERE id_usuario = $2', [id_ruta, id])
        } else {
          await client.query('INSERT INTO conductor (id_ruta, id_usuario) VALUES ($1, $2)', [id_ruta, id])
        }
      } else {
        if (conductorCheck.rows.length > 0) {
          await client.query('UPDATE conductor SET id_ruta = NULL WHERE id_usuario = $1', [id])
        }
      }
    }

    // Actualiza tabla checador si se proporcionó id_zona
    if (id_zona !== undefined) {
      const checadorCheck = await client.query('SELECT id FROM checador WHERE id_usuario = $1', [id])
      if (id_zona !== null && id_zona !== '') {
        if (checadorCheck.rows.length > 0) {
          await client.query('UPDATE checador SET id_zona = $1 WHERE id_usuario = $2', [id_zona, id])
        } else {
          await client.query('INSERT INTO checador (id_zona, id_usuario) VALUES ($1, $2)', [id_zona, id])
        }
      } else {
        if (checadorCheck.rows.length > 0) {
          await client.query('UPDATE checador SET id_zona = NULL WHERE id_usuario = $1', [id])
        }
      }
    }

    await client.query('COMMIT')
    res.json({ success: true })
  } catch (err: any) {
    await client.query('ROLLBACK')
    console.error(err)
    if (err.code === '23505') {
      return res.status(400).json({ error: 'El email ya está registrado por otro usuario' })
    }
    res.status(500).json({ error: 'Error al actualizar el usuario' })
  } finally {
    client.release()
  }
})

// DELETE /api/usuarios/:id -> elimina un usuario
usuariosRouter.delete('/:id', async (req, res) => {
  const { id } = req.params
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    // Si queremos verificar que no se borre a sí mismo, tendríamos que leer de JWT/sesión.
    // Como la API aún no valida sesiones con tokens en cada request, asumo que 
    // confiamos en el frontend o el usuario logueado en general.
    
    // Limpiar dependencias antes de borrar el usuario
    await client.query('DELETE FROM conductor WHERE id_usuario = $1', [id])
    await client.query('DELETE FROM checador WHERE id_usuario = $1', [id])

    await client.query('DELETE FROM usuario WHERE id = $1', [id])
    await client.query('COMMIT')
    res.json({ success: true })
  } catch (err: any) {
    await client.query('ROLLBACK')
    console.error(err)
    if (err.code === '23503') { // foreign_key_violation
      return res.status(400).json({ error: 'No se puede eliminar porque el usuario tiene registros asociados (ej. es conductor o checador)' })
    }
    res.status(500).json({ error: 'Error al eliminar el usuario' })
  } finally {
    client.release()
  }
})
