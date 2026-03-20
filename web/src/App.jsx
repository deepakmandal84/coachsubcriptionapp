import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext'
import Layout from './Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Students from './pages/Students'
import Packages from './pages/Packages'
import Subscriptions from './pages/Subscriptions'
import Sessions from './pages/Sessions'
import SessionAttendance from './pages/SessionAttendance'
import Settings from './pages/Settings'
import ParentPortal from './pages/ParentPortal'
import PublicSchedule from './pages/PublicSchedule'
import AdminDashboard from './pages/AdminDashboard'
import AdminCoachDetail from './pages/AdminCoachDetail'

function Protected({ children }) {
  const { coach, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  if (!coach) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/p/:token" element={<ParentPortal />} />
        <Route path="/s/:token" element={<PublicSchedule />} />
        <Route path="/" element={<Protected><Layout /></Protected>}>
          <Route index element={<Dashboard />} />
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="admin/coaches/:id" element={<AdminCoachDetail />} />
          <Route path="students" element={<Students />} />
          <Route path="packages" element={<Packages />} />
          <Route path="subscriptions" element={<Subscriptions />} />
          <Route path="sessions" element={<Sessions />} />
          <Route path="sessions/:id/attendance" element={<SessionAttendance />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
