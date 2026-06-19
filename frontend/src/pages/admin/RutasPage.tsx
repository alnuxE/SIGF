import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api, zonaLabel, type Ruta, type Zona } from '../../api'
import MultiSelect from '../../components/MultiSelect'
import { useToast } from '../../components/Toast'
import { useConfirm } from '../../components/ConfirmDialog'
import './admin.css'

export default function RutasPage() {
  const toast = useToast()
  const confirm = useConfirm()
  const [rutas, setRutas] = useState<Ruta[]>([])
  const [zonas, setZonas] = useState<Zona[]>([])
  const [numero, setNumero] = useState('')
  const [seleccion, setSeleccion] = useState<number[]>([])
  const [editId, setEditId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [modalAbierto, setModalAbierto] = useState(false)

  async function cargar() {
    try {
      const [r, z] = await Promise.all([api.rutas.list(), api.zonas.list()])
      setRutas(r)
      setZonas(z)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  useEffect(() => {
    if (!modalAbierto) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') cerrarModal()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modalAbierto])

  function resetForm() {
    setEditId(null)
    setNumero('')
    setSeleccion([])
  }

  function cerrarModal() {
    setModalAbierto(false)
    setError('')
    resetForm()
  }

  function abrirCrear() {
    resetForm()
    setError('')
    setModalAbierto(true)
  }

  function editar(ruta: Ruta) {
    setEditId(ruta.id)
    setNumero(String(ruta.numero_ruta))
    setSeleccion(ruta.zonas.map((z) => z.id_zona))
    setError('')
    setModalAbierto(true)
  }

  async function guardar(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    const payload = { numero_ruta: Number(numero), zonas: seleccion }
    try {
      const editando = !!editId
      if (editId) {
        await api.rutas.update(editId, payload)
      } else {
        await api.rutas.create(payload)
      }
      cerrarModal()
      await cargar()
      toast.success(editando ? 'Ruta actualizada' : 'Ruta creada')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function borrar(id: number) {
    const ok = await confirm({
      title: 'Eliminar ruta',
      message: 'Esta acción no se puede deshacer. ¿Deseas continuar?',
      confirmText: 'Eliminar',
      danger: true,
    })
    if (!ok) return
    try {
      await api.rutas.remove(id)
      if (editId === id) resetForm()
      await cargar()
      toast.success('Ruta eliminada')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div>
      <div className="page__head">
        <div>
          <h1 className="page__title">Rutas</h1>
          <p className="page__subtitle">Define rutas y las zonas que recorren, en orden.</p>
        </div>
        <button className="btn btn--primary" onClick={abrirCrear}>
          + Crear ruta
        </button>
      </div>

      {error && !modalAbierto && <div className="alert">{error}</div>}

      {modalAbierto && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__head">
              <div>
                <h2 className="modal__title">{editId ? 'Editar ruta' : 'Nueva ruta'}</h2>
                <p className="modal__subtitle">
                  Elige el número y las zonas que recorre, en orden.
                </p>
              </div>
              <button
                type="button"
                className="modal__close"
                onClick={cerrarModal}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            {error && <div className="alert">{error}</div>}

            <form onSubmit={guardar}>
              <div className="form-row" style={{ marginBottom: 18 }}>
                <div className="form-field">
                  <label>Número de ruta</label>
                  <input
                    type="number"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    placeholder="Ej. 300"
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div className="form-field" style={{ marginBottom: 18 }}>
                <label>Zonas que recorre (en orden de selección)</label>
                {zonas.length === 0 ? (
                  <p className="empty" style={{ padding: 12 }}>
                    Primero crea zonas en la sección Zonas.
                  </p>
                ) : (
                  <MultiSelect
                    options={zonas.map((z) => ({ value: z.id, label: zonaLabel(z.nombre, z.numero) }))}
                    value={seleccion}
                    onChange={setSeleccion}
                    ordered
                    placeholder="Selecciona las zonas…"
                    emptyText="No hay zonas que coincidan"
                  />
                )}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn--primary" type="submit" disabled={saving}>
                  {saving ? 'Guardando…' : editId ? 'Actualizar ruta' : 'Crear ruta'}
                </button>
                <button type="button" className="btn btn--ghost" onClick={cerrarModal}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card card--table" style={{ padding: 0 }}>
        {rutas.length === 0 ? (
          <p className="empty">Aún no hay rutas registradas.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Ruta</th>
                <th>Zonas</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rutas.map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>Ruta {r.numero_ruta}</strong>
                  </td>
                  <td>
                    {r.zonas.length === 0 ? (
                      <span style={{ color: 'var(--slate-400)' }}>Sin zonas</span>
                    ) : (
                      r.zonas.map((z) => (
                        <span key={z.id_zona} className="tag">
                          {z.orden}. {zonaLabel(z.nombre, z.numero)}
                        </span>
                      ))
                    )}
                  </td>
                  <td>
                    <div className="table__actions">
                      <button className="btn btn--ghost btn--sm" onClick={() => editar(r)}>
                        Editar
                      </button>
                      <button className="btn btn--danger btn--sm" onClick={() => borrar(r.id)}>
                        Borrar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
