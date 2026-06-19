import { useEffect, useRef, useState } from 'react'
import './MultiSelect.css'

export type Option = { value: number; label: string }

type Props = {
  options: Option[]
  value: number[]
  onChange: (value: number[]) => void
  placeholder?: string
  /** Muestra el orden de selección como número en cada tag. */
  ordered?: boolean
  emptyText?: string
}

export default function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Selecciona…',
  ordered = false,
  emptyText = 'Sin resultados',
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function toggle(val: number) {
    onChange(value.includes(val) ? value.filter((v) => v !== val) : [...value, val])
  }

  function remove(val: number, e: React.MouseEvent) {
    e.stopPropagation()
    onChange(value.filter((v) => v !== val))
  }

  const labelOf = (val: number) => options.find((o) => o.value === val)?.label ?? String(val)

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(query.trim().toLowerCase()),
  )

  function openAndFocus() {
    setOpen(true)
    // enfoca el buscador en el siguiente frame
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  return (
    <div className="ms" ref={rootRef}>
      <div
        className={`ms__control${open ? ' ms__control--open' : ''}`}
        onClick={() => (open ? inputRef.current?.focus() : openAndFocus())}
      >
        <div className="ms__values">
          {value.length === 0 && <span className="ms__placeholder">{placeholder}</span>}
          {value.map((val, i) => (
            <span key={val} className="ms__tag">
              {ordered && <strong className="ms__tag-num">{i + 1}.</strong>}
              {labelOf(val)}
              <button
                type="button"
                className="ms__tag-x"
                onClick={(e) => remove(val, e)}
                aria-label={`Quitar ${labelOf(val)}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <span className={`ms__arrow${open ? ' ms__arrow--open' : ''}`} aria-hidden>
          ▾
        </span>
      </div>

      {open && (
        <div className="ms__menu">
          <div className="ms__search">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar…"
            />
          </div>
          <div className="ms__options">
            {filtered.length === 0 ? (
              <div className="ms__empty">{emptyText}</div>
            ) : (
              filtered.map((o) => {
                const on = value.includes(o.value)
                return (
                  <div
                    key={o.value}
                    className={`ms__option${on ? ' ms__option--on' : ''}`}
                    onClick={() => toggle(o.value)}
                  >
                    <span className={`ms__check${on ? ' ms__check--on' : ''}`} aria-hidden>
                      {on ? '✓' : ''}
                    </span>
                    {o.label}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
