import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, zonaLabel, type PublicRuta, type LiveViaje, type ParadaCamion } from '../api'
import { useCheckinEvents } from '../hooks/useCheckinEvents'
import { getUser } from '../auth'
import './live.css'

type Vista = 'parada' | 'ruta'

export default function LivePage() {
  const [vista, setVista] = useState<Vista>('parada')
  const [rutas, setRutas] = useState<PublicRuta[]>([])
  const [live, setLive] = useState<LiveViaje[]>([])
  const [rutaSel, setRutaSel] = useState<number | ''>('')
  const [zonaSel, setZonaSel] = useState<number | ''>('')
  const [parada, setParada] = useState<ParadaCamion[]>([])
  const [pulse, setPulse] = useState(0)

  async function cargarBase() {
    try {
      const [rs, lv] = await Promise.all([api.publico.rutas(), api.publico.live()])
      setRutas(rs)
      setLive(lv)
    } catch {
      /* silencioso: la vista pública tolera fallos de red */
    }
  }

  async function cargarParada(idZona: number) {
    try {
      setParada(await api.publico.parada(idZona))
    } catch {
      setParada([])
    }
  }

  useEffect(() => {
    cargarBase()
  }, [])

  useEffect(() => {
    if (zonaSel !== '') cargarParada(zonaSel)
  }, [zonaSel])

  // Tiempo real: cualquier check-in refresca la posición de los camiones.
  useCheckinEvents(() => {
    cargarBase()
    if (zonaSel !== '') cargarParada(zonaSel)
    setPulse((p) => p + 1) // dispara el destello "actualizado"
  })

  // Lista de paradas (zonas únicas) tomada de todas las rutas.
  const zonas = useMemo(() => {
    const map = new Map<number, { numero: number | null; nombre: string | null }>()
    for (const r of rutas)
      for (const z of r.zonas) map.set(z.id_zona, { numero: z.numero, nombre: z.nombre })
    return [...map.entries()]
      .map(([id_zona, z]) => ({ id_zona, numero: z.numero, nombre: z.nombre }))
      // Ordenadas por su número de importancia (ascendente). Las que no tengan
      // número quedan al final, y entre iguales se desempata por etiqueta.
      .sort((a, b) => {
        if (a.numero == null && b.numero == null)
          return zonaLabel(a.nombre, a.numero).localeCompare(zonaLabel(b.nombre, b.numero))
        if (a.numero == null) return 1
        if (b.numero == null) return -1
        return a.numero - b.numero
      })
  }, [rutas])

  const rutasActivas = useMemo(() => new Set(live.map((b) => b.id_ruta)).size, [live])
  const esAdmin = getUser()?.role === 'admin'

  return (
    <div className="live">
      <header className="live__top">
        <div className="live__brand">
          <span className="live__logo">🚌</span>
          <div className="live__brand-text">
            <strong>SIGL</strong>
            <small>Transporte en vivo</small>
          </div>
        </div>
        <Link to="/login" className="live__login">
          Iniciar sesión
        </Link>
      </header>

      <main className="live__main">
        {/* Resumen en vivo */}
        <section className="live__hero">
          <span key={pulse} className="live__live-badge">
            <span className="live__dot" /> EN VIVO
          </span>
          <div className="live__stats">
            <div className="live__stat">
              <span className="live__stat-num">{live.length}</span>
              <span className="live__stat-lbl">camiones en ruta</span>
            </div>
            <div className="live__stat-sep" />
            <div className="live__stat">
              <span className="live__stat-num">{rutasActivas}</span>
              <span className="live__stat-lbl">rutas activas</span>
            </div>
          </div>
        </section>

        <div className="live__tabs">
          <button
            className={`live__tab${vista === 'parada' ? ' live__tab--on' : ''}`}
            onClick={() => setVista('parada')}
          >
            🧍 Por parada
          </button>
          <button
            className={`live__tab${vista === 'ruta' ? ' live__tab--on' : ''}`}
            onClick={() => setVista('ruta')}
          >
            🛣️ Por ruta
          </button>
        </div>

        {vista === 'parada' ? (
          <VistaParada zonas={zonas} zonaSel={zonaSel} setZonaSel={setZonaSel} parada={parada} />
        ) : (
          <VistaRuta
            rutas={rutas}
            live={live}
            rutaSel={rutaSel}
            setRutaSel={setRutaSel}
            esAdmin={esAdmin}
          />
        )}
      </main>
    </div>
  )
}

