import { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AdminLayout from './components/admin/AdminLayout'
import LoginPage from './pages/admin/LoginPage'
import OverviewPage from './pages/admin/OverviewPage'
import RecordsPage from './pages/admin/RecordsPage'
import EnumeratorsPage from './pages/admin/EnumeratorsPage'
import TeamPage from './pages/admin/TeamPage'
import IdCardPage from './pages/admin/IdCardPage'

/**
 * Relays native-menu commands (View ▸ section, File ▸ Sign Out) into the router.
 * Rendered inside the providers + router so it can use useNavigate/useAuth.
 */
function MenuBridge() {
  const navigate = useNavigate()
  const { logout } = useAuth()

  useEffect(() => {
    if (!window.plyss?.onMenu) return
    return window.plyss.onMenu((msg) => {
      if (msg.type === 'navigate') {
        navigate(msg.path)
      } else if (msg.type === 'signout') {
        logout()
        navigate('/admin/login', { replace: true })
      }
    })
  }, [navigate, logout])

  return null
}

/**
 * The desktop app is the PLYSS admin console only — no public marketing site.
 * It uses HashRouter because the app loads from file:// in production, where
 * the History API paths of BrowserRouter don't resolve.
 */
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <HashRouter>
          <MenuBridge />
          <Routes>
            <Route path="/admin/login" element={<LoginPage />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<OverviewPage />} />
              <Route path="records" element={<RecordsPage />} />
              <Route path="enumerators" element={<EnumeratorsPage />} />
              <Route path="team" element={<TeamPage />} />
            </Route>
            <Route
              path="/admin/id/:type/:id"
              element={
                <ProtectedRoute>
                  <IdCardPage />
                </ProtectedRoute>
              }
            />
            {/* Everything else lands on the console (which bounces to login if needed). */}
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </HashRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
