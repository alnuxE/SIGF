import express from 'express'
import cors from 'cors'
import { pool } from './db'
import { authRouter } from './routes/auth'
import { zonasRouter } from './routes/zonas'
import { rutasRouter } from './routes/rutas'
import { progressRouter } from './routes/progress'
import { checadorRouter } from './routes/checador'
import { conductorRouter } from './routes/conductor'
import { checkinRouter } from './routes/checkin'
import { usuariosRouter } from './routes/usuarios'
import { transportesRouter } from './routes/transportes'
import { publicRouter } from './routes/public'
import { sseHandler } from './events'

const app = express()
const PORT = process.env.BACKEND_PORT ?? 4000

app.use(cors())
app.use(express.json())

// Verifica que el backend esté vivo y que llegue a la base de datos.
app.get('/api/health', async (_req, res) => {
  try {
    const result = await pool.query('SELECT NOW()')
    res.json({ status: 'ok', db_time: result.rows[0].now })
  } catch {
    res.status(500).json({ status: 'error', message: 'Sin conexión a la base de datos' })
  }
})

app.use('/api/auth', authRouter)
app.use('/api/zonas', zonasRouter)
app.use('/api/rutas', rutasRouter)
app.use('/api/progress', progressRouter)
app.use('/api/checador', checadorRouter)
app.use('/api/conductor', conductorRouter)
app.use('/api/checkin', checkinRouter)
app.use('/api/usuarios', usuariosRouter)
app.use('/api/transportes', transportesRouter)
app.use('/api/public', publicRouter)
app.get('/api/events', sseHandler)

app.listen(PORT, () => {
  console.log(`SIGF backend escuchando en http://localhost:${PORT}`)
})
