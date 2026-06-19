import { useEffect, useRef } from 'react'
import { EVENTS_URL } from '../api'

export interface CheckinEvent {
  id_ruta: number
  id_zona: number
  id_zona_ruta: number
  total: number
  completadas: number
  porcentaje: number
  hora: string
}

// Abre un EventSource y llama a onCheckin cada vez que el backend emite
// un evento "checkin". Se reconecta solo si la conexión se cae.
export function useCheckinEvents(onCheckin: (e: CheckinEvent) => void) {
  const cb = useRef(onCheckin)
  cb.current = onCheckin

  useEffect(() => {
    const es = new EventSource(EVENTS_URL)
    es.addEventListener('checkin', (ev) => {
      try {
        cb.current(JSON.parse((ev as MessageEvent).data))
      } catch {
        /* ignora payloads inválidos */
      }
    })
    return () => es.close()
  }, [])
}
