import { useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

interface QrScannerProps {
  onResult: (text: string) => void
  active: boolean
}

// Escáner de cámara basado en html5-qrcode. Mientras `active` sea true,
// muestra el video y reporta cada lectura por onResult.
export default function QrScanner({ onResult, active }: QrScannerProps) {
  const onResultRef = useRef(onResult)
  onResultRef.current = onResult

  useEffect(() => {
    if (!active) return
    const el = document.getElementById('qr-reader')
    if (!el) return

    const scanner = new Html5Qrcode('qr-reader')
    let cancelled = false

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 240 },
        (decoded) => onResultRef.current(decoded),
        () => {},
      )
      .catch((err) => {
        if (!cancelled) {
          const target = document.getElementById('qr-reader')
          if (target) {
            target.innerHTML =
              '<p style="padding:16px;color:#dc2626;font-size:13px">No se pudo abrir la cámara. Usa la opción manual de abajo.</p>'
          }
          console.error('Error al iniciar la cámara:', err)
        }
      })

    return () => {
      cancelled = true
      try {
        scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => {})
      } catch (err) {
        try { scanner.clear() } catch (e) {}
      }
    }
  }, [active])

  return <div id="qr-reader" style={{ width: '100%' }} />
}