/* --------------------------------------------------------------------------
   Vista: por parada — tablero estilo Google Maps (llegadas y salidas)
   -------------------------------------------------------------------------- */
function VistaParada({
  zonas,
  zonaSel,
  setZonaSel,
  parada,
}: {
  zonas: { id_zona: number; numero: number | null; nombre: string | null }[]
  zonaSel: number | ''
  setZonaSel: (v: number | '') => void
  parada: ParadaCamion[]
}) {
  const llegando = parada.filter((b) => b.faltan > 0).sort((a, b) => a.faltan - b.faltan)
  const enParada = parada.filter((b) => b.faltan === 0)
  const saliendo = parada.filter((b) => b.faltan < 0).sort((a, b) => b.faltan - a.faltan)
  const proximo = enParada[0] ?? llegando[0]

  return (
    <div>
      <label className="live__field">
        <span>📍 Elige tu parada</span>
        <select
          value={zonaSel}
          onChange={(e) => setZonaSel(e.target.value === '' ? '' : Number(e.target.value))}
        >
          <option value="">— Selecciona una zona —</option>
          {zonas.map((z) => (
            <option key={z.id_zona} value={z.id_zona}>
              {zonaLabel(z.nombre, z.numero)}
            </option>
          ))}
        </select>
      </label>

      {zonaSel === '' ? (
        <EmptyState icon="🧭" texto="Selecciona tu parada para ver los camiones que llegan y salen." />
      ) : parada.length === 0 ? (
        <EmptyState icon="😴" texto="No hay camiones en circulación en esta parada por ahora." />
      ) : (
        <>
          {/* Próximo en llegar (destacado) */}
          {proximo && (
            <div className="next-card next-card--slim">
              <div className="next-card__glow" />
              <span className="tr-pill tr-pill--lg" style={{ background: rutaColor(proximo.numero_ruta) }}>
                {proximo.numero_ruta}
              </span>
              <div className="next-card__col">
                <span className="next-card__tag">
                  <span className="live__dot live__dot--white" />{' '}
                  {proximo.faltan === 0 ? 'En la parada' : 'Próximo en llegar'}
                </span>
                <span className="next-card__dest">
                  → {zonaLabel(proximo.destino_nombre, proximo.destino_numero)}
                </span>
                <span className="next-card__plac">{proximo.num_placas ?? 'Sin placa'}</span>
              </div>
              <div className="next-card__when">
                <span className="next-card__when-num">
                  {proximo.faltan === 0 ? 'Ahora' : etaTexto(proximo.eta_min)}
                </span>
                {proximo.faltan > 0 && (
                  <span className="next-card__when-sub">≈ {horaLlegada(proximo.eta_min)}</span>
                )}
              </div>
            </div>
          )}

          {/* Llegando */}
          {llegando.length > 0 && (
            <>
              <h3 className="live__subtitle">🟢 Llegando</h3>
              <ul className="tr-board">
                {llegando.map((b) => (
                  <TransitRow
                    key={b.id_viaje}
                    b={b}
                    estado={`a ${b.faltan} ${b.faltan === 1 ? 'parada' : 'paradas'}`}
                    time={etaTexto(b.eta_min)}
                    clock={horaLlegada(b.eta_min)}
                  />
                ))}
              </ul>
            </>
          )}

          {/* En la parada ahora */}
          {enParada.length > 0 && (
            <>
              <h3 className="live__subtitle">🔵 En la parada</h3>
              <ul className="tr-board">
                {enParada.map((b) => (
                  <TransitRow key={b.id_viaje} b={b} estado="Abordando ahora" time="Ahora" highlight />
                ))}
              </ul>
            </>
          )}

          {/* Saliendo / ya pasaron */}
          {saliendo.length > 0 && (
            <>
              <h3 className="live__subtitle">⚪ Acaban de salir</h3>
              <ul className="tr-board tr-board--muted">
                {saliendo.map((b) => (
                  <TransitRow
                    key={b.id_viaje}
                    b={b}
                    estado={`pasó hace ${-b.faltan} ${-b.faltan === 1 ? 'parada' : 'paradas'}`}
                    time="Salió"
                    salio
                  />
                ))}
              </ul>
            </>
          )}

          <p className="live__nota">
            ⏱️ Tiempos estimados según el ritmo de cada ruta. Se actualizan en vivo conforme
            avanzan los camiones.
          </p>
        </>
      )}
    </div>
  )
}

