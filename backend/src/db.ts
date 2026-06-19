import { Pool } from 'pg'

// Pool de conexiones. La URL viene de DATABASE_URL (ver .env / docker-compose).
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

pool.on('error', (err) => {
  console.error('Error inesperado en el pool de Postgres:', err)
})
