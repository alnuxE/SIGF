import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import './ConfirmDialog.css'

type ConfirmOptions = {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

type State = (ConfirmOptions & { open: boolean; leaving: boolean }) | null

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(null)
  const resolver = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
      setState({ ...options, open: true, leaving: false })
    })
  }, [])

  const close = useCallback((result: boolean) => {
    resolver.current?.(result)
    resolver.current = null
    // dispara la animación de salida antes de desmontar
    setState((prev) => (prev ? { ...prev, leaving: true } : prev))
  }, [])

  useEffect(() => {
    if (!state?.open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close(false)
      if (e.key === 'Enter') close(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state?.open, close])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state &&
        createPortal(
          <div
            className={`cfm-overlay${state.leaving ? ' cfm-overlay--leaving' : ''}`}
            onClick={() => close(false)}
            onAnimationEnd={(e) => {
              if (state.leaving && e.animationName === 'cfm-overlay-out') setState(null)
            }}
          >
            <div
              className={`cfm${state.leaving ? ' cfm--leaving' : ''}`}
              onClick={(e) => e.stopPropagation()}
              role="alertdialog"
              aria-modal="true"
            >
              <div className={`cfm__icon${state.danger ? ' cfm__icon--danger' : ''}`}>
                {state.danger ? (
                  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" aria-hidden>
                    <path
                      d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M10 11v6M14 11v6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" aria-hidden>
                    <path
                      d="M12 9v4M12 17h.01"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                    />
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                  </svg>
                )}
              </div>

              <h2 className="cfm__title">{state.title ?? '¿Estás seguro?'}</h2>
              <p className="cfm__msg">{state.message}</p>

              <div className="cfm__actions">
                <button type="button" className="btn btn--ghost" onClick={() => close(false)}>
                  {state.cancelText ?? 'Cancelar'}
                </button>
                <button
                  type="button"
                  className={`btn ${state.danger ? 'btn--danger-solid' : 'btn--primary'}`}
                  onClick={() => close(true)}
                  autoFocus
                >
                  {state.confirmText ?? 'Confirmar'}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm debe usarse dentro de <ConfirmProvider>')
  return ctx
}
