import { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [token,   setToken]   = useState(() => localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      const stored = localStorage.getItem('userData')
      if (stored) {
        try { setUser(JSON.parse(stored)) } catch { _clearLocal() }
      }
    }
    setLoading(false)
  }, [token])

  const _clearLocal = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('userData')
    delete api.defaults.headers.common['Authorization']
  }

  const login = async (email, password) => {
    const params = new URLSearchParams()
    params.append('username', email)
    params.append('password', password)
    const res = await api.post('/api/auth/login', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    const { access_token, username, role } = res.data
    const userData = { username, role, email }
    localStorage.setItem('token', access_token)
    localStorage.setItem('userData', JSON.stringify(userData))
    api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
    setToken(access_token)
    setUser(userData)
    return { username, role }
  }

  const logout = () => {
    _clearLocal()
    setToken(null)
    setUser(null)
  }

  const isAdmin   = user?.role === 'admin'
  const isTeacher = user?.role === 'teacher' || user?.role === 'mentor'

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, isAdmin, isTeacher }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
