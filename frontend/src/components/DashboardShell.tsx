import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUser, logout } from '../auth'
import './DashboardShell.css'

interface DashboardShellProps {
  title: string
  accent?: string
  children: ReactNode
}

export default function DashboardShell({ title, accent = '#2563eb', children }: DashboardShellProps) {
  const navigate = useNavigate()
  const user = getUser()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="dash">
      <header className="dash__header">
        <div className="dash__brand">
          <span className="dash__dot" style={{ background: accent }} />
          <strong>SIGL</strong>
          <span className="dash__sep">/</span>
          <span className="dash__title">{title}</span>
        </div>
        <div className="dash__user">
          <span className="dash__user-name">
            {user?.nombre ? `${user.nombre} ${user.apellidos ?? ''}` : user?.email}
            <span className="dash__role" style={{ color: accent }}>
              {user?.role}
            </span>
          </span>
          <button className="dash__logout" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </header>
      <main className="dash__content">{children}</main>
    </div>
  )
}
