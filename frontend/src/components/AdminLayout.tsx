import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { getUser, logout } from '../auth'
import './AdminLayout.css'

const COLLAPSE_KEY = 'adm.sidebarCollapsed'

const NAV = [
  { to: '/admin/zonas', label: 'Zonas', icon: 'M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11Z M12 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z' },
  { to: '/admin/rutas', label: 'Rutas', icon: 'M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z M18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z M8 17h6a3 3 0 0 0 3-3V9 M6 15V8a3 3 0 0 1 3-3h3' },
  { to: '/admin/usuarios', label: 'Usuarios', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75' },
  { to: '/admin/transportes', label: 'Transportes', icon: 'M3 13h1v-2a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v2h1a2 2 0 0 1 2 2v4h-2v2a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-2H8v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2H1v-4a2 2 0 0 1 2-2Z M4 17h16' },
  { to: '/admin/progress', label: 'Progress', icon: 'M4 18V6 M4 18h16 M8 16v-5 M12 16V8 M16 16v-3' },
  { to: '/vivo', label: 'En vivo', icon: 'M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z' },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const user = getUser()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === '1')

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
      return next
    })
  }

  return (
    <div className={`adm${collapsed ? ' adm--collapsed' : ''}`}>
      <aside className="adm__side">
        <div className="adm__brand">
          <span className="adm__logo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="m4 7 8 4 8-4M12 11v10" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="adm__brand-text">
            <strong>SIGL</strong>
            <small>Panel de control</small>
          </span>
          <button
            type="button"
            className="adm__toggle"
            onClick={toggleCollapsed}
            title={collapsed ? 'Mostrar menú' : 'Ocultar menú'}
            aria-label={collapsed ? 'Mostrar menú' : 'Ocultar menú'}
            aria-pressed={collapsed}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <nav className="adm__nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `adm__link${isActive ? ' adm__link--active' : ''}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d={item.icon} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="adm__user">
          <div className="adm__user-info">
            <span className="adm__user-name">
              {user?.nombre ? `${user.nombre} ${user.apellidos ?? ''}` : user?.email}
            </span>
            <span className="adm__user-role">{user?.role}</span>
          </div>
          <button className="adm__logout" onClick={handleLogout} title="Cerrar sesión">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </aside>

      <main className="adm__main">
        <Outlet />
      </main>
    </div>
  )
}
