import { useEffect, useRef, useState } from 'react'
import DashboardShell from '../components/DashboardShell'
import QrScanner from '../components/QrScanner'
import { getUser } from '../auth'
import { api, zonaLabel, type ChecadorInfo } from '../api'
import './checkin.css'

// Acepta tanto el QR JSON {"t":"transportista","usuario":N} como un número suelto.
function parseUsuario(text: string): number | null {
  const t = text.trim()
  try {
    const obj = JSON.parse(t)
    if (obj && obj.t === 'transportista' && obj.usuario != null) return Number(obj.usuario)
  } catch {
    /* no era JSON */
  }
  return /^\d+$/.test(t) ? Number(t) : null
}

export default function ChecadorPage() {
  const user = getUser()
  const [info, setInfo] = useState<ChecadorInfo | null>(null)
  const [scanning, setScanning] = useState(false)
  const [manual, setManual] = useState('')
  const [toast, setToast] = useState<{ tipo: string; msg: string } | null>(null)
  const lastScan = useRef<{ usuario: number; t: number } | null>(null)

  useEffect(() => {
    if (!user) return
    api.checador
      .info(user.id)
      .then(setInfo)
      .catch((e) => setToast({ tipo: 'err', msg: (e as Error).message }))
  }, [user])

  async function registrar(idUsuario: number) {
    if (!info?.id_zona) {
      setToast({ tipo: 'err', msg: 'No tienes una zona asignada.' })
      return
    }

    try {
      const r = await api.checkin({ id_usuario: idUsuario, id_zona: info.id_zona })
      setToast({
        tipo: r.yaEstaba ? 'info' : 'ok',
        msg: r.yaEstaba
          ? `El usuario ya estaba registrado en esta zona (ruta al ${r.porcentaje}%)`
          : `✓ Paso registrado · ruta al ${r.porcentaje}%`,
      })
    } catch (e) {
      setToast({ tipo: 'err', msg: (e as Error).message })
    }
    window.setTimeout(() => setToast(null), 5000)
  }

  function onScan(text: string) {
    const usuario = parseUsuario(text)
    if (usuario == null) return
    
    // Evita procesar el mismo QR muchas veces seguidas.
    const now = Date.now()
    if (lastScan.current && lastScan.current.usuario === usuario && now - lastScan.current.t < 4000) {
      return
    }
    lastScan.current = { usuario, t: now }
    setScanning(false)
    registrar(usuario)
  }

  function onManual() {
    const usuario = parseUsuario(manual)
    if (usuario != null) {
      registrar(usuario)
      setManual('')
    }
  }

  return (
    <DashboardShell title="Checador" accent="#7c3aed">
      <div className="ci">
        <h1 className="ci__hero">Control de paso</h1>
        <p className="ci__lead">
          Escanea el código del conductor para registrar su paso por tu zona.
        </p>

        {toast && <div className={`ci__toast ci__toast--${toast.tipo}`}>{toast.msg}</div>}

        {info && !info.asignado && (
          <div className="ci__card">No tienes una zona asignada.</div>
        )}

        {info?.asignado && (
          <div className="ci__card">
            <span className="ci__zona-badge">{zonaLabel(info.zona_nombre, info.zona_numero)}</span>
            
            {scanning ? (
              <>
                <div className="ci__scanner">
                  <QrScanner active={scanning} onResult={onScan} />
                </div>
                <button
                  className="btn btn--ghost"
                  style={{ marginTop: 14 }}
                  onClick={() => setScanning(false)}
                >
                  Detener cámara
                </button>
              </>
            ) : (
              <button className="btn btn--primary" onClick={() => setScanning(true)}>
                Escanear Transportista
              </button>
            )}

            <div className="ci__manual">
              <input
                type="number"
                placeholder="N° usuario o placa (solo demo ID)"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
              />
              <button className="btn btn--ghost" onClick={onManual}>
                Registrar manual
              </button>
            </div>

            {info.rutas && info.rutas.length > 0 && (
              <div className="ci__rutas" style={{ marginTop: '20px' }}>
                <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: 'var(--text-lighter)' }}>Rutas vigiladas:</p>
                {info.rutas.map((r) => (
                  <span key={r.id} className="tag">
                    Ruta {r.numero_ruta}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
