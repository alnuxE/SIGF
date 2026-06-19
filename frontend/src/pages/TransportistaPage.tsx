import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import DashboardShell from '../components/DashboardShell'
import { useCheckinEvents } from '../hooks/useCheckinEvents'
import { getUser } from '../auth'
import { api, zonaLabel, type ConductorInfo } from '../api'
import './checkin.css'

export default function TransportistaPage() {
  const user = getUser()
  const [info, setInfo] = useState<ConductorInfo | null>(null)
  const [toast, setToast] = useState<{ tipo: string; msg: string } | null>(null)

  async function cargar() {
    if (!user) return
    try {
      setInfo(await api.conductor.info(user.id))
    } catch (e) {
      setToast({ tipo: 'err', msg: (e as Error).message })
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  // Refresca la ruta en vivo cuando llega cualquier check-in de esta ruta.
  useCheckinEvents((e) => {
    if (info?.id_ruta && e.id_ruta === info.id_ruta) {
      setToast({ tipo: 'ok', msg: `✓ Paso registrado en zona ${e.id_zona} (${e.porcentaje}%)` })
      window.setTimeout(() => setToast(null), 5000)
      cargar()
    }
  })

  const total = info?.zonas?.length ?? 0
  const hechas = info?.zonas?.filter((z) => z.checked).length ?? 0
  const pct = total > 0 ? Math.round((hechas / total) * 100) : 0

  const qrValue = user ? JSON.stringify({ t: 'transportista', usuario: user.id }) : ''

  return (
    <DashboardShell title="Transportista" accent="#2563eb">
      <div className="ci">
        <h1 className="ci__hero">Mi ruta</h1>
        <p className="ci__lead">
          Muestra tu código QR al checador en cada zona para registrar tu paso.
        </p>

        {toast && <div className={`ci__toast ci__toast--${toast.tipo}`}>{toast.msg}</div>}

        {info && !info.asignado && (
          <div className="ci__card">No tienes una ruta asignada como conductor.</div>
        )}

        {info?.asignado && (
          <>
            <div className="ci__card">
              <span className="ci__zona-badge">Ruta {info.numero_ruta}</span>
              <div>
                <span className="ci__qr">
                  {qrValue && <QRCodeSVG value={qrValue} size={220} level="M" />}
                </span>
              </div>
              <p className="ci__qr-hint">Tu código de identificación</p>
            </div>

            {/* Progreso y zonas */}
            <div className="ci__card" style={{ textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>Avance de la ruta</strong>
                <span style={{ fontWeight: 700 }}>{pct}%</span>
              </div>
              <div className="ci__bar">
                <div
                  className={`ci__bar-fill${pct === 100 ? ' ci__bar-fill--done' : ''}`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              <ul className="ci__zonas">
                {info.zonas?.map((z) => (
                  <li key={z.id_zona} className={`ci__zona${z.checked ? ' ci__zona--done' : ''}`}>
                    <span className="ci__zona-num">{z.orden}</span>
                    <span className="ci__zona-name">{zonaLabel(z.nombre, z.numero)}</span>
                    <span className="ci__zona-state">
                      {z.checked ? 'Registrada' : 'Pendiente'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  )
}
