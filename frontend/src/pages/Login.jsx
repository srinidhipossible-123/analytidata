import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheckIcon, AcademicCapIcon,
  EnvelopeIcon, LockClosedIcon, EyeIcon, EyeSlashIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function Login() {
  const [role,     setRole]     = useState('admin')   // 'admin' | 'teacher'
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const { login } = useAuth()
  const navigate  = useNavigate()

  const isAdmin = role === 'admin'

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) { toast.error('Fill in all fields'); return }
    setLoading(true)
    try {
      const data = await login(email, password)
      if (data.role !== role && !(role === 'teacher' && ['teacher','mentor'].includes(data.role))) {
        toast.error(`This account is not a ${role === 'admin' ? 'Admin' : 'Teacher/Mentor'} account`)
        setLoading(false)
        return
      }
      toast.success(`Welcome, ${data.username}!`)
      navigate(data.role === 'admin' ? '/admin' : '/teacher')
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-900 relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="orb orb-blue w-[500px] h-[500px] -top-32 -left-32" />
      <div className="orb orb-violet w-[400px] h-[400px] -bottom-20 -right-20" />
      {isAdmin && <div className="orb w-[300px] h-[300px] top-1/2 right-1/4"
        style={{ background: 'radial-gradient(circle, #f97316, transparent)', animationDelay: '-4s' }} />}

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md px-6"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center
                           bg-gradient-to-br shadow-2xl transition-all duration-500
                           ${isAdmin ? 'from-orange-500 to-red-600 shadow-orange-500/30'
                                     : 'from-blue-500 to-violet-600 shadow-blue-500/30'}`}>
            {isAdmin
              ? <ShieldCheckIcon className="w-8 h-8 text-white" />
              : <AcademicCapIcon className="w-8 h-8 text-white" />}
          </div>
          <h1 className="text-3xl font-black gradient-text">AnalytiData</h1>
          <p className="text-slate-400 text-sm mt-1">Student Performance Analytics</p>
        </div>

        {/* Role Toggle */}
        <div className="glass rounded-2xl p-1.5 flex gap-1.5 mb-6">
          {[
            { key: 'admin',   label: 'Admin / HOD',       Icon: ShieldCheckIcon },
            { key: 'teacher', label: 'Teacher / Mentor',   Icon: AcademicCapIcon },
          ].map(({ key, label, Icon }) => (
            <button key={key} onClick={() => setRole(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl
                          text-sm font-semibold transition-all duration-300
                          ${role === key
                            ? key === 'admin'
                              ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/25'
                              : 'bg-gradient-to-r from-blue-500 to-violet-600 text-white shadow-lg shadow-blue-500/25'
                            : 'text-slate-400 hover:text-slate-200'}`}>
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Login form */}
        <AnimatePresence mode="wait">
          <motion.form key={role} onSubmit={handleSubmit}
            initial={{ opacity: 0, x: isAdmin ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="glass rounded-2xl p-6 space-y-4">

            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Email</label>
              <div className="relative">
                <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input id="login-email" type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={isAdmin ? 'admin@datalens.edu' : 'teacher@school.edu'}
                  className="input-glass pl-9" />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Password</label>
              <div className="relative">
                <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input id="login-password" type={showPwd ? 'text' : 'password'}
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-glass pl-9 pr-10" />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPwd ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button id="login-submit" type="submit" disabled={loading}
              className={`w-full py-3 rounded-xl font-bold text-white transition-all duration-200
                          flex items-center justify-center gap-2 mt-2
                          ${isAdmin
                            ? 'bg-gradient-to-r from-orange-500 to-red-600 hover:shadow-lg hover:shadow-orange-500/30'
                            : 'bg-gradient-to-r from-blue-500 to-violet-600 hover:shadow-lg hover:shadow-blue-500/30'}
                          ${loading ? 'opacity-60 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'}`}>
              {loading
                ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : `Sign in as ${isAdmin ? 'Admin' : 'Teacher'}`}
            </button>

            {isAdmin && (
              <p className="text-center text-xs text-slate-600 mt-2">
                Default: admin@datalens.edu · admin@123
              </p>
            )}
          </motion.form>
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
