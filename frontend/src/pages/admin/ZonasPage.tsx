import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api, zonaLabel, type Zona } from '../../api'
import { useToast } from '../../components/Toast'
import { useConfirm } from '../../components/ConfirmDialog'
import LocationPicker from '../../components/LocationPicker'
import './admin.css'

export default function ZonasPage() {
  const toast = useToast()
  const confirm = useConfirm()
  const [zonas, setZonas] = useState<Zona[]>([])
  const [nombre, setNombre] = useState('')
  const [numero, setNumero] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [modalAbierto, setModalAbierto] = useState(false)

  async function cargar() {
    try {
      setZonas(await api.zonas.list())
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
    setNombre('')
    setNumero('')
    setLat('')
    setLng('')
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

  async function crear(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await api.zonas.create({
        nombre: nombre.trim(),
        numero: numero ? Number(numero) : null,
        lat: lat ? Number(lat) : null,
        lng: lng ? Number(lng) : null,
      })
      cerrarModal()
      await cargar()
      toast.success('Zona creada')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function borrar(id: number) {
    const ok = await confirm({
      title: 'Eliminar zona',
      message: 'Esta acción no se puede deshacer. ¿Deseas continuar?',
      confirmText: 'Eliminar',
      danger: true,
    })
    if (!ok) return
    try {
      await api.zonas.remove(id)
      await cargar()
      toast.success('Zona eliminada')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div>
      <div className="page__head">
        <div>
          <h1 className="page__title">Zonas</h1>
          <p className="page__subtitle">Puntos geográficos que componen las rutas.</p>
        </div>
        <button className="btn btn--primary" onClick={abrirCrear}>
          + Crear zona
        </button>
      </div>

      {error && !modalAbierto && <div className="alert">{error}</div>}

      {modalAbierto && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__head">
              <div>
                <h2 className="modal__title">Nueva zona</h2>
                <p className="modal__subtitle">Registra un punto geográfico de las rutas.</p>
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

            <form onSubmit={crear}>
              <div className="form-grid" style={{ marginBottom: 18 }}>
                <div className="form-field form-grid--full">
                  <label>Nombre</label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej. Cántaros"
                    autoFocus
                    required
                  />
                </div>
                <div className="form-field form-grid--full">
                  <label>Número (opcional, para ordenar)</label>
                  <input
                    type="number"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    placeholder="Ej. 6"
                  />
                </div>
                <div className="form-field form-grid--full">
                  <label>Ubicación en el mapa</label>
                  <LocationPicker
                    lat={lat ? Number(lat) : null}
                    lng={lng ? Number(lng) : null}
                    onChange={(la, ln) => {
                      setLat(String(la))
                      setLng(String(ln))
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn--primary" type="submit" disabled={saving}>
                  {saving ? 'Guardando…' : 'Agregar zona'}
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
        {zonas.length === 0 ? (
          <p className="empty">Aún no hay zonas registradas.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Zona</th>
                <th>Número</th>
                <th>Latitud</th>
                <th>Longitud</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {zonas.map((z) => (
                <tr key={z.id}>
                  <td><strong>{zonaLabel(z.nombre, z.numero)}</strong></td>
                  <td>{z.numero ?? '—'}</td>
                  <td>{z.lat ?? '—'}</td>
                  <td>{z.lng ?? '—'}</td>
                  <td>
                    <div className="table__actions">
                      <button className="btn btn--danger btn--sm" onClick={() => borrar(z.id)}>
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