// Fila de tablero tipo transit: pastilla de ruta + destino + estado + hora.
function TransitRow({
  b,
  estado,
  time,
  clock,
  highlight,
  salio,
}: {
  b: ParadaCamion
  estado: string
  time: string
  clock?: string
  highlight?: boolean
  salio?: boolean
}) {
  return (
    <li className={`tr-row${highlight ? ' tr-row--on' : ''}${salio ? ' tr-row--out' : ''}`}>
      <span className="tr-pill" style={{ background: rutaColor(b.numero_ruta) }}>
        {b.numero_ruta}
      </span>
      <div className="tr-info">
        <span className="tr-dest">→ {zonaLabel(b.destino_nombre, b.destino_numero)}</span>
        <span className="tr-sub">
          {b.num_placas ?? 'Sin placa'} · {estado}
        </span>
      </div>
      <div className="tr-time">
        <span className="tr-min">{time}</span>
        {clock && <span className="tr-clock">{clock}</span>}
      </div>
    </li>
  )
}

// Color de línea según el número de ruta (paleta tipo transit).
const RUTA_COLORS = ['#2563eb', '#16a34a', '#db2777', '#ea580c', '#7c3aed', '#0891b2', '#ca8a04']
function rutaColor(n: number): string {
  return RUTA_COLORS[Math.abs(n) % RUTA_COLORS.length]
}

/* --------------------------------------------------------------------------
   Vista: por ruta — ¿dónde va cada camión y su progreso?
   -------------------------------------------------------------------------- */
