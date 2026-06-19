import { Router } from 'express'
import { pool } from '../db'
import { broadcast } from '../events'

export const checkinRouter = Router()

// POST /api/checkin   body: { id_usuario, id_zona }
// El checador escanea el QR del conductor (id_usuario) en su zona (id_zona).
// Se resuelve el camión (transporte) de ese conductor, su viaje en curso
// (o se crea uno) y se registra su paso por la zona.
checkinRouter.post('/', async (req, res) => {
  const { id_usuario, id_zona } = req.body ?? {}
  if (!id_usuario || !id_zona) {
    return res.status(400).json({ error: 'Faltan datos (id_usuario, id_zona)' })
  }

  const client = await pool.connect()
  try {
    // 1. ¿Es conductor y tiene ruta? Traemos también su camión.
    const cond = await client.query(
      'SELECT id, id_ruta, id_transporte FROM conductor WHERE id_usuario = $1',
      [id_usuario],
    )
    if (!cond.rows[0] || !cond.rows[0].id_ruta) {
      return res
        .status(400)
        .json({ error: 'No tienes una ruta asignada como conductor' })
    }
    const idRuta = cond.rows[0].id_ruta
    const idConductor = cond.rows[0].id
    const idTransporte = cond.rows[0].id_transporte

    // 2. ¿Tu ruta pasa por esa zona? Necesitamos también su orden.
    const zr = await client.query(
      'SELECT id, orden FROM zona_ruta WHERE id_ruta = $1 AND id_zona = $2',
      [idRuta, id_zona],
    )
    if (!zr.rows[0]) {
      return res.status(400).json({ error: 'Tu ruta no pasa por esa zona' })
    }
    const idZonaRuta = zr.rows[0].id
    const orden = Number(zr.rows[0].orden)

    // Orden máximo de la ruta (para saber si este paso la finaliza).
    const maxQ = await client.query(
      'SELECT COALESCE(MAX(orden), 0)::int AS max_orden FROM zona_ruta WHERE id_ruta = $1',
      [idRuta],
    )
    const maxOrden = maxQ.rows[0].max_orden

    // 3. Viaje en curso de este camión; si no hay, se abre uno nuevo.
    let idViaje: number
    const vig = await client.query(
      `SELECT id FROM viaje
        WHERE id_conductor = $1 AND estado = 'en_curso'
        ORDER BY inicio DESC LIMIT 1`,
      [idConductor],
    )
    if (vig.rows[0]) {
      idViaje = vig.rows[0].id
    } else {
      const nuevo = await client.query(
        `INSERT INTO viaje (id_ruta, id_transporte, id_conductor, estado)
         VALUES ($1, $2, $3, 'en_curso') RETURNING id`,
        [idRuta, idTransporte, idConductor],
      )
      idViaje = nuevo.rows[0].id
    }

    // 4. ¿Este viaje ya pasó por esta zona?
    const prev = await client.query(
      'SELECT 1 FROM check_in WHERE id_viaje = $1 AND id_zona_ruta = $2 AND is_check = true LIMIT 1',
      [idViaje, idZonaRuta],
    )
    const yaEstaba = prev.rows.length > 0

    // 5. Checador de esa zona (puede no haber).
    const chk = await client.query(
      'SELECT id FROM checador WHERE id_zona = $1 LIMIT 1',
      [id_zona],
    )
    const idChecador = chk.rows[0]?.id ?? null

    // 6. Insertar el check-in con fecha/hora actuales (si no estaba ya).
    const now = new Date()
    const fecha = now.toISOString().slice(0, 10)
    const hora = now.toTimeString().slice(0, 5)
    if (!yaEstaba) {
      await client.query(
        `INSERT INTO check_in (is_check, id_zona_ruta, id_viaje, fecha, hora, id_checador)
         VALUES (true, $1, $2, $3, $4, $5)`,
        [idZonaRuta, idViaje, fecha, hora, idChecador],
      )
    }

    // 7. Si es la última zona de la ruta, el viaje queda finalizado.
    if (orden >= maxOrden && maxOrden > 0) {
      await client.query(
        `UPDATE viaje SET estado = 'finalizado', fin = now() WHERE id = $1`,
        [idViaje],
      )
    }

    // 8. Avance de ESTE viaje (zonas pasadas / total de la ruta).
    const prog = await client.query(
      `SELECT COUNT(DISTINCT zr.id)::int AS total,
              COUNT(DISTINCT ci.id_zona_ruta)::int AS completadas
         FROM zona_ruta zr
         LEFT JOIN check_in ci
                ON ci.id_zona_ruta = zr.id AND ci.is_check = true AND ci.id_viaje = $2
        WHERE zr.id_ruta = $1`,
      [idRuta, idViaje],
    )
    const total = prog.rows[0].total
    const completadas = prog.rows[0].completadas
    const porcentaje = total > 0 ? Math.round((completadas / total) * 100) : 0

    // 9. Emitir en tiempo real a todos los conectados (incluida la vista pública).
    broadcast('checkin', {
      id_ruta: idRuta,
      id_zona,
      id_zona_ruta: idZonaRuta,
      id_viaje: idViaje,
      orden,
      total,
      completadas,
      porcentaje,
      hora,
    })

    res.status(201).json({
      ok: true,
      yaEstaba,
      id_ruta: idRuta,
      id_zona,
      id_viaje: idViaje,
      total,
      completadas,
      porcentaje,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al registrar el check-in' })
  } finally {
    client.release()
  }
})
