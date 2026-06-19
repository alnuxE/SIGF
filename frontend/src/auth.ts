// Estado de sesión muy simple basado en localStorage.
// Más adelante esto se reemplaza por un JWT emitido por el backend.

export type Role = 'admin' | 'transportista' | 'checador'

export interface AuthUser {
  id: number
  email: string
  nombre?: string
  apellidos?: string
  role: Role
}

const STORAGE_KEY = 'sigl_user'

// A dónde va cada rol después de iniciar sesión.
export const HOME_BY_ROLE: Record<Role, string> = {
  admin: '/admin',
  transportista: '/transportista',
  checador: '/checador',
}

export function getUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

export function setUser(user: AuthUser): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
}

export function logout(): void {
  localStorage.removeItem(STORAGE_KEY)
}
