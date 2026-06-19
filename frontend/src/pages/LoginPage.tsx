import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { setUser, HOME_BY_ROLE } from '../auth'
import './LoginPage.css'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setIsError(true)
        setMessage(data.error ?? 'Error')
        return
      }

      // Guarda la sesión y redirige según el rol que devolvió el backend.
      const user = data.user
      setUser(user)
      const destino = HOME_BY_ROLE[user.role as keyof typeof HOME_BY_ROLE]
      navigate(destino ?? '/', { replace: true })
    } catch {
      setIsError(true)
      setMessage('No se pudo conectar con el servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login">
      {/* Panel de marca */}
      <aside className="login__aside">
        <div className="login__aside-brand">
          <span className="login__aside-logo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3 4 7v10l8 4 8-4V7l-8-4Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <path d="m4 7 8 4 8-4M12 11v10" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            </svg>
          </span>
          SIGL
        </div>

        <div className="login__aside-copy">
          <h2>Logística inteligente, de punta a punta.</h2>
          <p>
            Controla tus envíos, optimiza rutas y rastrea cada inventario en
            tiempo real desde una sola plataforma.
          </p>
        </div>

        <ul className="login__aside-features">
          {[
            'Seguimiento de envíos en vivo',
            'Optimización de rutas y flotas',
            'Control de inventario y almacenes',
          ].map((f) => (
            <li key={f}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="m5 12.5 4 4 10-10"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {f}
            </li>
          ))}
        </ul>
      </aside>

      {/* Formulario */}
      <section className="login__main">
        <div className="login__card">
          <h1 className="login__title">Bienvenido de nuevo</h1>
          <p className="login__subtitle">Ingresa tus credenciales para acceder.</p>

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label className="field__label" htmlFor="email">
                Correo corporativo
              </label>
              <div className="field__control">
                <span className="field__icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
                    <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </span>
                <input
                  id="email"
                  className="field__input"
                  type="email"
                  placeholder="nombre@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="field">
              <label className="field__label" htmlFor="password">
                Contraseña
              </label>
              <div className="field__control">
                <span className="field__icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <rect x="4" y="10" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M8 10V8a4 4 0 0 1 8 0v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </span>
                <input
                  id="password"
                  className="field__input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="field__toggle"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8M9.4 5.2A9.8 9.8 0 0 1 12 5c5 0 9 4.5 9 7a12 12 0 0 1-2.2 2.9M6.3 6.6C3.9 8 2 10.3 2 12c0 2.5 4 7 9 7 1 0 2-.2 2.9-.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" stroke="currentColor" strokeWidth="1.6" />
                      <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.6" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="login__options">
              <label className="login__remember">
                <input type="checkbox" />
                Recordarme
              </label>
              <a className="login__link" href="#">
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            <button className="login__submit" type="submit" disabled={loading}>
              {loading && <span className="login__spinner" />}
              {loading ? 'Verificando…' : 'Iniciar sesión'}
            </button>
          </form>

          {message && (
            <p
              className={`login__message ${
                isError ? 'login__message--error' : 'login__message--success'
              }`}
              role={isError ? 'alert' : 'status'}
            >
              {message}
            </p>
          )}

          <p className="login__signup">
            ¿No tienes cuenta?{' '}
            <a className="login__link" href="#">
              Solicita acceso
            </a>
          </p>

          <p className="login__signup">
            ¿Eres pasajero?{' '}
            <Link className="login__link" to="/vivo">
              Ver camiones en vivo
            </Link>
          </p>
        </div>
      </section>
    </main>
  )
}
