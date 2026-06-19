import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api, zonaLabel, type Usuario, type Rol, type Ruta, type Zona } from '../../api'
import { useToast } from '../../components/Toast'
import { useConfirm } from '../../components/ConfirmDialog'
import './admin.css'

export default function UsuariosPage() {
  const toast = useToast()
  const confirm = useConfirm()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [roles, setRoles] = useState<Rol[]>([])
  const [rutas, setRutas] = useState<Ruta[]>([])
  const [zonas, setZonas] = useState<Zona[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [modalAbierto, setModalAbierto] = useState(false)

  // Form state
  const [editingId, setEditingId] = useState<number | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [apellidos, setApellidos] = useState('')
  const [idRol, setIdRol] = useState<number | ''>('')
  const [idRuta, setIdRuta] = useState<number | ''>('')
  const [idZona, setIdZona] = useState<number | ''>('')
  const [isAdmin, setIsAdmin] = useState(false)

  const isTransportista = roles.find(r => Number(r.id) === Number(idRol))?.nombre === 'transportista'
  const isChecador = roles.find(r => Number(r.id) === Number(idRol))?.nombre === 'checador'

  async function cargar() {
    try {
      const [usr, rols, rts, zns] = await Promise.all([
        api.usuarios.list(),
        api.usuarios.roles(),
        api.rutas.list(),
        api.zonas.list(),
      ])
      setUsuarios(usr)
      setRoles(rols)
      setRutas(rts)
      setZonas(zns)
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
    setEmail('')
    setPassword('')
    setNombre('')
    setApellidos('')
    setIdRol('')
    setIdRuta('')
    setIdZona('')
    setIsAdmin(false)
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

  function editar(u: Usuario) {
    setEditingId(u.id)
    setEmail(u.email)
    setPassword('') // Don't fill password, only edit if typed
    setNombre(u.nombre || '')
    setApellidos(u.apellidos || '')
    setIdRol(u.id_rol || '')
    setIdRuta(u.id_ruta || '')
    setIdZona(u.id_zona || '')
    setIsAdmin(u.is_admin)
    setError('')
    setModalAbierto(true)
  }

  async function guardar(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    
    const payload = {
      email,
      password: password || undefined,
      nombre: nombre || undefined,
      apellidos: apellidos || undefined,
      id_rol: idRol === '' ? null : Number(idRol),
      id_ruta: isTransportista ? (idRuta === '' ? null : Number(idRuta)) : undefined,
      id_zona: isChecador ? (idZona === '' ? null : Number(idZona)) : undefined,
      is_admin: isAdmin,
    }

    try {
      const editando = !!editingId
      if (editingId) {
        await api.usuarios.update(editingId, payload)
      } else {
        if (!password) {
          throw new Error('La contraseña es requerida para un usuario nuevo')
        }
        await api.usuarios.create(payload)
      }
      cerrarModal()
      await cargar()
      toast.success(editando ? 'Usuario actualizado' : 'Usuario creado')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function borrar(id: number) {
    const ok = await confirm({
      title: 'Eliminar usuario',
      message: 'Esta acción no se puede deshacer. ¿Deseas continuar?',
      confirmText: 'Eliminar',
      danger: true,
    })
    if (!ok) return
    try {
      await api.usuarios.remove(id)
      await cargar()
      toast.success('Usuario eliminado')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div>
      <div className="page__head">
        <div>
          <h1 className="page__title">Usuarios</h1>
          <p className="page__subtitle">Control de acceso y asignación de roles.</p>
        </div>
        <button className="btn btn--primary" onClick={abrirCrear}>
          + Crear usuario
        </button>
      </div>

      {error && !modalAbierto && <div className="alert">{error}</div>}

      {modalAbierto && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal__head">
              <div>
                <h2 className="modal__title">{editingId ? 'Editar usuario' : 'Nuevo usuario'}</h2>
                <p className="modal__subtitle">Datos de acceso, rol y asignaciones.</p>
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
                  <label>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
                <div className="form-field">
                  <label>Contraseña {editingId && '(Opcional)'}</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={!editingId}
                  />
                </div>
                <div className="form-field">
                  <label>Nombre</label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label>Apellidos</label>
                  <input
                    type="text"
                    value={apellidos}
                    onChange={(e) => setApellidos(e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label>Rol asignado</label>
                  <select value={idRol} onChange={(e) => setIdRol(e.target.value ? Number(e.target.value) : '')}>
                    <option value="">(Ninguno)</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                {isTransportista && (
                  <div className="form-field">
                    <label>Ruta asignada</label>
                    <select value={idRuta} onChange={(e) => setIdRuta(e.target.value ? Number(e.target.value) : '')}>
                      <option value="">(Ninguna)</option>
                      {rutas.map((r) => (
                        <option key={r.id} value={r.id}>
                          Ruta {r.numero_ruta}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {isChecador && (
                  <div className="form-field">
                    <label>Zona asignada</label>
                    <select value={idZona} onChange={(e) => setIdZona(e.target.value ? Number(e.target.value) : '')}>
                      <option value="">(Ninguna)</option>
                      {zonas.map((z) => (
                        <option key={z.id} value={z.id}>
                          {zonaLabel(z.nombre, z.numero)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="form-field form-grid--full" style={{ paddingTop: 4 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: 0 }}>
                    <input
                      type="checkbox"
                      checked={isAdmin}
                      onChange={(e) => setIsAdmin(e.target.checked)}
                      style={{ margin: 0, width: '18px', height: '18px' }}
                    />
                    Es Administrador
                  </label>
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
        {usuarios.length === 0 ? (
          <p className="empty">Aún no hay usuarios registrados.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Nombre</th>
                <th>Rol / Permisos</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong>{u.email}</strong>
                  </td>
                  <td>
                    {u.nombre} {u.apellidos}
                  </td>
                  <td>
                    {u.is_admin ? (
                      <span style={{ color: 'var(--primary)', fontWeight: 500 }}>Admin</span>
                    ) : (
                      <span>
                        {u.rol_nombre || 'Sin rol'}
                        {u.id_ruta ? ` (Ruta ${u.numero_ruta})` : ''}
                        {u.id_zona ? ` (${zonaLabel(u.zona_nombre, u.zona_numero)})` : ''}
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="table__actions">
                      <button className="btn btn--sm" onClick={() => editar(u)}>
                        Editar
                      </button>
                      <button className="btn btn--danger btn--sm" onClick={() => borrar(u.id)}>
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
