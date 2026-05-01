import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeftIcon, TrophyIcon, ExclamationTriangleIcon,
  CheckCircleIcon, XCircleIcon, PrinterIcon,
  AcademicCapIcon, ChartBarIcon,
} from '@heroicons/react/24/outline'
import Sidebar from '../../components/Sidebar'
import api from '../../api/client'
import toast from 'react-hot-toast'

const GRADE_META = {
  O:   { label:'Outstanding', color:'#10b981', bg:'bg-emerald-500/20', text:'text-emerald-300', border:'border-emerald-500/40' },
  'A+':{ label:'Excellent',   color:'#22c55e', bg:'bg-green-500/20',   text:'text-green-300',   border:'border-green-500/40' },
  A:   { label:'Very Good',   color:'#3b82f6', bg:'bg-blue-500/20',    text:'text-blue-300',    border:'border-blue-500/40' },
  'B+':{ label:'Good',        color:'#06b6d4', bg:'bg-cyan-500/20',    text:'text-cyan-300',    border:'border-cyan-500/40' },
  B:   { label:'Above Avg',   color:'#8b5cf6', bg:'bg-violet-500/20',  text:'text-violet-300',  border:'border-violet-500/40' },
  C:   { label:'Average',     color:'#f59e0b', bg:'bg-amber-500/20',   text:'text-amber-300',   border:'border-amber-500/40' },
  F:   { label:'Fail',        color:'#ef4444', bg:'bg-red-500/20',     text:'text-red-300',     border:'border-red-500/40' },
}

