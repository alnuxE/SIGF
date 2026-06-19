import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './LocationPicker.css'

type Props = {
  lat: number | null
  lng: number | null
  onChange: (lat: number, lng: number) => void
  /** Centro por defecto cuando aún no hay punto (CDMX). */
  defaultCenter?: [number, number]
  height?: number
}

// Pin SVG como divIcon: evita el problema de las imágenes rotas de Leaflet con bundlers.
const pinIcon = L.divIcon({
  className: 'lp-pin',
  html: `<svg viewBox="0 0 24 24" width="34" height="34" fill="none">
    <path d="M12 22s7-6.7 7-12a7 7 0 1 0-14 0c0 5.3 7 12 7 12Z"
      fill="#2563eb" stroke="#1d4ed8" stroke-width="1.2"/>
    <circle cx="12" cy="10" r="2.6" fill="#fff"/>
  </svg>`,
  iconSize: [34, 34],
  iconAnchor: [17, 32],
})

export default function LocationPicker({
  lat,
  lng,
  onChange,
  defaultCenter = [19.4326, -99.1332],
  height = 280,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState('')

  function setMarker(la: number, ln: number) {
    const map = mapRef.current
    if (!map) return
    if (markerRef.current) {
      markerRef.current.setLatLng([la, ln])
    } else {
      markerRef.current = L.marker([la, ln], { icon: pinIcon }).addTo(map)
    }
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const start: [number, number] =
      lat != null && lng != null ? [lat, lng] : defaultCenter
    const map = L.map(containerRef.current, {
      center: start,
      zoom: lat != null && lng != null ? 15 : 12,
      zoomControl: true,
    })
    mapRef.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map)

    if (lat != null && lng != null) setMarker(lat, lng)

    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat: la, lng: ln } = e.latlng
      setMarker(la, ln)
      onChangeRef.current(Number(la.toFixed(6)), Number(ln.toFixed(6)))
    })

    // El modal entra con animación; recalculamos tamaño cuando ya es visible.
    const t1 = setTimeout(() => map.invalidateSize(), 60)
    const t2 = setTimeout(() => map.invalidateSize(), 320)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
    // Solo en el montaje: el mapa se gestiona de forma imperativa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function ubicarme() {
    if (!navigator.geolocation) {
      setGeoError('Tu navegador no soporta geolocalización')
      return
    }
    setGeoError('')
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const la = pos.coords.latitude
        const ln = pos.coords.longitude
        mapRef.current?.setView([la, ln], 16)
        setMarker(la, ln)
        onChangeRef.current(Number(la.toFixed(6)), Number(ln.toFixed(6)))
        setLocating(false)
      },
      (err) => {
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? 'Permiso de ubicación denegado'
            : 'No se pudo obtener tu ubicación',
        )
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  return (
    <div className="lp">
      <div className="lp__map" style={{ height }} ref={containerRef} />

      <button type="button" className="lp__locate" onClick={ubicarme} disabled={locating}>
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="2" />
          <path
            d="M12 2v3M12 19v3M22 12h-3M5 12H2"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        {locating ? 'Ubicando…' : 'Mi ubicación'}
      </button>

      <div className="lp__readout">
        {lat != null && lng != null ? (
          <>
            <span className="lp__coord">
              <small>Lat</small> {lat}
            </span>
            <span className="lp__coord">
              <small>Lng</small> {lng}
            </span>
          </>
        ) : (
          <span className="lp__hint">Haz clic en el mapa para marcar la ubicación</span>
        )}
      </div>

      {geoError && <div className="lp__error">{geoError}</div>}
    </div>
  )
}
