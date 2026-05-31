import { Routes, Route, Navigate, useParams } from 'react-router-dom'

import { AuthProvider, useAuth } from './AuthContext'
import { ToastProvider } from './context/ToastContext'

import Layout from './Layout'

import Login from './pages/Login'

import Register from './pages/Register'

import Dashboard from './pages/Dashboard'

import Students from './pages/Students'
import StudentProgress from './pages/StudentProgress'

import Packages from './pages/Packages'

import Subscriptions from './pages/Subscriptions'

import Sessions from './pages/Sessions'

import SessionAttendance from './pages/SessionAttendance'

import Settings from './pages/Settings'

import ParentPortal from './pages/ParentPortal'

import PublicSchedule from './pages/PublicSchedule'

import AdminDashboard from './pages/AdminDashboard'

import AdminCoachDetail from './pages/AdminCoachDetail'

import AdminCoachRouteRedirect from './components/AdminCoachRouteRedirect'

import ClubTenantGate from './components/ClubTenantGate'



function HomeIndex() {

  const { coach } = useAuth()

  if (coach?.role === 'Admin') return <Navigate to="/admin" replace />

  if (coach?.role === 'Coach' && coach?.clubTenantId) return <Navigate to="/sessions" replace />

  return <Dashboard />

}



function Protected({ children }) {

  const { coach, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl btn-brand animate-pulse" />
          <p className="text-sm text-slate-500">Loading…</p>
        </div>
      </div>
    )
  }

  if (!coach) return <Navigate to="/login" replace />

  return <>{children}</>

}



function LegacyPublicScheduleRedirect() {

  const { scheduleKey } = useParams()

  return <Navigate to={`/${encodeURIComponent(scheduleKey)}/info`} replace />

}



function AcademyIndexRedirect() {

  const { tenantId } = useParams()

  return <Navigate to={`/academies/${tenantId}/students`} replace />

}



function LegacyClubsRedirect() {
  const params = useParams()
  const rest = params['*']?.replace(/^\//, '') || 'students'
  return <Navigate to={`/academies/${params.tenantId}/${rest}`} replace />
}

export default function App() {

  return (

    <AuthProvider>
      <ToastProvider>
      <Routes>

        <Route path="/login" element={<Login />} />

        <Route path="/register" element={<Register />} />

        <Route path="/p/:token" element={<ParentPortal />} />

        <Route path="/s/:scheduleKey/info" element={<LegacyPublicScheduleRedirect />} />

        <Route path="/s/:scheduleKey" element={<LegacyPublicScheduleRedirect />} />

        <Route path="/:scheduleKey/info" element={<PublicSchedule />} />

        <Route path="/" element={<Protected><Layout /></Protected>}>

          <Route index element={<HomeIndex />} />

          <Route path="admin" element={<AdminDashboard />} />

          <Route path="admin/academies/:id" element={<AdminCoachDetail />} />

          <Route path="admin/coaches/:id" element={<AdminCoachDetail />} />



          <Route path="students" element={<AdminCoachRouteRedirect><Students /></AdminCoachRouteRedirect>} />
          <Route path="students/:studentId/progress" element={<AdminCoachRouteRedirect><StudentProgress /></AdminCoachRouteRedirect>} />

          <Route path="packages" element={<AdminCoachRouteRedirect to="packages"><Packages /></AdminCoachRouteRedirect>} />

          <Route path="subscriptions" element={<AdminCoachRouteRedirect to="subscriptions"><Subscriptions /></AdminCoachRouteRedirect>} />

          <Route path="sessions" element={<AdminCoachRouteRedirect to="sessions"><Sessions /></AdminCoachRouteRedirect>} />

          <Route path="sessions/:id/attendance" element={<AdminCoachRouteRedirect to="sessions"><SessionAttendance /></AdminCoachRouteRedirect>} />

          <Route path="settings" element={<AdminCoachRouteRedirect to="settings"><Settings /></AdminCoachRouteRedirect>} />

          <Route path="dashboard" element={<AdminCoachRouteRedirect to="dashboard"><Dashboard /></AdminCoachRouteRedirect>} />



          <Route path="academies/:tenantId" element={<ClubTenantGate />}>

            <Route index element={<AcademyIndexRedirect />} />

            <Route path="dashboard" element={<Dashboard />} />

            <Route path="students" element={<Students />} />
            <Route path="students/:studentId/progress" element={<StudentProgress />} />

            <Route path="packages" element={<Packages />} />

            <Route path="subscriptions" element={<Subscriptions />} />

            <Route path="sessions" element={<Sessions />} />

            <Route path="sessions/:id/attendance" element={<SessionAttendance />} />

            <Route path="settings" element={<Settings />} />

          </Route>



          <Route path="clubs/:tenantId/*" element={<LegacyClubsRedirect />} />

        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
      </ToastProvider>
    </AuthProvider>

  )

}