export default function StudentCard() {
  const { reportId, roll } = useParams()
  const navigate           = useNavigate()
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadStudent() }, [reportId, roll])

  const loadStudent = async () => {
    setLoading(true)
    try {
      const res = await api.get(
        `/api/teacher/reports/${reportId}/student/${encodeURIComponent(roll)}`
      )
      setStudent(res.data)
    } catch { toast.error('Student not found'); navigate(`/teacher/report/${reportId}`) }
    finally { setLoading(false) }
  }

  const handlePrint = () => window.print()

  if (loading) return (
    <div className="flex min-h-screen bg-navy-900">
      <Sidebar />
      <main className="flex-1 flex items-center justify-center ml-16 md:ml-60">
        <div className="w-12 h-12 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </main>
    </div>
  )

  if (!student) return null

  const gm         = GRADE_META[student.grade] || GRADE_META.C
  const subjects   = Object.entries(student.subjects || {})
  const subStats   = student.subject_stats || {}
  const maxMarks   = student.max_marks || 100
  const classAvg   = student.class_avg_pct || 0
  const isCritical = student.is_critical

  return (
    <div className="flex min-h-screen bg-navy-900">
      <Sidebar />
      <main className="flex-1 p-6 ml-16 md:ml-60">
        <div className="max-w-3xl mx-auto">

          {/* ── Header ── */}
          <div className="flex items-center gap-3 mb-6 print:hidden">
            <button onClick={() => navigate(`/teacher/report/${reportId}`)}
              className="p-2 rounded-xl glass hover:bg-white/10 text-slate-400 hover:text-white transition-all">
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div className="flex-1" />
            <button onClick={handlePrint}
              className="btn-secondary flex items-center gap-2 text-sm">
              <PrinterIcon className="w-4 h-4" /> Print / Save PDF
            </button>
          </div>

          {/* ── Student Profile Card ── */}
          <motion.div initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }}
            className={`glass rounded-3xl overflow-hidden mb-6 border-2 ${gm.border}`}>

            {/* Gradient header */}
            <div className="px-8 py-6 relative overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${gm.color}22, transparent)` }}>
              <div className="flex items-start gap-6">
                {/* Avatar */}
                <div className={`w-20 h-20 rounded-2xl border-2 ${gm.border}
                                 flex items-center justify-center flex-shrink-0
                                 ${gm.bg} text-4xl font-black ${gm.text}`}>
                  {student.name?.[0]?.toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-black text-slate-100 truncate">{student.name}</h1>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    <span className="text-xs text-slate-400">Roll: <b className="text-slate-200">{student.roll}</b></span>
                    <span className="text-xs text-slate-400">Section: <b className="text-slate-200">{student.section}</b></span>
                    <span className="text-xs text-slate-400">{student.exam_type} · {student.academic_year}</span>
                  </div>
                  {isCritical && (
                    <div className="mt-2 flex items-center gap-1.5 text-red-400 text-xs">
                      <ExclamationTriangleIcon className="w-4 h-4" />
                      Needs attention — Below critical threshold
                    </div>
                  )}
                </div>

                {/* Grade badge */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className={`w-16 h-16 rounded-2xl border-2 ${gm.border} ${gm.bg}
                                   flex flex-col items-center justify-center`}>
                    <span className={`text-2xl font-black ${gm.text}`}>{student.grade}</span>
                  </div>
                  <p className={`text-[10px] mt-1 ${gm.text}`}>{gm.label}</p>
                </div>
              </div>

              {/* Score summary */}
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="glass rounded-xl p-3 text-center">
                  <p className={`text-3xl font-black ${gm.text}`}>{student.percentage}%</p>
                  <p className="text-xs text-slate-500 mt-0.5">Overall Score</p>
                </div>
                <div className="glass rounded-xl p-3 text-center">
                  <p className="text-3xl font-black text-slate-200">{student.total ?? '—'}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Total Marks</p>
                </div>
                <div className="glass rounded-xl p-3 text-center">
                  <p className="text-3xl font-black text-blue-400">{student.rank}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Class Rank</p>
                </div>
              </div>
            </div>

            {/* ── Subject breakdown ── */}
            <div className="px-8 py-6">
              <h2 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
                <ChartBarIcon className="w-4 h-4 text-blue-400" />
                Subject-wise Performance
              </h2>

              <div className="space-y-4">
                {subjects.map(([subj, sm]) => {
                  const classSubjAvg = subStats[subj]?.avg || 0
                  const pct          = sm.pct || 0
                  const passed       = sm.passed
                  const aboveClass   = sm.marks != null && sm.marks >= classSubjAvg

                  return (
                    <div key={subj}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-200">{subj}</span>
                          {passed
                            ? <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
                            : <XCircleIcon    className="w-4 h-4 text-red-400" />}
                        </div>
                        <div className="flex items-center gap-3 text-right">
                          <span className="text-xs text-slate-500">
                            Class avg: <b className="text-slate-400">{classSubjAvg}</b>
                          </span>
                          <span className={`text-sm font-bold
                            ${!passed ? 'text-red-400'
                            : pct >= 75 ? 'text-emerald-400'
                            : 'text-slate-200'}`}>
                            {sm.marks ?? '—'} / {maxMarks}
                          </span>
                        </div>
                      </div>

                      {/* Stacked bar: student vs class avg */}
                      <div className="relative h-2.5 bg-white/8 rounded-full overflow-hidden">
                        {/* Class average marker */}
                        <div className="absolute top-0 h-full w-0.5 bg-blue-400/50 z-10"
                          style={{ left: `${(classSubjAvg / maxMarks) * 100}%` }} />
                        {/* Student bar */}
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: 0.1 }}
                          className={`h-full rounded-full
                            ${!passed ? 'bg-red-400'
                            : pct >= 75 ? 'bg-emerald-400'
                            : pct >= 50 ? 'bg-blue-400'
                            : 'bg-amber-400'}`} />
                      </div>

                      <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
                        <span>0</span>
                        <span className={aboveClass ? 'text-emerald-500' : 'text-slate-600'}>
                          {aboveClass ? '▲ Above class avg' : '▼ Below class avg'}
                        </span>
                        <span>{maxMarks}</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Weak subjects */}
              {student.weak_subjects?.length > 0 && (
                <div className="mt-6 p-4 rounded-xl bg-red-500/8 border border-red-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <ExclamationTriangleIcon className="w-4 h-4 text-red-400" />
                    <p className="text-sm font-semibold text-red-300">Needs Improvement</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {student.weak_subjects.map(ws => (
                      <span key={ws}
                        className="px-3 py-1 rounded-lg bg-red-500/15 text-red-300
                                   border border-red-500/25 text-xs font-medium">
                        {ws}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Comparison note */}
              <div className="mt-4 flex items-center gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 bg-blue-400/50" />
                  Class average line
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-2.5 rounded bg-emerald-400" />
                  ≥75% (Distinction)
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-2.5 rounded bg-amber-400" />
                  40–75% (Pass)
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-2.5 rounded bg-red-400" />
                  &lt;40% (Fail)
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </main>
    </div>
  )
}
