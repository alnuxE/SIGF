import { Router } from 'express'
import { pool } from '../db'

// Endpoints públicos (sin autenticación) para la vista de pasajeros "/vivo".
export const publicRouter = Router()

// Minutos por zona por defecto cuando aún no hay historial suficiente.
const MIN_POR_ZONA_DEFAULT = 5

// Cuánto tiempo sigue mostrándose un camión que YA llegó al final de su ruta,
// como "estacionado en la última parada", antes de quitarlo de la vista en vivo.
const MIN_ESTACIONADO = 120 // minutos

// Calcula el tiempo típico (minutos) que tarda un camión en pasar de una zona
// a la siguiente, por ruta, a partir del historial de check-ins. Devuelve un
// mapa { id_ruta: minutos }. Ignora saltos no positivos o absurdos (> 3 h).
async function ritmoPorRuta(): Promise<Record<number, number>> {
  const r = await pool.query(`
    WITH segs AS (
      SELECT ci.id_viaje,
             zr.id_ruta,
             zr.orden,
             (ci.fecha || ' ' || ci.hora)::timestamp AS ts
        FROM check_in ci
        JOIN zona_ruta zr ON zr.id = ci.id_zona_ruta
       WHERE ci.is_check = true AND ci.fecha IS NOT NULL AND ci.hora IS NOT NULL
    ),
    deltas AS (
      SELECT id_ruta,
             EXTRACT(EPOCH FROM (ts - LAG(ts) OVER (PARTITION BY id_viaje ORDER BY orden))) / 60 AS dmin
        FROM segs
    )
    SELECT id_ruta::int AS id_ruta,
           AVG(dmin) FILTER (WHERE dmin > 0 AND dmin < 180) AS min_por_zona
      FROM deltas
     GROUP BY id_ruta
  `)
  const map: Record<number, number> = {}
  for (const row of r.rows) {
    if (row.min_por_zona != null) map[row.id_ruta] = Number(row.min_por_zona)
  }
  return map
}

