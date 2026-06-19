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

    // Promesa de arranque de la cámara. Encadenamos el stop a ESTA promesa
    // (no la detenemos de forma síncrona) para no intentar pararla antes de
    // que termine de iniciarse. Sin esto, el doble montaje de React StrictMode
    // en desarrollo dejaba la primera cámara viva y abría una segunda → la
    // cámara aparecía dos veces.
    const startPromise = scanner
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
        // Re-lanzamos para que el cleanup NO intente stop() sobre una cámara
        // que nunca llegó a arrancar.
        throw err
      })

    return () => {
      cancelled = true
      startPromise
        .then(() => scanner.stop())
        .then(() => scanner.clear())
        .catch(() => {})
    }
  }, [active])

  return <div id="qr-reader" style={{ width: '100%' }} />
}
