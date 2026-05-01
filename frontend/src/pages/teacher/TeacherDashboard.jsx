import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ClipboardDocumentListIcon, ArrowPathIcon,
  ExclamationTriangleIcon, AcademicCapIcon, EyeIcon,
  ChartBarIcon, CalendarIcon, MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import Sidebar from '../../components/Sidebar'
import api from '../../api/client'
import toast from 'react-hot-toast'

const container = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }
const card      = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } }

const GRADE_COLORS = {
  O: 'text-emerald-400', 'A+': 'text-green-400', A: 'text-blue-400',
  'B+': 'text-cyan-400', B: 'text-violet-400', C: 'text-amber-400', F: 'text-red-400',
}

export default function TeacherDashboard() {
  const [reports,  setReports]  = useState([])
  const [loading,  setLoading]  = useState(false)
  const [search,   setSearch]   = useState('')
  const navigate = useNavigate()

  useEffect(() => { loadReports() }, [])

  const loadReports = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/teacher/reports')
      setReports(res.data)
    } catch { toast.error('Failed to load reports') }
    finally { setLoading(false) }
  }

  const totalStudents  = reports.reduce((s, r) => s + (r.total_students || 0), 0)
  const avgClassPct    = reports.length
    ? (reports.reduce((s, r) => s + (r.class_avg_pct || 0), 0) / reports.length).toFixed(1)
    : 0
  const totalCritical  = reports.reduce((s, r) => s + (r.critical_count || 0), 0)

  const filtered = reports.filter(r => {
    const q = search.toLowerCase()
    return !q ||
      r.section?.toLowerCase().includes(q) ||
      r.exam_type?.toLowerCase().includes(q) ||
      r.academic_year?.toLowerCase().includes(q) ||
      r.pushed_by_name?.toLowerCase().includes(q) ||
      r.sheet_name?.toLowerCase().includes(q)
  })

  return (
    <div className="flex min-h-screen bg-navy-900">
      <Sidebar />
      <main className="flex-1 p-6 ml-16 md:ml-60">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black gradient-text">Class Reports</h1>
            <p className="text-slate-400 text-sm mt-1">Reports pushed by the HOD · Click to view details</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Search bar */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search section, exam, year…"
                className="input-glass pl-9 text-sm w-56" />
            </div>
            <button onClick={loadReports}
              className="btn-secondary flex items-center gap-2 text-sm">
              <ArrowPathIcon className="w-4 h-4" /> Refresh
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Reports',     value: reports.length,  color: 'blue',   Icon: ClipboardDocumentListIcon },
            { label: 'Total Students',    value: totalStudents,   color: 'violet', Icon: AcademicCapIcon },
            { label: 'Critical Students', value: totalCritical,   color: totalCritical > 0 ? 'red' : 'green', Icon: ExclamationTriangleIcon },
          ].map(({ label, value, color, Icon }) => (
            <div key={label}
              className={`glass rounded-2xl p-5 border
                ${color === 'red' ? 'border-red-500/20' : color === 'blue' ? 'border-blue-500/20'
                : color === 'violet' ? 'border-violet-500/20' : 'border-emerald-500/20'}`}>
              <p className="text-xs text-slate-500 mb-1">{label}</p>
              <p className={`text-3xl font-black
                ${color === 'red' ? 'text-red-400' : color === 'blue' ? 'text-blue-400'
                : color === 'violet' ? 'text-violet-400' : 'text-emerald-400'}`}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Report cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {[1,2,3].map(i => <div key={i} className="skeleton h-52 rounded-2xl" />)}
          </div>
        ) : reports.length === 0 ? (
          <div className="glass rounded-2xl p-16 text-center text-slate-500">
            <ClipboardDocumentListIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-semibold">No Reports Yet</p>
            <p className="text-sm mt-2">The HOD hasn't pushed any reports yet.</p>
          </div>
        ) : (
          <>
            {search && (
              <p className="text-xs text-slate-500 mb-4">
                Showing {filtered.length} of {reports.length} reports for <span className="text-slate-300">"{search}"</span>
              </p>
            )}
          <motion.div variants={container} initial="hidden" animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map(r => (
              <motion.div key={r.id} variants={card}
                onClick={() => navigate(`/teacher/report/${r.id}`)}
                className="glass rounded-2xl p-5 cursor-pointer hover:border-blue-500/30
                           hover:shadow-[0_0_30px_rgba(59,130,246,0.1)]
                           border border-white/5 transition-all duration-300 group">

                {/* Top */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-black text-slate-100 group-hover:gradient-text
                                   transition-all">{r.section}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="badge badge-orange text-[10px]">{r.exam_type}</span>
                      <span className="badge badge-violet text-[10px]">{r.academic_year}</span>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20
                                  flex items-center justify-center flex-shrink-0">
                    <ChartBarIcon className="w-5 h-5 text-blue-400" />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center">
                    <p className="text-xl font-black text-slate-200">{r.total_students}</p>
                    <p className="text-[10px] text-slate-500">Students</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-black text-blue-400">{r.class_avg_pct}%</p>
                    <p className="text-[10px] text-slate-500">Class Avg</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-xl font-black ${r.critical_count > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {r.critical_count}
                    </p>
                    <p className="text-[10px] text-slate-500">Critical</p>
                  </div>
                </div>

                {/* Grade mini-bar */}
                {r.grade_distribution && (
                  <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden mb-4">
                    {Object.entries(r.grade_distribution).map(([g, cnt]) => {
                      const pct = r.total_students > 0 ? (cnt / r.total_students) * 100 : 0
                      const colors = {
                        O:'bg-emerald-400','A+':'bg-green-400',A:'bg-blue-400',
                        'B+':'bg-cyan-400',B:'bg-violet-400',C:'bg-amber-400',F:'bg-red-400'
                      }
                      return pct > 0 ? (
                        <div key={g} className={`${colors[g]}`}
                          style={{ width: `${pct}%` }} title={`${g}: ${cnt}`} />
                      ) : null
                    })}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-slate-600">
                    <CalendarIcon className="w-3 h-3" />
                    {new Date(r.pushed_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-blue-400
                                  opacity-0 group-hover:opacity-100 transition-opacity">
                    <EyeIcon className="w-3.5 h-3.5" /> View Report
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
          </>
        )}
      </main>
    </div>
  )
}