// GET /api/public/rutas
// Catálogo de rutas con sus zonas en orden, para los selectores de la vista.
publicRouter.get('/rutas', async (_req, res) => {
  try {
    const r = await pool.query(`
      SELECT r.id::int AS id, r.numero_ruta::int AS numero_ruta,
             COALESCE(
               json_agg(
                 json_build_object('id_zona', z.id::int, 'numero', z.numero::int, 'nombre', z.nombre, 'orden', zr.orden::int)
                 ORDER BY zr.orden
               ) FILTER (WHERE zr.id IS NOT NULL),
               '[]'
             ) AS zonas
        FROM ruta r
        LEFT JOIN zona_ruta zr ON zr.id_ruta = r.id
        LEFT JOIN zona z       ON z.id = zr.id_zona
       GROUP BY r.id, r.numero_ruta
       ORDER BY r.numero_ruta
    `)
    res.json(r.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener las rutas' })
  }
})

// GET /api/public/live
// Camiones (viajes en curso) con su posición actual en la ruta.
publicRouter.get('/live', async (_req, res) => {
  try {
    const ritmo = await ritmoPorRuta()
    const r = await pool.query(`
      SELECT
        v.id::int        AS id_viaje,
        v.id_ruta::int   AS id_ruta,
        r.numero_ruta::int AS numero_ruta,
        t.num_placas,
        t.clase,
        NULLIF(TRIM(COALESCE(u.nombre, '') || ' ' || COALESCE(u.apellidos, '')), '') AS conductor,
        (SELECT COUNT(*) FROM zona_ruta zr WHERE zr.id_ruta = v.id_ruta)::int AS total_zonas,
        pos.orden::int       AS orden_actual,
        pos.zona_numero::int AS zona_numero,
        pos.zona_nombre      AS zona_nombre,
        pos.id_zona::int     AS id_zona,
        pos.hora,
        (v.estado = 'finalizado') AS estacionado
      FROM viaje v
      JOIN ruta r            ON r.id = v.id_ruta
      LEFT JOIN transporte t ON t.id = v.id_transporte
      LEFT JOIN conductor c  ON c.id = v.id_conductor
      LEFT JOIN usuario u    ON u.id = c.id_usuario
      LEFT JOIN LATERAL (
        SELECT zr.orden, z.numero AS zona_numero, z.nombre AS zona_nombre, z.id AS id_zona, ci.hora
          FROM check_in ci
          JOIN zona_ruta zr ON zr.id = ci.id_zona_ruta
          JOIN zona z       ON z.id = zr.id_zona
         WHERE ci.id_viaje = v.id AND ci.is_check = true
         ORDER BY zr.orden DESC, ci.id DESC
         LIMIT 1
      ) pos ON true
      WHERE v.estado = 'en_curso'
         OR (v.estado = 'finalizado'
             AND v.fin > now() - ($1 || ' minutes')::interval)
      ORDER BY r.numero_ruta, t.num_placas
    `, [MIN_ESTACIONADO])

    const data = r.rows.map((row) => {
      const total = Number(row.total_zonas ?? 0)
      const actual = Number(row.orden_actual ?? 0)
      const porcentaje = total > 0 ? Math.round((actual / total) * 100) : 0
      const faltan = Math.max(total - actual, 0)
      const minPorZona = ritmo[Number(row.id_ruta)] ?? MIN_POR_ZONA_DEFAULT
      return {
        id_viaje: Number(row.id_viaje),
        id_ruta: Number(row.id_ruta),
        numero_ruta: Number(row.numero_ruta),
        num_placas: row.num_placas ?? null,
        clase: row.clase ?? null,
        conductor: row.conductor ?? null,
        total_zonas: total,
        orden_actual: actual,
        zona_numero: row.zona_numero != null ? Number(row.zona_numero) : null,
        zona_nombre: row.zona_nombre ?? null,
        id_zona: row.id_zona != null ? Number(row.id_zona) : null,
        hora: row.hora ?? null,
        porcentaje,
        min_por_zona: Math.round(minPorZona),
        // true = ya llegó al final y está estacionado en la última parada
        estacionado: row.estacionado === true,
        // minutos estimados para terminar la ruta desde su posición actual
        // (0 si ya está estacionado en el destino)
        eta_fin_min: row.estacionado === true ? 0 : Math.round(faltan * minPorZona),
      }
    })
    res.json(data)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener los camiones en vivo' })
  }
})

// GET /api/public/parada/:id_zona
// Tablero estilo "transit": todos los camiones en curso de las rutas que pasan
// por esta parada. faltan > 0 = llegando; = 0 en la parada; < 0 = ya pasó/salió.
// Incluye el destino (última zona) de cada ruta.
publicRouter.get('/parada/:id_zona', async (req, res) => {
  try {
    const ritmo = await ritmoPorRuta()
    const r = await pool.query(
      `
      WITH paradas AS (
        SELECT zr.id_ruta, zr.orden AS orden_parada, r.numero_ruta
          FROM zona_ruta zr
          JOIN ruta r ON r.id = zr.id_ruta
         WHERE zr.id_zona = $1
      ),
      pos AS (
        SELECT v.id AS id_viaje, v.id_ruta, v.id_transporte, v.id_conductor,
               MAX(zr.orden) AS orden_actual
          FROM viaje v
          JOIN check_in ci  ON ci.id_viaje = v.id AND ci.is_check = true
          JOIN zona_ruta zr ON zr.id = ci.id_zona_ruta
         WHERE v.estado = 'en_curso'
            OR (v.estado = 'finalizado'
                AND v.fin > now() - ($2 || ' minutes')::interval)
         GROUP BY v.id, v.id_ruta, v.id_transporte, v.id_conductor
      ),
      destino AS (
        SELECT DISTINCT ON (zr.id_ruta) zr.id_ruta, z.nombre AS destino_nombre, z.numero AS destino_numero
          FROM zona_ruta zr JOIN zona z ON z.id = zr.id_zona
         ORDER BY zr.id_ruta, zr.orden DESC
      )
      SELECT
        p.numero_ruta::int AS numero_ruta,
        p.id_ruta::int     AS id_ruta,
        pos.id_viaje::int  AS id_viaje,
        pos.orden_actual::int AS orden_actual,
        (p.orden_parada - pos.orden_actual)::int AS faltan,
        t.num_placas,
        t.clase,
        d.destino_nombre,
        d.destino_numero::int AS destino_numero,
        NULLIF(TRIM(COALESCE(u.nombre, '') || ' ' || COALESCE(u.apellidos, '')), '') AS conductor
      FROM paradas p
      JOIN pos ON pos.id_ruta = p.id_ruta
      LEFT JOIN destino d    ON d.id_ruta = p.id_ruta
      LEFT JOIN transporte t ON t.id = pos.id_transporte
      LEFT JOIN conductor c  ON c.id = pos.id_conductor
      LEFT JOIN usuario u    ON u.id = c.id_usuario
      ORDER BY faltan ASC, p.numero_ruta
    `,
      [req.params.id_zona, MIN_ESTACIONADO],
    )

    const data = r.rows.map((row) => {
      const faltan = Number(row.faltan)
      const minPorZona = ritmo[Number(row.id_ruta)] ?? MIN_POR_ZONA_DEFAULT
      return {
        numero_ruta: Number(row.numero_ruta),
        id_ruta: Number(row.id_ruta),
        id_viaje: Number(row.id_viaje),
        orden_actual: Number(row.orden_actual),
        faltan,
        num_placas: row.num_placas ?? null,
        clase: row.clase ?? null,
        conductor: row.conductor ?? null,
        destino_nombre: row.destino_nombre ?? null,
        destino_numero: row.destino_numero != null ? Number(row.destino_numero) : null,
        min_por_zona: Math.round(minPorZona),
        // ETA solo para los que vienen llegando (faltan > 0)
        eta_min: faltan > 0 ? Math.round(faltan * minPorZona) : 0,
      }
    })
    res.json(data)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener la parada' })
  }
})