function VistaRuta({
  rutas,
  live,
  rutaSel,
  setRutaSel,
  esAdmin,
}: {
  rutas: PublicRuta[]
  live: LiveViaje[]
  rutaSel: number | ''
  setRutaSel: (v: number | '') => void
  esAdmin: boolean
}) {
  const ruta = rutas.find((r) => r.id === rutaSel)
  const buses = live.filter((b) => b.id_ruta === rutaSel)

  return (
    <div>
      <label className="live__field">
        <span>🛣️ Elige una ruta</span>
        <select
          value={rutaSel}
          onChange={(e) => setRutaSel(e.target.value === '' ? '' : Number(e.target.value))}
        >
          <option value="">— Selecciona una ruta —</option>
          {rutas.map((r) => (
            <option key={r.id} value={r.id}>
              Ruta {r.numero_ruta}
            </option>
          ))}
        </select>
      </label>

      {!ruta ? (
        <EmptyState icon="🗺️" texto="Selecciona una ruta para ver dónde va cada camión." />
      ) : (
        <>
          {/* Mapa de la ruta con las zonas y los camiones encima */}
          <div className="track-card">
            <div className="track-card__head">
              <span className="chip chip--brand">Ruta {ruta.numero_ruta}</span>
              <span className="track-card__count">
                {buses.length} {buses.length === 1 ? 'camión' : 'camiones'} en circulación
              </span>
            </div>
            <div className="track">
              {ruta.zonas.map((z, i) => {
                const aqui = buses.filter((b) => b.orden_actual === z.orden)
                const pasada = buses.some((b) => b.orden_actual > z.orden)
                return (
                  <div key={z.id_zona} className="track__node">
                    {i > 0 && (
                      <span className={`track__line${pasada || aqui.length ? ' track__line--on' : ''}`} />
                    )}
                    <span
                      className={`track__dot${aqui.length ? ' track__dot--bus' : pasada ? ' track__dot--done' : ''}`}
                    >
                      {aqui.length > 0 ? '🚌' : z.orden}
                    </span>
                    <span className="track__label">{zonaLabel(z.nombre, z.numero)}</span>
                    {aqui.length > 0 && (
                      <span className="track__placas">
                        {aqui.map((b) => b.num_placas ?? '—').join(', ')}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <h3 className="live__subtitle">
            {esAdmin ? 'Camiones y su progreso' : 'Camiones en camino'}
          </h3>
          {buses.length === 0 ? (
            <EmptyState icon="🚫" texto="No hay camiones recorriendo esta ruta ahora mismo." />
          ) : (
            <div className="bus-cards">
              {buses.map((b) => {
                const done = b.porcentaje >= 100
                // Próxima parada = la zona con el orden siguiente al actual.
                const prox = ruta.zonas.find((z) => z.orden === b.orden_actual + 1)
                return (
                  <div key={b.id_viaje} className="bus-card">
                    <div className="bus-card__avatar">🚌</div>
                    <div className="bus-card__body">
                      <div className="bus-card__top">
                        <span className="bus-card__placas">{b.num_placas ?? 'Sin placa'}</span>
                        <span className={`bus-card__eta${prox ? '' : ' bus-card__eta--done'}`}>
                          {b.estacionado
                            ? '🅿️ Estacionado'
                            : prox
                              ? `🕒 ${etaTexto(b.min_por_zona)}`
                              : '🏁 Última parada'}
                        </span>
                      </div>
                      <div className="bus-card__meta">{b.conductor ?? 'Conductor'}</div>

                      {/* Próxima parada (para todos) */}
                      <div className="next-stop">
                        <span className="next-stop__cur">
                          {b.zona_numero != null || b.zona_nombre
                            ? zonaLabel(b.zona_nombre, b.zona_numero)
                            : 'En inicio'}
                        </span>
                        <span className="next-stop__arrow">→</span>
                        {prox ? (
                          <span className="next-stop__to">
                            <small>Próxima parada</small>
                            {zonaLabel(prox.nombre, prox.numero)}
                          </span>
                        ) : (
                          <span className="next-stop__to next-stop__to--end">
                            <small>Fin de ruta</small>
                            {b.estacionado ? 'Llegó · estacionado' : 'Terminando'}
                          </span>
                        )}
                      </div>

                      {/* Progreso: solo para el dashboard de admins */}
                      {esAdmin && (
                        <div className="bus-card__prog">
                          <div className="prog">
                            <div
                              className={`prog__fill${done ? ' prog__fill--done' : ''}`}
                              style={{ width: `${b.porcentaje}%` }}
                            />
                          </div>
                          <span className="bus-card__pct">
                            {b.porcentaje}% · {b.orden_actual}/{b.total_zonas}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function EmptyState({ icon, texto }: { icon: string; texto: string }) {
  return (
    <div className="live__empty">
      <span className="live__empty-icon">{icon}</span>
      <p>{texto}</p>
    </div>
  )
}

// "5 min", "1 h 5 min", "ahora"
function etaTexto(min: number): string {
  if (min <= 0) return 'ahora'
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

// Hora estimada de llegada usando el reloj local del navegador.
function horaLlegada(min: number): string {
  const d = new Date(Date.now() + min * 60_000)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
