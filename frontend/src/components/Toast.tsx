import { createContext, useCallback, useContext, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import './Toast.css'

type ToastType = 'success' | 'error' | 'info'

type ToastItem = {
  id: number
  message: string
  type: ToastType
  leaving: boolean
}

type ToastApi = {
  show: (message: string, type?: ToastType) => void
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const DURATION = 4000

const ICONS: Record<ToastType, ReactNode> = {
  success: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
      <path
        d="M20 6 9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
      <path
        d="M18 6 6 18M6 6l12 12"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
      <path
        d="M12 16v-5M12 8h.01"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const idRef = useRef(0)
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({})

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    delete timers.current[id]
  }, [])

  const dismiss = useCallback((id: number) => {
    // marca como saliente para reproducir la animación de salida
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)))
  }, [])

  const show = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = ++idRef.current
      setToasts((prev) => [...prev, { id, message, type, leaving: false }])
      timers.current[id] = setTimeout(() => dismiss(id), DURATION)
    },
    [dismiss],
  )

  const api: ToastApi = {
    show,
    success: (m) => show(m, 'success'),
    error: (m) => show(m, 'error'),
    info: (m) => show(m, 'info'),
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div className="toast-stack" role="region" aria-live="polite">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`toast toast--${t.type}${t.leaving ? ' toast--leaving' : ''}`}
              onAnimationEnd={(e) => {
                if (t.leaving && e.animationName === 'toast-out') remove(t.id)
              }}
            >
              <span className="toast__icon">{ICONS[t.type]}</span>
              <span className="toast__msg">{t.message}</span>
              <button
                type="button"
                className="toast__close"
                onClick={() => dismiss(t.id)}
                aria-label="Cerrar"
              >
                ×
              </button>
              <span className="toast__bar" />
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>')
  return ctx
}
