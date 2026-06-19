const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

// URL del canal de tiempo real (Server-Sent Events).
export const EVENTS_URL = `${API_URL}/api/events`

async function http<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Error ${res.status}`)
  }
  if (res.status === 204) return null as T
  return res.json() as Promise<T>
}

export interface Zona {
  id: number
  numero: number | null
  nombre: string | null
  lat: number | null
  lng: number | null
}

export interface RutaZona {
  id_zona: number
  numero: number | null
  nombre: string | null
  orden: number
}

// Etiqueta legible de una zona: usa el nombre y, si no hay, "Zona N".
export function zonaLabel(
  nombre?: string | null,
  numero?: number | null,
): string {
  if (nombre && nombre.trim()) return nombre.trim()
  return numero != null ? `Zona ${numero}` : 'Zona'
}

export interface Ruta {
  id: number
  numero_ruta: number
  zonas: RutaZona[]
}

export interface Progreso {
  id: number
  numero_ruta: number
  total: number
  completadas: number
  porcentaje: number
  fecha_inicio: string | null
  fecha_fin: string | null
  transportista: string | null
}

export interface ChecadorInfo {
  asignado: boolean
  checador_id?: number
  id_zona?: number
  zona_numero?: number
  zona_nombre?: string | null
  rutas?: { id: number; numero_ruta: number; orden: number }[]
}

export interface ConductorZona {
  id_zona: number
  numero: number | null
  nombre: string | null
  orden: number
  id_zona_ruta: number
  checked: boolean
}

export interface ConductorInfo {
  asignado: boolean
  conductor_id?: number
  id_ruta?: number
  numero_ruta?: number
  zonas?: ConductorZona[]
}

export interface CheckinResult {
  ok: boolean
  yaEstaba: boolean
  id_ruta: number
  id_zona: number
  total: number
  completadas: number
  porcentaje: number
}

export interface Rol {
  id: number
  nombre: string
}

export interface Usuario {
  id: number
  email: string
  nombre?: string
  apellidos?: string
  id_rol?: number
  is_admin: boolean
  created_at: string
  rol_nombre?: string
  id_ruta?: number
  numero_ruta?: number
  id_zona?: number
  zona_numero?: number
  zona_nombre?: string | null
}

export interface Transporte {
  id: number
  num_placas: string
  clase: string
  id_transportista?: number
  nombre?: string
  apellidos?: string
}

// ---- Vista pública en vivo (pasajeros) ----
export interface PublicRutaZona {
  id_zona: number
  numero: number | null
  nombre: string | null
  orden: number
}

export interface PublicRuta {
  id: number
  numero_ruta: number
  zonas: PublicRutaZona[]
}

export interface LiveViaje {
  id_viaje: number
  id_ruta: number
  numero_ruta: number
  num_placas: string | null
  clase: string | null
  conductor: string | null
  total_zonas: number
  orden_actual: number
  zona_numero: number | null
  zona_nombre: string | null
  id_zona: number | null
  hora: string | null
  porcentaje: number
  min_por_zona: number
  eta_fin_min: number
}

export interface ParadaCamion {
  numero_ruta: number
  id_ruta: number
  id_viaje: number
  orden_actual: number
  faltan: number // > 0 llegando · 0 en la parada · < 0 ya pasó
  num_placas: string | null
  clase: string | null
  conductor: string | null
  destino_nombre: string | null
  destino_numero: number | null
  min_por_zona: number
  eta_min: number
}

export const api = {
  zonas: {
    list: () => http<Zona[]>('/api/zonas'),
    create: (data: {
      nombre: string
      numero?: number | null
      lat?: number | null
      lng?: number | null
    }) => http<Zona>('/api/zonas', { method: 'POST', body: JSON.stringify(data) }),
    remove: (id: number) => http<null>(`/api/zonas/${id}`, { method: 'DELETE' }),
  },
  rutas: {
    list: () => http<Ruta[]>('/api/rutas'),
    create: (data: { numero_ruta: number; zonas: number[] }) =>
      http<Ruta>('/api/rutas', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: { numero_ruta: number; zonas: number[] }) =>
      http<Ruta>(`/api/rutas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id: number) => http<null>(`/api/rutas/${id}`, { method: 'DELETE' }),
  },
  usuarios: {
    list: () => http<Usuario[]>('/api/usuarios'),
    create: (data: any) => http<Usuario>('/api/usuarios', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => http<{success: boolean}>(`/api/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id: number) => http<{success: boolean}>(`/api/usuarios/${id}`, { method: 'DELETE' }),
    roles: () => http<Rol[]>('/api/usuarios/roles'),
  },
  transportes: {
    list: () => http<Transporte[]>('/api/transportes'),
    create: (data: any) => http<Transporte>('/api/transportes', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => http<{success: boolean}>(`/api/transportes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id: number) => http<{success: boolean}>(`/api/transportes/${id}`, { method: 'DELETE' }),
  },
  progress: () => http<Progreso[]>('/api/progress'),
  checador: {
    info: (usuario: number) => http<ChecadorInfo>(`/api/checador/info/${usuario}`),
  },
  conductor: {
    info: (usuario: number) => http<ConductorInfo>(`/api/conductor/info/${usuario}`),
  },
  checkin: (data: { id_usuario: number; id_zona: number }) =>
    http<CheckinResult>('/api/checkin', { method: 'POST', body: JSON.stringify(data) }),
  publico: {
    rutas: () => http<PublicRuta[]>('/api/public/rutas'),
    live: () => http<LiveViaje[]>('/api/public/live'),
    parada: (idZona: number) => http<ParadaCamion[]>(`/api/public/parada/${idZona}`),
  },
}
