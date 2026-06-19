import { createBrowserRouter, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import AdminLayout from './components/AdminLayout'
import ZonasPage from './pages/admin/ZonasPage'
import RutasPage from './pages/admin/RutasPage'
import ProgressPage from './pages/admin/ProgressPage'
import TransportistaPage from './pages/TransportistaPage'
import ChecadorPage from './pages/ChecadorPage'
import LivePage from './pages/LivePage'
import UsuariosPage from './pages/admin/UsuariosPage'
import TransportesPage from './pages/admin/TransportesPage'
import RoleRoute from './components/RoleRoute'
import { getUser, HOME_BY_ROLE } from './auth'

// Punto de entrada: si ya hay sesión, manda a su vista; si no, al login.
function Landing() {
  const user = getUser()
  return <Navigate to={user ? HOME_BY_ROLE[user.role] : '/login'} replace />
}

export const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/vivo', element: <LivePage /> },
  {
    path: '/admin',
    element: (
      <RoleRoute allow={['admin']}>
        <AdminLayout />
      </RoleRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/admin/zonas" replace /> },
      { path: 'zonas', element: <ZonasPage /> },
      { path: 'rutas', element: <RutasPage /> },
      { path: 'usuarios', element: <UsuariosPage /> },
      { path: 'transportes', element: <TransportesPage /> },
      { path: 'progress', element: <ProgressPage /> },
    ],
  },
  {
    path: '/transportista',
    element: (
      <RoleRoute allow={['transportista']}>
        <TransportistaPage />
      </RoleRoute>
    ),
  },
  {
    path: '/checador',
    element: (
      <RoleRoute allow={['checador']}>
        <ChecadorPage />
      </RoleRoute>
    ),
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
