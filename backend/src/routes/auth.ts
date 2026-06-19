import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { pool } from '../db'

export const authRouter = Router()

// POST /api/auth/login  ->  valida credenciales contra la tabla users
authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {}

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son obligatorios' })
  }

  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.password, u.nombre, u.apellidos, u.is_admin, r.nombre AS rol
         FROM usuario u
         LEFT JOIN rol r ON r.id = u.id_rol
        WHERE u.email = $1`,
      [email],
    )

    const user = result.rows[0]
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }

    // El rol efectivo: si is_admin gana 'admin', si no el nombre del rol asignado.
    const role = user.is_admin ? 'admin' : user.rol

    // Por ahora devolvemos el usuario. Más adelante: emitir un JWT aquí.
    return res.json({
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        apellidos: user.apellidos,
        role,
      },
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
})
