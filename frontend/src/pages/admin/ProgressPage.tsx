import { useEffect, useMemo, useState } from 'react'
import { api, type Progreso } from '../../api'
import { useCheckinEvents } from '../../hooks/useCheckinEvents'
import { useToast } from '../../components/Toast'
import './admin.css'

type Vista = 'rutas' | 'resumen'

export default function ProgressPage() {
  const toast = useToast()
  const [data, setData] = useState<Progreso[]>([])
  const [loading, setLoading] = useState(false)
  const [vista, setVista] = useState<Vista>('rutas')

  async function cargar() {
    setLoading(true)
    try {
      setData(await api.progress())
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  // Actualización en tiempo real: recarga al llegar cualquier check-in.
  useCheckinEvents(() => cargar())

  return (
    <div>
      <div className="page__head">
        <div>
          <h1 className="page__title">Progress</h1>
          <p className="page__subtitle">
            Avance de cada ruta según los check-ins registrados en sus zonas.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <label className="view-select">
            <span>Vista</span>
            <select value={vista} onChange={(e) => setVista(e.target.value as Vista)}>
              <option value="rutas">Progreso de rutas</option>
              <option value="resumen">Resumen</option>
            </select>
          </label>
          <button className="btn btn--ghost" onClick={cargar} disabled={loading}>
            {loading ? 'Actualizando…' : 'Actualizar'}
          </button>
        </div>
      </div>

      {vista === 'rutas' ? (
        <VistaRutas data={data} loading={loading} />
      ) : (
        <VistaResumen data={data} loading={loading} />
      )}
    </div>
  )
}

/* ---------------------------------------------------------------------------
   Vista: tabla de progreso de cada ruta
   --------------------------------------------------------------------------- */
function VistaRutas({ data, loading }: { data: Progreso[]; loading: boolean }) {
  return (
    <div className="card card--table" style={{ padding: 0 }}>
      {data.length === 0 && !loading ? (
        <p className="empty">No hay rutas para mostrar.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Ruta</th>
              <th style={{ width: '28%' }}>Progreso</th>
              <th>Fecha de inicio</th>
              <th>Fecha de fin</th>
              <th>Transportista</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => {
              const done = r.porcentaje === 100 && r.total > 0
              return (
                <tr key={r.id}>
                  <td>
                    <strong>Ruta {r.numero_ruta}</strong>
                  </td>
                  <td>
                    <div className="progress-cell">
                      <div className="bar">
                        <div
                          className={`bar__fill${done ? ' bar__fill--done' : ''}`}
                          style={{ width: `${r.porcentaje}%` }}
                        />
                      </div>
                      <span className="progress-cell__pct">{r.porcentaje}%</span>
                    </div>
                    <div className="progress-card__meta">
                      {r.completadas} de {r.total} zonas con check-in
                    </div>
                  </td>
                  <td>{fmtFecha(r.fecha_inicio)}</td>
                  <td>{fmtFecha(r.fecha_fin)}</td>
                  <td>
                    {r.transportista ?? (
                      <span style={{ color: 'var(--slate-400)' }}>Sin asignar</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

/* ---------------------------------------------------------------------------
   Vista: resumen con gráficas
   --------------------------------------------------------------------------- */
function VistaResumen({ data, loading }: { data: Progreso[]; loading: boolean }) {
  const stats = useMemo(() => {
    const completadas = data.filter((r) => r.total > 0 && r.porcentaje === 100).length
    const sinIniciar = data.filter((r) => r.total === 0 || r.porcentaje === 0).length
    const enProgreso = data.length - completadas - sinIniciar
    const avancePromedio = data.length
      ? Math.round(data.reduce((sum, r) => sum + r.porcentaje, 0) / data.length)
      : 0
    return { total: data.length, completadas, enProgreso, sinIniciar, avancePromedio }
  }, [data])

  // Rutas que aún no terminan, ordenadas por mayor avance primero.
  const porTerminar = useMemo(
    () =>
      data
        .filter((r) => !(r.total > 0 && r.porcentaje === 100))
        .sort((a, b) => b.porcentaje - a.porcentaje),
    [data],
  )

  if (data.length === 0 && !loading) {
    return (
      <div className="card card--table" style={{ padding: 0 }}>
        <p className="empty">No hay rutas para mostrar.</p>
      </div>
    )
  }

  const segmentos = [
    { label: 'Completadas', valor: stats.completadas, color: '#22c55e' },
    { label: 'En progreso', valor: stats.enProgreso, color: '#2563eb' },
    { label: 'Sin iniciar', valor: stats.sinIniciar, color: '#cbd5e1' },
  ]

  return (
    <div className="resumen">
      {/* Tarjetas de indicadores */}
      <div className="kpi-grid">
        <KpiCard label="Rutas totales" valor={stats.total} color="#0f172a" />
        <KpiCard label="Completadas" valor={stats.completadas} color="#16a34a" />
        <KpiCard label="En progreso" valor={stats.enProgreso} color="#2563eb" />
        <KpiCard label="Sin iniciar" valor={stats.sinIniciar} color="#64748b" />
      </div>

      <div className="resumen__row">
        {/* Dona: estado de las rutas */}
        <div className="card chart-card">
          <h2 className="chart-card__title">Estado de las rutas</h2>
          <div className="donut-wrap">
            <Donut segmentos={segmentos} centro={`${stats.avancePromedio}%`} centroLabel="avance medio" />
            <ul className="legend">
              {segmentos.map((s) => (
                <li key={s.label}>
                  <span className="legend__dot" style={{ background: s.color }} />
                  <span className="legend__label">{s.label}</span>
                  <span className="legend__val">{s.valor}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Barras: rutas que faltan por terminar */}
        <div className="card chart-card">
          <h2 className="chart-card__title">Rutas por terminar</h2>
          {porTerminar.length === 0 ? (
            <p className="empty" style={{ padding: 24 }}>
              🎉 Todas las rutas están completas.
            </p>
          ) : (
            <ul className="hbar-list">
              {porTerminar.map((r) => (
                <li key={r.id} className="hbar">
                  <span className="hbar__label">Ruta {r.numero_ruta}</span>
                  <div className="bar">
                    <div className="bar__fill" style={{ width: `${r.porcentaje}%` }} />
                  </div>
                  <span className="hbar__val">
                    {r.porcentaje}%
                    <small>
                      faltan {Math.max(r.total - r.completadas, 0)} de {r.total}
                    </small>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function KpiCard({ label, valor, color }: { label: string; valor: number; color: string }) {
  return (
    <div className="card kpi">
      <div className="kpi__valor" style={{ color }}>
        {valor}
      </div>
      <div className="kpi__label">{label}</div>
    </div>
  )
}

function Donut({
  segmentos,
  centro,
  centroLabel,
}: {
  segmentos: { label: string; valor: number; color: string }[]
  centro: string
  centroLabel: string
}) {
  const total = segmentos.reduce((s, x) => s + x.valor, 0)
  const radio = 54
  const circ = 2 * Math.PI * radio
  let acumulado = 0

  return (
    <svg width="140" height="140" viewBox="0 0 140 140" className="donut">
      <g transform="translate(70,70) rotate(-90)">
        <circle r={radio} fill="none" stroke="var(--slate-100)" strokeWidth="18" />
        {total > 0 &&
          segmentos.map((s) => {
            if (s.valor === 0) return null
            const frac = s.valor / total
            const dash = frac * circ
            const offset = -acumulado * circ
            acumulado += frac
            return (
              <circle
                key={s.label}
                r={radio}
                fill="none"
                stroke={s.color}
                strokeWidth="18"
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeDashoffset={offset}
              />
            )
          })}
      </g>
      <text x="70" y="66" textAnchor="middle" className="donut__valor">
        {centro}
      </text>
      <text x="70" y="84" textAnchor="middle" className="donut__label">
        {centroLabel}
      </text>
    </svg>
  )
}

function fmtFecha(valor: string | null) {
  if (!valor) return <span style={{ color: 'var(--slate-400)' }}>—</span>
  return valor
}
