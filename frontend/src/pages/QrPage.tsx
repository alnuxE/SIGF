import { useMemo } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Link } from 'react-router-dom'
import './checkin.css'

// Vista pública: muestra un código QR que lleva directo a la vista en vivo (/vivo).
// Cualquiera puede escanearlo con su teléfono para ver los camiones en tiempo real,
// sin necesidad de iniciar sesión.
export default function QrPage() {
  // URL absoluta a la vista en vivo, basada en el dominio donde se sirve la app.
  // Así el QR funciona igual en local (localhost:5173) que en el servidor.
  const liveUrl = useMemo(() => `${window.location.origin}/vivo`, [])

  return (
    <div className="ci">
      <h1 className="ci__hero">Ver en vivo</h1>
      <p className="ci__lead">
        Escanea este código QR con la cámara de tu teléfono para ver los
        camiones en tiempo real.
      </p>

      <div className="ci__card">
        <span className="ci__qr">
          <QRCodeSVG value={liveUrl} size={240} level="M" />
        </span>
        <p className="ci__qr-hint">Apunta la cámara al código</p>
      </div>

      <div className="ci__card">
        <Link
          to="/vivo"
          style={{
            display: 'inline-block',
            padding: '0.7rem 1.4rem',
            borderRadius: 10,
            background: '#2563eb',
            color: '#fff',
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          Abrir la vista en vivo
        </Link>
        <p className="ci__qr-hint" style={{ wordBreak: 'break-all' }}>
          {liveUrl}
        </p>
      </div>
    </div>
  )
}
