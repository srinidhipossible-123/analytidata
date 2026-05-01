import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  UserPlusIcon, PencilIcon, TrashIcon,
  KeyIcon, XMarkIcon, CheckIcon, UserGroupIcon,
} from '@heroicons/react/24/outline'
import Sidebar from '../../components/Sidebar'
import api from '../../api/client'
import toast from 'react-hot-toast'

const ROLES = ['teacher', 'mentor']

export default function UserManagement() {
  const [users,     setUsers]     = useState([])
  const [loading,   setLoading]   = useState(false)
  const [showForm,  setShowForm]  = useState(false)
  const [pwdModal,  setPwdModal]  = useState(null)   // { id, username }
  const [newPwd,    setNewPwd]    = useState('')
  const [form,      setForm]      = useState({ username: '', email: '', password: '', role: 'teacher' })

  useEffect(() => { loadUsers() }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/auth/admin/users')
      setUsers(res.data)
    } catch { toast.error('Failed to load users') }
    finally { setLoading(false) }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.username || !form.email || !form.password) {
      toast.error('Fill in all fields'); return
    }
    try {
      await api.post('/api/auth/admin/users', form)
      toast.success(`${form.username} created`)
      setForm({ username: '', email: '', password: '', role: 'teacher' })
      setShowForm(false)
      loadUsers()
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Create failed')
    }
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete ${name}?`)) return
    try {
      await api.delete(`/api/auth/admin/users/${id}`)
      toast.success('User deleted')
      setUsers(u => u.filter(x => x.id !== id))
    } catch { toast.error('Delete failed') }
  }

  const handleResetPwd = async () => {
    if (!newPwd) { toast.error('Enter new password'); return }
    try {
      await api.put(`/api/auth/admin/users/${pwdModal.id}/password`, { new_password: newPwd })
      toast.success('Password updated')
      setPwdModal(null); setNewPwd('')
    } catch { toast.error('Update failed') }
  }

  const roleColor = r => r === 'teacher' ? 'badge-blue' : 'badge-violet'

  return (
    <div className="flex min-h-screen bg-navy-900">
      <Sidebar />
      <main className="flex-1 p-6 ml-16 md:ml-60">

        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-black gradient-text">User Management</h1>
              <p className="text-slate-400 text-sm mt-1">Create and manage teacher / mentor accounts</p>
            </div>
            <button onClick={() => setShowForm(v => !v)}
              className="btn-primary flex items-center gap-2 text-sm">
              <UserPlusIcon className="w-4 h-4" /> Add User
            </button>
          </div>

          {/* Create form */}
          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="glass rounded-2xl overflow-hidden mb-6">
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                  <h2 className="font-semibold text-sm">Create New Account</h2>
                  <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-slate-300">
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handleCreate} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Full Name *</label>
                    <input value={form.username} onChange={e => setForm(f => ({...f, username: e.target.value}))}
                      placeholder="Dr. Priya Sharma" className="input-glass" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Email *</label>
                    <input type="email" value={form.email}
                      onChange={e => setForm(f => ({...f, email: e.target.value}))}
                      placeholder="priya@college.edu" className="input-glass" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Password *</label>
                    <input type="password" value={form.password}
                      onChange={e => setForm(f => ({...f, password: e.target.value}))}
                      placeholder="••••••••" className="input-glass" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Role</label>
                    <select value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value}))}
                      className="input-glass bg-navy-800">
                      <option value="teacher">Class Teacher</option>
                      <option value="mentor">Mentor</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <button type="submit"
                      className="btn-primary flex items-center gap-2 text-sm">
                      <CheckIcon className="w-4 h-4" /> Create Account
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Users table */}
          <div className="glass rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
              <UserGroupIcon className="w-5 h-5 text-violet-400" />
              <h2 className="font-semibold">Teachers & Mentors</h2>
              <span className="badge badge-violet ml-auto">{users.length}</span>
            </div>

            {loading ? (
              <div className="p-6 space-y-3">
                {[1,2,3].map(i => <div key={i} className="skeleton h-14 rounded-xl" />)}
              </div>
            ) : users.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <UserGroupIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No teachers or mentors yet.</p>
                <p className="text-xs mt-1">Click "Add User" to create the first account.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {users.map((u, i) => (
                  <motion.div key={u.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="px-6 py-4 flex items-center justify-between gap-4
                               hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-violet-600
                                      flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {u.username?.[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-200 truncate">{u.username}</p>
                        <p className="text-xs text-slate-500 truncate">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={`badge ${roleColor(u.role)}`}>{u.role}</span>
                      <button onClick={() => { setPwdModal({ id: u.id, username: u.username }); setNewPwd('') }}
                        className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20
                                   text-amber-400 border border-amber-500/20 transition-all"
                        title="Reset password">
                        <KeyIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(u.id, u.username)}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20
                                   text-red-400 border border-red-500/20 transition-all"
                        title="Delete user">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Password reset modal */}
        <AnimatePresence>
          {pwdModal && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                onClick={() => setPwdModal(null)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="fixed inset-x-4 top-1/3 z-50 max-w-sm mx-auto
                           glass rounded-2xl p-6 shadow-2xl">
                <h3 className="font-bold text-slate-200 mb-1">Reset Password</h3>
                <p className="text-xs text-slate-500 mb-4">For: {pwdModal.username}</p>
                <input type="password" value={newPwd}
                  onChange={e => setNewPwd(e.target.value)}
                  placeholder="New password"
                  className="input-glass mb-4" />
                <div className="flex gap-3">
                  <button onClick={handleResetPwd} className="btn-primary flex-1 text-sm">
                    Update Password
                  </button>
                  <button onClick={() => setPwdModal(null)} className="btn-secondary text-sm">
                    Cancel
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
