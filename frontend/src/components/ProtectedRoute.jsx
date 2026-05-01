import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * ProtectedRoute — guards a route:
 *   requiredRole: 'admin' | 'teacher' | 'mentor' | undefined (any logged-in user)
 */
export default function ProtectedRoute({ children, requiredRole }) {
  const { user, loading, token } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-navy-900">
        <div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!token || !user) return <Navigate to="/login" replace />

  if (requiredRole === 'admin' && user.role !== 'admin') {
    return <Navigate to="/teacher" replace />
  }

  if (requiredRole === 'teacher' && user.role === 'admin') {
    return <Navigate to="/admin" replace />
  }

  return children
}
