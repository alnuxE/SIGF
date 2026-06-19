import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { getUser, HOME_BY_ROLE, type Role } from '../auth'

interface RoleRouteProps {
  allow: Role[]
  children: ReactNode
}

/**
 * "Middleware" de ruta:
 *  - Sin sesión        -> al login.
 *  - Con rol no permitido -> a la vista que SÍ le corresponde a su rol.
 *  - Rol permitido     -> renderiza la vista.
 */
export default function RoleRoute({ allow, children }: RoleRouteProps) {
  const user = getUser()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!allow.includes(user.role)) {
    return <Navigate to={HOME_BY_ROLE[user.role]} replace />
  }

  return <>{children}</>
}
