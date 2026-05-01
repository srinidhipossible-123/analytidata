import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import { ThemeProvider } from './context/ThemeContext'
import ProtectedRoute from './components/ProtectedRoute'

// Public
import Landing from './pages/Landing'
import Login   from './pages/Login'

// Admin portal
import AdminDashboard from './pages/admin/AdminDashboard'
import UserManagement from './pages/admin/UserManagement'

// Teacher portal
import TeacherDashboard from './pages/teacher/TeacherDashboard'
import ClassReport      from './pages/teacher/ClassReport'
import StudentCard      from './pages/teacher/StudentCard'

/** Smart redirect based on role */
function RoleRedirect() {
  const { user, token } = useAuth()
  if (!token || !user) return <Navigate to="/login" replace />
  if (user.role === 'admin')   return <Navigate to="/admin" replace />
  return <Navigate to="/teacher" replace />
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DataProvider>
          <BrowserRouter>
            <Routes>
              {/* Public */}
              <Route path="/"      element={<Landing />} />
              <Route path="/login" element={<Login />} />

              {/* Smart role redirect after login */}
              <Route path="/home"  element={<RoleRedirect />} />

              {/* ── Admin portal ───────────────────────────────────── */}
              <Route path="/admin" element={
                <ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>
              } />
              <Route path="/admin/users" element={
                <ProtectedRoute requiredRole="admin"><UserManagement /></ProtectedRoute>
              } />

              {/* ── Teacher / Mentor portal ────────────────────────── */}
              <Route path="/teacher" element={
                <ProtectedRoute><TeacherDashboard /></ProtectedRoute>
              } />
              <Route path="/teacher/report/:reportId" element={
                <ProtectedRoute><ClassReport /></ProtectedRoute>
              } />
              <Route path="/teacher/report/:reportId/student/:roll" element={
                <ProtectedRoute><StudentCard /></ProtectedRoute>
              } />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
