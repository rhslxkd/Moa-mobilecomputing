import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import Signup from './pages/Signup'
import FindId from './pages/FindId'
import FindPassword from './pages/FindPassword'
import Dashboard from './pages/Dashboard'
import ProjectDetail from './pages/ProjectDetail'
import Chat from './pages/Chat'
import Todo from './pages/Todo'
import Meetings from './pages/Meetings'
import Profile from './pages/Profile'
import ProfileEdit from './pages/ProfileEdit'
import Friends from './pages/Friends'
import Notifications from './pages/Notifications'
import Drive from './pages/Drive'

function AppLayout() {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <Outlet />
      </main>
    </div>
  )
}

function PrivateRoute() {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <span className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  )
  return user ? <AppLayout /> : <Navigate to="/login" replace />
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <Navigate to="/dashboard" replace /> : <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
          <Route path="/find-id" element={<FindId />} />
          <Route path="/find-password" element={<FindPassword />} />

          {/* Private */}
          <Route element={<PrivateRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/project/:id" element={<ProjectDetail />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/todo" element={<Todo />} />
            <Route path="/meetings" element={<Meetings />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/edit" element={<ProfileEdit />} />
            <Route path="/friends" element={<Friends />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/drive" element={<Drive />} />
          </Route>

          {/* Default */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
