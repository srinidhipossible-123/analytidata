import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CloudArrowUpIcon, ChartBarIcon, UserGroupIcon,
  ExclamationTriangleIcon, CheckCircleIcon, ArrowPathIcon,
  DocumentArrowDownIcon, TrashIcon, EyeIcon,
  AcademicCapIcon, TableCellsIcon, ArrowPathRoundedSquareIcon,
  XMarkIcon, MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import Sidebar from '../../components/Sidebar'
import api from '../../api/client'
import toast from 'react-hot-toast'

const container = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }
const item      = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }

const EXAM_TYPES = ['IA-1', 'IA-2', 'Mid-Sem', 'End-Sem', 'Lab Exam', 'Other']

export default function AdminDashboard() {
  const navigate = useNavigate()

  // ── Upload state ────────────────────────────────────────────────────────
  const [file,          setFile]          = useState(null)
  const [sheets,        setSheets]        = useState([])       // available sheets from the file
  const [selectedSheet, setSelectedSheet] = useState('')       // chosen sheet
  const [loadingSheets, setLoadingSheets] = useState(false)
  const [section,       setSection]       = useState('')
  const [examType,      setExamType]      = useState('IA-1')
  const [academicYear,  setAcademicYear]  = useState('2025-26')
  const [maxMarks,      setMaxMarks]      = useState('')
  const [criticalMinFails, setCriticalMinFails] = useState(1)   // flagged if failed >= N subjects
  const [pushing,       setPushing]       = useState(false)
  const [dragOver,      setDragOver]      = useState(false)
  const fileRef = useRef()

  // ── Reports ─────────────────────────────────────────────────────────────
  const [reports,       setReports]       = useState([])
  const [loadingR,      setLoadingR]      = useState(false)
  const [reportSearch,  setReportSearch]  = useState('')

  useEffect(() => { loadReports() }, [])

  const loadReports = async () => {
    setLoadingR(true)
    try {
      const res = await api.get('/api/admin/reports')
      setReports(res.data)
    } catch { toast.error('Failed to load reports') }
    finally { setLoadingR(false) }
  }

  // ── Auto-detect sheets after file selection ──────────────────────────────
  const detectSheets = useCallback(async (selectedFile) => {
    if (!selectedFile) return
    setLoadingSheets(true)
    setSheets([])
    setSelectedSheet('')
    try {
      const fd = new FormData()
      fd.append('file', selectedFile)
      const res = await api.post('/api/admin/sheets', fd)
      const sheetList = res.data.sheets || []
      setSheets(sheetList)
      setSelectedSheet(sheetList[0] || '')
      if (sheetList.length > 1) {
        toast.success(`Found ${sheetList.length} sheets — select the one to analyse`, { duration: 3000 })
      }
    } catch (err) {
      toast.error('Could not read file sheets')
    } finally {
      setLoadingSheets(false)
    }
  }, [])

  const handleFileChange = (f) => {
    if (!f) return
    setFile(f)
    detectSheets(f)
  }

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFileChange(f)
  }

  const clearFile = () => {
    setFile(null); setSheets([]); setSelectedSheet('')
    if (fileRef.current) fileRef.current.value = ''
  }

  // ── Push report ──────────────────────────────────────────────────────────
  const handlePush = async (e) => {
    e.preventDefault()
    if (!file)    { toast.error('Select an Excel file'); return }
    if (!section) { toast.error('Enter section name'); return }
    if (!selectedSheet) { toast.error('Select a sheet'); return }
    setPushing(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('section', section)
      fd.append('exam_type', examType)
      fd.append('academic_year', academicYear)
      fd.append('max_marks', parseInt(maxMarks) || 100)
      fd.append('critical_min_fails', criticalMinFails)
      fd.append('sheet_name', selectedSheet)
      const res = await api.post('/api/admin/push-report', fd)
      toast.success(`✅ Report pushed! ${res.data.total_students} students analysed from "${res.data.sheet_name}"`)
      clearFile(); setSection('')
      loadReports()
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Push failed')
    } finally { setPushing(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this report?')) return
    try {
      await api.delete(`/api/admin/reports/${id}`)
      toast.success('Report deleted')
      setReports(r => r.filter(x => x.id !== id))
    } catch { toast.error('Delete failed') }
  }

  // ── Summary stats ────────────────────────────────────────────────────────
  const totalPushed   = reports.length
  const totalStudents = reports.reduce((s, r) => s + (r.total_students || 0), 0)
  const criticalTotal = reports.reduce((s, r) => s + (r.critical_count || 0), 0)

  const filteredReports = reports.filter(r => {
    const q = reportSearch.toLowerCase()
    return !q ||
      r.section?.toLowerCase().includes(q) ||
      r.exam_type?.toLowerCase().includes(q) ||
      r.academic_year?.toLowerCase().includes(q) ||
      r.filename?.toLowerCase().includes(q) ||
      r.sheet_name?.toLowerCase().includes(q) ||
      r.pushed_by_name?.toLowerCase().includes(q)
  })

  return (
    <div className="flex min-h-screen bg-navy-900">
      <Sidebar />
      <main className="flex-1 p-6 ml-16 md:ml-60">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black gradient-text">Admin Dashboard</h1>
            <p className="text-slate-400 text-sm mt-1">
              Upload mark sheets · Select sheet · Push to teachers
            </p>
          </div>
          <button onClick={loadReports} className="btn-secondary flex items-center gap-2 text-sm">
            <ArrowPathIcon className="w-4 h-4" /> Refresh
          </button>
        </div>

        {/* Summary cards */}
        <motion.div variants={container} initial="hidden" animate="visible"
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Reports Pushed',    value: totalPushed,   icon: DocumentArrowDownIcon,   color: 'blue' },
            { label: 'Total Students',    value: totalStudents, icon: AcademicCapIcon,          color: 'violet' },
            { label: 'Critical Students', value: criticalTotal, icon: ExclamationTriangleIcon,  color: criticalTotal > 0 ? 'red' : 'green' },
          ].map(({ label, value, icon: Icon, color }) => (
            <motion.div key={label} variants={item}
              className={`glass rounded-2xl p-5 border
                ${color === 'red' ? 'border-red-500/20' : color === 'blue' ? 'border-blue-500/20'
                : color === 'violet' ? 'border-violet-500/20' : 'border-emerald-500/20'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500 mb-1">{label}</p>
                  <p className={`text-3xl font-black
                    ${color === 'red' ? 'text-red-400' : color === 'blue' ? 'text-blue-400'
                    : color === 'violet' ? 'text-violet-400' : 'text-emerald-400'}`}>
                    {value}
                  </p>
                </div>
                <Icon className={`w-8 h-8 opacity-30
                  ${color === 'red' ? 'text-red-400' : color === 'blue' ? 'text-blue-400'
                  : color === 'violet' ? 'text-violet-400' : 'text-emerald-400'}`} />
              </div>
            </motion.div>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

          {/* Upload & Push form */}
          <div className="xl:col-span-2">
            <div className="glass rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
                <CloudArrowUpIcon className="w-5 h-5 text-orange-400" />
                <h2 className="font-semibold">Upload & Push Report</h2>
              </div>

              <form onSubmit={handlePush} className="p-6 space-y-4">

                {/* ── Drag-drop zone ── */}
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => !file && fileRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center
                              transition-all duration-200
                              ${dragOver
                                ? 'border-orange-500 bg-orange-500/10 cursor-copy'
                                : file
                                  ? 'border-emerald-500/40 bg-emerald-500/5 cursor-default'
                                  : 'border-white/10 hover:border-white/20 cursor-pointer'}`}>
                  <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={e => handleFileChange(e.target.files[0])} />

                  {file ? (
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircleIcon className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      <span className="text-sm text-emerald-300 font-medium truncate max-w-[180px]">
                        {file.name}
                      </span>
                      <button type="button" onClick={e => { e.stopPropagation(); clearFile() }}
                        className="ml-1 p-0.5 rounded-full hover:bg-white/10 text-slate-500
                                   hover:text-red-400 transition-colors flex-shrink-0">
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <CloudArrowUpIcon className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                      <p className="text-sm text-slate-400">Drop Excel / CSV here</p>
                      <p className="text-xs text-slate-600 mt-1">or click to browse</p>
                    </>
                  )}
                </div>

                {/* ── Sheet selector — shown after file is loaded ── */}
                <AnimatePresence>
                  {(loadingSheets || sheets.length > 0) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}>

                      <label className="text-xs text-slate-400 mb-1.5 block font-medium flex items-center gap-1.5">
                        <TableCellsIcon className="w-3.5 h-3.5 text-cyan-400" />
                        Sheet to Analyse
                        {loadingSheets && (
                          <ArrowPathRoundedSquareIcon className="w-3.5 h-3.5 text-slate-500 animate-spin ml-1" />
                        )}
                      </label>

                      {loadingSheets ? (
                        <div className="input-glass animate-pulse text-slate-600 text-sm">
                          Reading sheets…
                        </div>
                      ) : (
                        <>
                          {/* If multiple sheets — show tab-style buttons */}
                          {sheets.length > 1 ? (
                            <div className="flex flex-wrap gap-2">
                              {sheets.map(sh => (
                                <button key={sh} type="button"
                                  onClick={() => setSelectedSheet(sh)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-medium
                                              transition-all duration-150 border
                                              ${selectedSheet === sh
                                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                                                : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20 hover:text-slate-200'}`}>
                                  📄 {sh}
                                </button>
                              ))}
                            </div>
                          ) : (
                            /* Single sheet — just show as info */
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg
                                            bg-cyan-500/10 border border-cyan-500/20">
                              <TableCellsIcon className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                              <span className="text-sm text-cyan-300 font-medium">{sheets[0]}</span>
                              <span className="text-xs text-slate-500 ml-auto">only sheet</span>
                            </div>
                          )}

                          {/* Preview hint */}
                          {selectedSheet && (
                            <p className="text-[10px] text-slate-600 mt-1.5">
                              ✓ Will analyse <span className="text-cyan-500">{selectedSheet}</span>
                            </p>
                          )}
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Section */}
                <div>
                  <label className="text-xs text-slate-400 mb-1 block font-medium">
                    Section / Class Name *
                  </label>
                  <input value={section} onChange={e => setSection(e.target.value)}
                    placeholder="e.g. CSE-A, 3rd Sem B"
                    className="input-glass" />
                </div>

                {/* Exam Type */}
                <div>
                  <label className="text-xs text-slate-400 mb-1 block font-medium">Exam Type</label>
                  <select value={examType} onChange={e => setExamType(e.target.value)}
                    className="input-glass bg-navy-800">
                    {EXAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                {/* Academic year & max marks */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block font-medium">Academic Year</label>
                    <input value={academicYear} onChange={e => setAcademicYear(e.target.value)}
                      placeholder="2025-26" className="input-glass" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block font-medium">Max Marks/Subject</label>
                    <input type="number" value={maxMarks}
                      onChange={e => setMaxMarks(e.target.value)}
                       placeholder="e.g. 25 or 100"
                      min={1} max={500} className="input-glass" />
                  </div>
                </div>

                {/* Critical threshold */}
                <div>
                  <label className="text-xs text-slate-400 mb-1 block font-medium">
                    🚨 Critical: student failed ≥
                  </label>
                  <select value={criticalMinFails}
                    onChange={e => setCriticalMinFails(Number(e.target.value))}
                    className="input-glass bg-navy-800">
                    {[1,2,3,4,5].map(n => (
                      <option key={n} value={n}>
                        {n} subject{n > 1 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-600 mt-1">
                    Students failing {criticalMinFails}+ subject{criticalMinFails > 1 ? 's' : ''} will be flagged as critical
                  </p>
                </div>

                <button type="submit"
                  disabled={pushing || loadingSheets || !file || !selectedSheet}
                  className="w-full py-3 rounded-xl font-bold text-white
                             bg-gradient-to-r from-orange-500 to-red-600
                             hover:shadow-lg hover:shadow-orange-500/30
                             hover:scale-[1.01] active:scale-[0.99]
                             transition-all duration-200 flex items-center justify-center gap-2
                             disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100">
                  {pushing
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Analysing & Pushing…</>
                    : <><CloudArrowUpIcon className="w-4 h-4" />
                        Analyse & Push to Teachers</>}
                </button>
              </form>
            </div>

            {/* Quick nav to user management */}
            <button onClick={() => navigate('/admin/users')}
              className="w-full mt-4 glass rounded-2xl p-4 flex items-center gap-3
                         hover:bg-white/5 transition-all duration-200 group">
              <UserGroupIcon className="w-8 h-8 text-violet-400" />
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-200">Manage Teachers & Mentors</p>
                <p className="text-xs text-slate-500">Add accounts · Reset passwords</p>
              </div>
              <EyeIcon className="w-4 h-4 text-slate-600 group-hover:text-slate-400 ml-auto" />
            </button>
          </div>

          {/* Pushed reports list */}
          <div className="xl:col-span-3">
            <div className="glass rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 shrink-0">
                  <ChartBarIcon className="w-5 h-5 text-blue-400" />
                  <h2 className="font-semibold">Pushed Reports</h2>
                  <span className="badge badge-blue">{reports.length}</span>
                </div>
                {/* Search */}
                <div className="relative flex-1 max-w-xs">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    value={reportSearch} onChange={e => setReportSearch(e.target.value)}
                    placeholder="Search section, exam, file…"
                    className="input-glass pl-9 text-sm w-full" />
                </div>
              </div>

              {loadingR ? (
                <div className="p-6 space-y-3">
                  {[1,2,3].map(i => <div key={i} className="skeleton h-20 rounded-xl" />)}
                </div>
              ) : reports.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <ChartBarIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No reports pushed yet.</p>
                  <p className="text-xs mt-1">Upload a mark sheet and push to teachers.</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                  {reportSearch && (
                    <p className="px-6 py-2 text-[11px] text-slate-500">
                      {filteredReports.length} of {reports.length} reports
                    </p>
                  )}
                  <AnimatePresence>
                    {filteredReports.map(r => (
                      <motion.div key={r.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="px-6 py-4 hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-sm font-bold text-slate-200">{r.section}</span>
                              <span className="badge badge-orange text-[10px]">{r.exam_type}</span>
                              <span className="badge badge-violet text-[10px]">{r.academic_year}</span>
                              {r.sheet_name && (
                                <span className="badge badge-cyan text-[10px]">
                                  📄 {r.sheet_name}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                              <span>👥 {r.total_students} students</span>
                              <span>📊 Avg: {r.class_avg_pct}%</span>
                              {r.critical_count > 0 && (
                                <span className="text-red-400">⚠️ {r.critical_count} critical</span>
                              )}
                              <span>🕐 {new Date(r.pushed_at).toLocaleDateString('en-IN')}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button onClick={() => navigate(`/teacher/report/${r.id}`)}
                              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg
                                         bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20
                                         text-blue-300 transition-all">
                              <EyeIcon className="w-3.5 h-3.5" /> View
                            </button>
                            <button onClick={() => handleDelete(r.id)}
                              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20
                                         text-red-400 border border-red-500/20 transition-all">
                              <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}


