import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api, type Transporte, type Usuario } from '../../api'
import { useToast } from '../../components/Toast'
import { useConfirm } from '../../components/ConfirmDialog'
import './admin.css'

export default function TransportesPage() {
  const toast = useToast()
  const confirm = useConfirm()
  const [transportes, setTransportes] = useState<Transporte[]>([])
  const [transportistas, setTransportistas] = useState<Usuario[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [modalAbierto, setModalAbierto] = useState(false)

  // Form state
  const [editingId, setEditingId] = useState<number | null>(null)
  const [numPlacas, setNumPlacas] = useState('')
  const [clase, setClase] = useState('')
  const [idTransportista, setIdTransportista] = useState<number | ''>('')

  async function cargar() {
    try {
      const [trans, usrs] = await Promise.all([
        api.transportes.list(),
        api.usuarios.list(),
      ])
      setTransportes(trans)
      // Filtramos solo a los que tienen rol de transportista
      setTransportistas(usrs.filter(u => u.rol_nombre === 'transportista'))
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
    setEditingId(null)
    setNumPlacas('')
    setClase('')
    setIdTransportista('')
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

  function editar(t: Transporte) {
    setEditingId(t.id)
    setNumPlacas(t.num_placas)
    setClase(t.clase)
    setIdTransportista(t.id_transportista || '')
    setError('')
    setModalAbierto(true)
  }

  async function guardar(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    
    const payload = {
      num_placas: numPlacas,
      clase,
      id_transportista: idTransportista === '' ? null : Number(idTransportista),
    }

    try {
      const editando = !!editingId
      if (editingId) {
        await api.transportes.update(editingId, payload)
      } else {
        await api.transportes.create(payload)
      }
      cerrarModal()
      await cargar()
      toast.success(editando ? 'Transporte actualizado' : 'Transporte creado')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function borrar(id: number) {
    const ok = await confirm({
      title: 'Eliminar transporte',
      message: 'Esta acción no se puede deshacer. ¿Deseas continuar?',
      confirmText: 'Eliminar',
      danger: true,
    })
    if (!ok) return
    try {
      await api.transportes.remove(id)
      await cargar()
      toast.success('Transporte eliminado')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div>
      <div className="page__head">
        <div>
          <h1 className="page__title">Transportes</h1>
          <p className="page__subtitle">Control de flotilla y asignación de vehículos.</p>
        </div>
        <button className="btn btn--primary" onClick={abrirCrear}>
          + Crear transporte
        </button>
      </div>

      {error && !modalAbierto && <div className="alert">{error}</div>}

      {modalAbierto && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__head">
              <div>
                <h2 className="modal__title">{editingId ? 'Editar transporte' : 'Nuevo transporte'}</h2>
                <p className="modal__subtitle">Datos del vehículo y su transportista asignado.</p>
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
              <div className="form-grid" style={{ marginBottom: 18 }}>
                <div className="form-field">
                  <label>Placas</label>
                  <input
                    type="text"
                    value={numPlacas}
                    onChange={(e) => setNumPlacas(e.target.value)}
                    required
                    autoFocus
                    placeholder="Ej. ABC-123"
                  />
                </div>
                <div className="form-field">
                  <label>Clase de Vehículo</label>
                  <input
                    type="text"
                    value={clase}
                    onChange={(e) => setClase(e.target.value)}
                    required
                    placeholder="Ej. Tráiler, Camioneta, etc."
                  />
                </div>
                <div className="form-field form-grid--full">
                  <label>Transportista asignado</label>
                  <select value={idTransportista} onChange={(e) => setIdTransportista(e.target.value ? Number(e.target.value) : '')}>
                    <option value="">(Ninguno)</option>
                    {transportistas.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nombre} {u.apellidos}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn--primary" type="submit" disabled={saving}>
                  {saving ? 'Guardando…' : editingId ? 'Actualizar' : 'Crear'}
                </button>
                <button className="btn btn--ghost" type="button" onClick={cerrarModal} disabled={saving}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card card--table" style={{ padding: 0 }}>
        {transportes.length === 0 ? (
          <p className="empty">Aún no hay transportes registrados.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Placas</th>
                <th>Clase</th>
                <th>Transportista Asignado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {transportes.map((t) => (
                <tr key={t.id}>
                  <td>
                    <strong>{t.num_placas}</strong>
                  </td>
                  <td>{t.clase}</td>
                  <td>
                    {t.id_transportista ? (
                      <span style={{ color: 'var(--primary)', fontWeight: 500 }}>
                        {t.nombre} {t.apellidos}
                      </span>
                    ) : (
                      <span style={{ color: '#888' }}>Sin asignar</span>
                    )}
                  </td>
                  <td>
                    <div className="table__actions">
                      <button className="btn btn--sm" onClick={() => editar(t)}>
                        Editar
                      </button>
                      <button className="btn btn--danger btn--sm" onClick={() => borrar(t.id)}>
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
