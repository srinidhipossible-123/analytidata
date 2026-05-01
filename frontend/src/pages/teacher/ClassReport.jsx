import { useEffect, useState, lazy, Suspense } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeftIcon, ExclamationTriangleIcon, MagnifyingGlassIcon,
  TrophyIcon, ChartBarIcon, AcademicCapIcon, UserIcon,
  DocumentArrowDownIcon, FunnelIcon,
} from '@heroicons/react/24/outline'
import Sidebar from '../../components/Sidebar'
import api from '../../api/client'
import toast from 'react-hot-toast'

const Plot = lazy(() => import('react-plotly.js'))

const GRADE_META = {
  O:   { color: '#10b981', bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  'A+':{ color: '#22c55e', bg: 'bg-green-500/20',   text: 'text-green-300',   border: 'border-green-500/30' },
  A:   { color: '#3b82f6', bg: 'bg-blue-500/20',    text: 'text-blue-300',    border: 'border-blue-500/30' },
  'B+':{ color: '#06b6d4', bg: 'bg-cyan-500/20',    text: 'text-cyan-300',    border: 'border-cyan-500/30' },
  B:   { color: '#8b5cf6', bg: 'bg-violet-500/20',  text: 'text-violet-300',  border: 'border-violet-500/30' },
  C:   { color: '#f59e0b', bg: 'bg-amber-500/20',   text: 'text-amber-300',   border: 'border-amber-500/30' },
  F:   { color: '#ef4444', bg: 'bg-red-500/20',     text: 'text-red-300',     border: 'border-red-500/30' },
}

const DARK = { paper_bgcolor:'rgba(0,0,0,0)', plot_bgcolor:'rgba(0,0,0,0)',
               font:{ color:'#94a3b8', family:'Inter', size:11 },
               margin:{ t:40, b:60, l:60, r:20 } }

export default function ClassReport() {
  const { reportId } = useParams()
  const navigate     = useNavigate()
  const [report,   setReport]   = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [sortBy,   setSortBy]   = useState('rank')     // rank | name | percentage
  const [filter,   setFilter]   = useState('all')      // all | critical | pass | fail
  const [tab,      setTab]      = useState('overview') // overview | students | critical
  const [downloading, setDownloading] = useState(false)

  useEffect(() => { loadReport() }, [reportId])

  const loadReport = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/api/teacher/reports/${reportId}`)
      setReport(res.data)
    } catch { toast.error('Failed to load report'); navigate('/teacher') }
    finally { setLoading(false) }
  }

  const downloadPdf = async () => {
    setDownloading(true)
    try {
      const params = new URLSearchParams({
        active_tab:  tab,
        filter_type: filter,
        search_q:    search,
        sort_by:     sortBy,
      })
      const res = await api.get(
        `/api/teacher/reports/${reportId}/pdf?${params.toString()}`,
        { responseType: 'blob' }
      )
      const url      = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const link     = document.createElement('a')
      const section  = report?.section?.replace(/\s+/g, '_') || 'report'
      const examType = report?.exam_type?.replace(/\s+/g, '-') || ''
      link.href      = url
      link.download  = `Performance_${section}_${examType}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast.success('PDF downloaded!')
    } catch (err) {
      toast.error('PDF generation failed')
    } finally {
      setDownloading(false)
    }
  }

  if (loading) return (
    <div className="flex min-h-screen bg-navy-900">
      <Sidebar />
      <main className="flex-1 flex items-center justify-center ml-16 md:ml-60">
        <div className="w-12 h-12 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </main>
    </div>
  )

  if (!report) return null

  const a = report.analytics || {}
  const students      = a.students || []
  const subjectCols   = a.subject_cols || []
  const subjectStats  = a.subject_stats || {}
  const gradeDist     = a.grade_distribution || {}
  const critical      = a.critical_students || []
  const top5          = a.top5 || []

  // Filtered + sorted students
  const filtered = students
    .filter(s => {
      const matchSearch = !search ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.roll.toLowerCase().includes(search.toLowerCase())
      const matchFilter =
        filter === 'all'      ? true :
        filter === 'critical' ? s.is_critical :
        filter === 'pass'     ? s.percentage >= 40 :
        filter === 'fail'     ? s.percentage < 40  : true
      return matchSearch && matchFilter
    })
    .sort((a, b) => {
      if (sortBy === 'name')       return a.name.localeCompare(b.name)
      if (sortBy === 'percentage') return b.percentage - a.percentage
      if (sortBy === 'usn')        return a.roll.localeCompare(b.roll)
      return a.rank - b.rank
    })

  // ── Chart data ────────────────────────────────────────────────────────────
  const subjectNames = Object.keys(subjectStats)
  const subjectAvgs  = subjectNames.map(s => subjectStats[s].avg)
  const subjectPass  = subjectNames.map(s => subjectStats[s].pass_rate)

  const gradeNames   = Object.keys(gradeDist)
  const gradeCounts  = Object.values(gradeDist)
  const gradeColors  = gradeNames.map(g => GRADE_META[g]?.color || '#94a3b8')

  return (
    <div className="flex min-h-screen bg-navy-900">
      <Sidebar />
      <main className="flex-1 p-6 ml-16 md:ml-60">

        {/* ── Header ── */}
        <div className="flex items-start gap-4 mb-6">
          <button onClick={() => navigate('/teacher')}
            className="p-2 rounded-xl glass hover:bg-white/10 text-slate-400
                       hover:text-white transition-all mt-1 flex-shrink-0">
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-black gradient-text">{report.section}</h1>
              <span className="badge badge-orange">{report.exam_type}</span>
              <span className="badge badge-violet">{report.academic_year}</span>
            </div>
            <p className="text-slate-400 text-sm mt-1">
              Pushed by {report.pushed_by_name} ·{' '}
              {new Date(report.pushed_at).toLocaleDateString('en-IN', { dateStyle: 'long' })}
            </p>
          </div>
          {/* Download PDF button — visible to all roles */}
          <button
            onClick={downloadPdf}
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm
                       bg-gradient-to-r from-blue-600 to-violet-600
                       hover:shadow-lg hover:shadow-blue-500/25 hover:scale-[1.02]
                       active:scale-[0.98] transition-all duration-200 text-white
                       disabled:opacity-60 disabled:cursor-not-allowed flex-shrink-0">
            {downloading
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <DocumentArrowDownIcon className="w-4 h-4" />}
            {downloading ? 'Generating…' : 'Download PDF'}
          </button>
        </div>

        {/* ── Top KPI Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label:'Total Students',  value: a.total_students,            color:'blue' },
            { label:'Class Avg',       value: `${a.class_avg_pct}%`,       color:'violet' },
            { label:'Overall Pass Rate',value:`${a.overall_pass_rate}%`,   color:'green' },
            { label:'Critical Students',value: critical.length,            color: critical.length > 0 ? 'red' : 'green' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`glass rounded-2xl p-4 border
              ${color==='red'?'border-red-500/20':color==='blue'?'border-blue-500/20'
              :color==='violet'?'border-violet-500/20':'border-emerald-500/20'}`}>
              <p className="text-xs text-slate-500 mb-1">{label}</p>
              <p className={`text-2xl font-black
                ${color==='red'?'text-red-400':color==='blue'?'text-blue-400'
                :color==='violet'?'text-violet-400':'text-emerald-400'}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-2 mb-6 border-b border-white/5 pb-0">
          {[
            { key:'overview',  label:'📊 Overview' },
            { key:'students',  label:'👥 All Students' },
            { key:'critical',  label:`⚠️ Critical (${critical.length})` },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-xl transition-all
                ${tab === key
                  ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20 border-b-0'
                  : 'text-slate-500 hover:text-slate-300'}`}>
              {label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* ─────── OVERVIEW TAB ─────── */}
          {tab === 'overview' && (
            <motion.div key="overview"
              initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">

                {/* Subject avg bar chart */}
                <div className="glass rounded-2xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2">
                    <ChartBarIcon className="w-4 h-4 text-blue-400" />
                    <h3 className="text-sm font-semibold">Subject-wise Average Marks</h3>
                  </div>
                  <div className="p-3">
                    <Suspense fallback={<div className="skeleton h-64 rounded-xl" />}>
                      <Plot
                        data={[{
                          type: 'bar', orientation: 'h',
                          x: subjectAvgs, y: subjectNames,
                          marker: { color: subjectAvgs.map(v =>
                            v >= 75 ? '#10b981' : v >= 50 ? '#3b82f6' : v >= 40 ? '#f59e0b' : '#ef4444'
                          )},
                          text: subjectAvgs.map(v => `${v}`),
                          textposition: 'outside',
                          hovertemplate: '%{y}: %{x:.1f} marks<extra></extra>',
                        }]}
                        layout={{
                          ...DARK, height: 280,
                          xaxis: { range:[0, a.max_marks_per_subject],
                            gridcolor:'rgba(255,255,255,0.06)' },
                          yaxis: { gridcolor:'rgba(255,255,255,0.04)' },
                          bargap: 0.35,
                        }}
                        config={{ displayModeBar:false, responsive:true }}
                        style={{ width:'100%' }} useResizeHandler
                      />
                    </Suspense>
                  </div>
                </div>

                {/* Grade distribution donut */}
                <div className="glass rounded-2xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2">
                    <AcademicCapIcon className="w-4 h-4 text-violet-400" />
                    <h3 className="text-sm font-semibold">Grade Distribution</h3>
                  </div>
                  <div className="p-3">
                    <Suspense fallback={<div className="skeleton h-64 rounded-xl" />}>
                      <Plot
                        data={[{
                          type: 'pie', hole: 0.55,
                          labels: gradeNames, values: gradeCounts,
                          marker: { colors: gradeColors },
                          textinfo: 'label+percent',
                          hovertemplate: '%{label}: %{value} students<extra></extra>',
                        }]}
                        layout={{ ...DARK, height: 280, showlegend: true,
                          legend:{ x:1, y:0.5, font:{ color:'#94a3b8', size:11 } } }}
                        config={{ displayModeBar:false, responsive:true }}
                        style={{ width:'100%' }} useResizeHandler
                      />
                    </Suspense>
                  </div>
                </div>

                {/* Subject pass rate */}
                <div className="glass rounded-2xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2">
                    <ChartBarIcon className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-semibold">Subject Pass Rate (%)</h3>
                  </div>
                  <div className="p-3">
                    <Suspense fallback={<div className="skeleton h-64 rounded-xl" />}>
                      <Plot
                        data={[{
                          type: 'bar',
                          x: subjectNames, y: subjectPass,
                          marker:{ color:'#06b6d4', opacity:0.8 },
                          text: subjectPass.map(v => `${v}%`),
                          textposition:'outside',
                        }]}
                        layout={{
                          ...DARK, height: 260,
                          yaxis:{ range:[0,110], gridcolor:'rgba(255,255,255,0.06)' },
                          xaxis:{ gridcolor:'rgba(255,255,255,0.04)' },
                          bargap: 0.3,
                          shapes:[{ type:'line', x0:-0.5, x1:subjectNames.length-0.5,
                            y0:40, y1:40, line:{ color:'#ef4444', width:1.5, dash:'dash' } }],
                        }}
                        config={{ displayModeBar:false, responsive:true }}
                        style={{ width:'100%' }} useResizeHandler
                      />
                    </Suspense>
                  </div>
                </div>

                {/* Top 5 performers */}
                <div className="glass rounded-2xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2">
                    <TrophyIcon className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-semibold">Top Performers</h3>
                  </div>
                  <div className="divide-y divide-white/5">
                    {top5.map((s, i) => {
                      const gm = GRADE_META[s.grade] || GRADE_META.C
                      return (
                        <div key={s.roll}
                          onClick={() => navigate(`/teacher/report/${reportId}/student/${encodeURIComponent(s.roll)}`)}
                          className="px-5 py-3 flex items-center gap-3 cursor-pointer
                                     hover:bg-white/[0.03] transition-colors">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center
                                           text-xs font-black flex-shrink-0
                                           ${i===0?'bg-amber-400/20 text-amber-300':
                                             i===1?'bg-slate-400/20 text-slate-300':
                                             i===2?'bg-orange-400/20 text-orange-300':
                                             'bg-white/10 text-slate-400'}`}>
                            {i+1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-200 truncate">{s.name}</p>
                            <p className="text-xs text-slate-500">Roll: {s.roll}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`badge ${gm.bg} ${gm.text} border ${gm.border}`}>{s.grade}</span>
                            <span className="text-sm font-bold text-slate-200">{s.percentage}%</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ─────── ALL STUDENTS TAB ─────── */}
          {tab === 'students' && (
            <motion.div key="students"
              initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>

              {/* Search + filter toolbar */}
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="relative flex-1 min-w-[200px]">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name or roll number…"
                    className="input-glass pl-9" />
                </div>
                <select value={filter} onChange={e => setFilter(e.target.value)}
                  className="input-glass bg-navy-800 w-auto px-4">
                  <option value="all">All Students</option>
                  <option value="pass">Passed (≥40%)</option>
                  <option value="fail">Failed (&lt;40%)</option>
                  <option value="critical">Critical</option>
                </select>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                  className="input-glass bg-navy-800 w-auto px-4">
                  <option value="rank">Sort: Rank</option>
                  <option value="usn">Sort: USN</option>
                  <option value="name">Sort: Name</option>
                  <option value="percentage">Sort: Score</option>
                </select>
              </div>

              {/* Table */}
              <div className="glass rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-white/5 text-slate-400 text-xs">
                        <th className="px-4 py-3 text-left font-medium">Rank</th>
                        <th className="px-4 py-3 text-left font-medium">Roll</th>
                        <th className="px-4 py-3 text-left font-medium">Name</th>
                        {subjectCols.map(sc => (
                          <th key={sc} className="px-4 py-3 text-center font-medium">{sc}</th>
                        ))}
                        <th className="px-4 py-3 text-center font-medium">Total</th>
                        <th className="px-4 py-3 text-center font-medium">%</th>
                        <th className="px-4 py-3 text-center font-medium">Grade</th>
                        <th className="px-4 py-3 text-center font-medium">View</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((s, i) => {
                        const gm = GRADE_META[s.grade] || GRADE_META.C
                        return (
                          <tr key={s.roll}
                            className={`border-t border-white/5 hover:bg-white/[0.03] transition-colors
                              ${s.is_critical ? 'bg-red-500/[0.03]' : ''}`}>
                            <td className="px-4 py-3 text-slate-400 text-xs">{s.rank}</td>
                            <td className="px-4 py-3 text-slate-400 text-xs">{s.roll}</td>
                            <td className="px-4 py-3 font-medium text-slate-200">
                              <div className="flex items-center gap-1.5">
                                {s.is_critical && (
                                  <ExclamationTriangleIcon className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                                )}
                                {s.name}
                              </div>
                            </td>
                            {subjectCols.map(sc => {
                              const sm = s.subjects[sc]
                              return (
                                <td key={sc} className="px-4 py-3 text-center">
                                  <span className={`font-semibold
                                    ${sm?.passed === false ? 'text-red-400' :
                                      sm?.marks >= (a.max_marks_per_subject * 0.75) ? 'text-emerald-400' :
                                      'text-slate-300'}`}>
                                    {sm?.marks ?? '—'}
                                  </span>
                                </td>
                              )
                            })}
                            <td className="px-4 py-3 text-center font-semibold text-slate-200">
                              {s.total ?? '—'}
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-slate-200">
                              {s.percentage}%
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`badge text-[10px] ${gm.bg} ${gm.text} border ${gm.border}`}>
                                {s.grade}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => navigate(`/teacher/report/${reportId}/student/${encodeURIComponent(s.roll)}`)}
                                className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/25
                                           text-blue-400 border border-blue-500/20 transition-all">
                                <UserIcon className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-2 text-xs text-slate-600 border-t border-white/5">
                  Showing {filtered.length} of {students.length} students
                </div>
              </div>
            </motion.div>
          )}

          {/* ─────── CRITICAL STUDENTS TAB ─────── */}
          {tab === 'critical' && (
            <motion.div key="critical"
              initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
              {critical.length === 0 ? (
                <div className="glass rounded-2xl p-16 text-center text-slate-500">
                  <ExclamationTriangleIcon className="w-16 h-16 mx-auto mb-4 text-emerald-400 opacity-40" />
                  <p className="text-lg font-semibold text-emerald-400">No Critical Students! 🎉</p>
                  <p className="text-sm mt-2">All students are above the critical threshold.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {critical.map(s => {
                    const gm = GRADE_META[s.grade] || GRADE_META.F
                    return (
                      <motion.div key={s.roll}
                        initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }}
                        onClick={() => navigate(`/teacher/report/${reportId}/student/${encodeURIComponent(s.roll)}`)}
                        className="glass rounded-2xl p-5 cursor-pointer border border-red-500/20
                                   hover:border-red-500/40 hover:bg-red-500/5 transition-all">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30
                                          flex items-center justify-center flex-shrink-0">
                            <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 flex-wrap mb-2">
                              <span className="font-bold text-slate-200">{s.name}</span>
                              <span className="text-xs text-slate-500">Roll: {s.roll}</span>
                              <span className={`badge text-[10px] ${gm.bg} ${gm.text} border ${gm.border}`}>
                                {s.grade}
                              </span>
                              <span className="text-sm font-bold text-red-400">{s.percentage}%</span>
                            </div>
                            {s.weak_subjects.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                <span className="text-xs text-slate-500 mr-1">Weak in:</span>
                                {s.weak_subjects.map(ws => (
                                  <span key={ws}
                                    className="px-2 py-0.5 rounded-md bg-red-500/15 text-red-300
                                               border border-red-500/25 text-xs">
                                    {ws}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          {/* Mini subject bars */}
                          <div className="hidden md:flex flex-col gap-1 min-w-[140px]">
                            {subjectCols.slice(0, 4).map(sc => {
                              const sm = s.subjects[sc]
                              const pct = sm?.pct || 0
                              return (
                                <div key={sc} className="flex items-center gap-2">
                                  <span className="text-[10px] text-slate-500 w-16 truncate">{sc}</span>
                                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full transition-all
                                      ${pct >= 75 ? 'bg-emerald-400' : pct >= 40 ? 'bg-amber-400' : 'bg-red-400'}`}
                                      style={{ width: `${pct}%` }} />
                                  </div>
                                  <span className={`text-[10px] w-8 text-right
                                    ${pct < 40 ? 'text-red-400' : 'text-slate-400'}`}>
                                    {sm?.marks ?? '—'}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
