import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChartBarIcon, UserIcon, EnvelopeIcon, LockClosedIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function Register() {
  const [username, setUsername] = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async e => {
    e.preventDefault()
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      await register(username, email, password)
      toast.success('Account created!')
      navigate('/upload')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center px-4 relative overflow-hidden">
      <div className="orb orb-violet w-96 h-96 -top-20 -right-20" />
      <div className="orb orb-cyan   w-80 h-80 -bottom-20 -left-20" />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }} className="glass p-10 rounded-3xl w-full max-w-md relative z-10">

        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-600 flex items-center justify-center glow-violet">
            <ChartBarIcon className="w-7 h-7 text-white" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center mb-1">Create account</h1>
        <p className="text-slate-400 text-sm text-center mb-8">Start analyzing data for free</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Username</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input id="reg-username" type="text" required value={username}
                onChange={e => setUsername(e.target.value)} placeholder="Your name"
                className="input-glass pl-10" />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Email</label>
            <div className="relative">
              <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input id="reg-email" type="email" required value={email}
                onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
                className="input-glass pl-10" />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Password</label>
            <div className="relative">
              <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input id="reg-password" type="password" required value={password}
                onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters"
                className="input-glass pl-10" />
            </div>
          </div>
          <button id="reg-submit" type="submit" disabled={loading}
            className="btn-primary w-full mt-2 flex items-center justify-center gap-2">
            {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="text-sm text-slate-500 text-center mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">Sign in</Link>
        </p>
        <p className="text-center mt-2">
          <Link to="/" className="text-xs text-slate-600 hover:text-slate-400">← Back to home</Link>
        </p>
      </motion.div>
    </div>
  )
}
