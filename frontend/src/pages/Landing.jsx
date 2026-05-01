import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AcademicCapIcon, ShieldCheckIcon, ChartBarIcon,
  ExclamationTriangleIcon, DocumentArrowDownIcon,
  UserGroupIcon, TableCellsIcon, ArrowRightIcon,
} from '@heroicons/react/24/outline'

const features = [
  { icon: TableCellsIcon,           color: 'blue',   title: 'Smart Sheet Detection',   desc: 'Upload any Excel file — the system auto-reads all sheets. Pick the one to analyse in one click.' },
  { icon: ChartBarIcon,             color: 'violet', title: 'Subject-wise Analysis',    desc: 'Average marks, pass rates, and performance breakdowns per subject — visualised instantly.' },
  { icon: AcademicCapIcon,          color: 'cyan',   title: 'Individual Progress',      desc: 'Every student gets a grade card with animated subject bars vs class average.' },
  { icon: ExclamationTriangleIcon,  color: 'red',    title: 'Critical Student Alerts',  desc: 'Auto-flags students below 40% with weak subject highlights — shareable with mentors.' },
  { icon: UserGroupIcon,            color: 'green',  title: 'Dual-Role Access',         desc: 'Admin/HOD pushes reports; Teachers and Mentors view live results for their class.' },
  { icon: DocumentArrowDownIcon,    color: 'amber',  title: 'Exportable PDF Reports',   desc: 'Download full class reports as clean white-theme PDFs — ready for management or parents.' },
]

const flow = [
  { step: '01', color: 'orange', title: 'Admin Uploads',     desc: 'HOD uploads the mark sheet Excel and selects the sheet to analyse.' },
  { step: '02', color: 'blue',   title: 'Auto Analysis',     desc: 'Engine detects USN, Name & subjects, computes grades, pass rates & critical flags.' },
  { step: '03', color: 'violet', title: 'Push to Teachers',  desc: 'Admin pushes the analysed report — instantly visible to all teachers & mentors.' },
  { step: '04', color: 'green',  title: 'View & Download',   desc: 'Teachers view class overview, drill into individual students, and download PDF.' },
]

const colorMap = {
  blue:   'from-blue-500/20   to-blue-500/5   border-blue-500/20   text-blue-400',
  violet: 'from-violet-500/20 to-violet-500/5 border-violet-500/20 text-violet-400',
  cyan:   'from-cyan-500/20   to-cyan-500/5   border-cyan-500/20   text-cyan-400',
  red:    'from-red-500/20    to-red-500/5    border-red-500/20    text-red-400',
  green:  'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-400',
  amber:  'from-amber-500/20  to-amber-500/5  border-amber-500/20  text-amber-400',
}

const stepColor = {
  orange: { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30', num: 'bg-gradient-to-br from-orange-500 to-red-600' },
  blue:   { bg: 'bg-blue-500/10',   text: 'text-blue-400',   border: 'border-blue-500/20',   num: 'bg-gradient-to-br from-blue-500 to-cyan-600' },
  violet: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20', num: 'bg-gradient-to-br from-violet-500 to-purple-700' },
  green:  { bg: 'bg-emerald-500/10',text: 'text-emerald-400',border: 'border-emerald-500/20',num: 'bg-gradient-to-br from-emerald-500 to-green-700' },
}

const container = { hidden: {}, visible: { transition: { staggerChildren: 0.09 } } }
const card = { hidden: { opacity: 0, y: 28 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }

// Animated mock dashboard preview
function DashboardPreview() {
  const subjects = [
    { name: 'AIML', avg: 74, pass: 88 },
    { name: 'ATC',  avg: 52, pass: 61 },
    { name: 'DSC',  avg: 82, pass: 94 },
    { name: 'SDM',  avg: 67, pass: 79 },
    { name: 'UDNT', avg: 58, pass: 70 },
  ]
  const grades = [
    { g: 'O',  pct: 12, color: '#10b981' },
    { g: 'A+', pct: 18, color: '#22c55e' },
    { g: 'A',  pct: 24, color: '#3b82f6' },
    { g: 'B+', pct: 20, color: '#06b6d4' },
    { g: 'B',  pct: 14, color: '#8b5cf6' },
    { g: 'C',  pct:  8, color: '#f59e0b' },
    { g: 'F',  pct:  4, color: '#ef4444' },
  ]

  return (
    <div className="glass rounded-3xl p-5 border border-white/10 shadow-2xl">
      {/* Window chrome */}
      <div className="flex items-center gap-2 mb-4">
        <span className="w-3 h-3 rounded-full bg-red-400/80" />
        <span className="w-3 h-3 rounded-full bg-yellow-400/80" />
        <span className="w-3 h-3 rounded-full bg-green-400/80" />
        <span className="ml-3 text-xs text-slate-500 font-mono">EduLens · CSE-DS · IA-1</span>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { label: 'Students', value: '67', color: 'text-blue-400' },
          { label: 'Class Avg', value: '68%', color: 'text-violet-400' },
          { label: 'Pass Rate', value: '79%', color: 'text-emerald-400' },
          { label: 'Critical', value: '8', color: 'text-red-400' },
        ].map(k => (
          <div key={k.label} className="glass rounded-xl p-2.5 text-center">
            <p className={`text-lg font-black ${k.color}`}>{k.value}</p>
            <p className="text-[10px] text-slate-500">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Subject bars */}
      <div className="glass rounded-xl p-3 mb-3">
        <p className="text-[10px] text-slate-500 mb-2 font-medium">Subject Avg Marks</p>
        <div className="space-y-2">
          {subjects.map((s, i) => (
            <div key={s.name} className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 w-10 shrink-0">{s.name}</span>
              <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${s.avg >= 75 ? 'bg-emerald-400' : s.avg >= 50 ? 'bg-blue-400' : 'bg-amber-400'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${s.avg}%` }}
                  transition={{ duration: 1, delay: 0.6 + i * 0.12 }}
                />
              </div>
              <span className="text-[10px] text-slate-400 w-8 text-right">{s.avg}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Grade mini-bar */}
      <div className="glass rounded-xl p-3">
        <p className="text-[10px] text-slate-500 mb-2 font-medium">Grade Distribution</p>
        <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
          {grades.map((g, i) => (
            <motion.div key={g.g}
              initial={{ width: 0 }} animate={{ width: `${g.pct}%` }}
              transition={{ duration: 0.8, delay: 1 + i * 0.08 }}
              style={{ backgroundColor: g.color }}
              className="rounded-sm" title={`${g.g}: ${g.pct}%`}
            />
          ))}
        </div>
        <div className="flex gap-3 mt-2 flex-wrap">
          {grades.map(g => (
            <div key={g.g} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: g.color }} />
              <span className="text-[9px] text-slate-500">{g.g} {g.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-navy-900 overflow-hidden relative">
      {/* Background orbs */}
      <div className="orb orb-blue   w-[500px] h-[500px] -top-32 -left-32" />
      <div className="orb orb-violet w-[400px] h-[400px] top-40 right-0" />
      <div className="orb orb-cyan   w-72 h-72 bottom-32 left-1/4" />
      <div className="orb w-80 h-80 bottom-0 right-1/4"
        style={{ background: 'radial-gradient(circle, #f97316, transparent)', animationDelay: '-5s' }} />

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-red-600
                          flex items-center justify-center shadow-lg shadow-orange-500/30">
            <AcademicCapIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-black gradient-text">AnalytiData</span>
            <span className="hidden md:inline text-xs text-slate-500 ml-2">Student Analytics</span>
          </div>
        </div>
        <Link to="/login"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm
                     bg-gradient-to-r from-orange-500 to-red-600 text-white
                     hover:shadow-lg hover:shadow-orange-500/25 hover:scale-[1.02]
                     transition-all duration-200">
          Sign In <ArrowRightIcon className="w-4 h-4" />
        </Link>
      </nav>

      {/* ── HERO ── */}
      <section className="relative z-10 px-6 pt-20 pb-16">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* Left: copy */}
          <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}>

            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                             bg-orange-500/10 border border-orange-500/20 text-orange-400
                             text-xs font-semibold tracking-wider mb-6">
              <ShieldCheckIcon className="w-3.5 h-3.5" />
              FOR COLLEGES · HOD · TEACHERS · MENTORS
            </span>

            <h1 className="text-5xl md:text-6xl font-black leading-tight mb-6">
              Student Performance
              <br />
              <span className="gradient-text">Analytics Platform</span>
            </h1>

            <p className="text-lg text-slate-400 leading-relaxed mb-8 max-w-lg">
              Upload mark sheets, detect subjects automatically, push reports to teachers —
              and give every student a personalised performance card in seconds.
            </p>

            <div className="flex flex-wrap gap-4 mb-10">
              <Link to="/login"
                className="flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-white
                           bg-gradient-to-r from-orange-500 to-red-600
                           hover:shadow-xl hover:shadow-orange-500/30 hover:scale-[1.02]
                           transition-all duration-200">
                Admin Login <ArrowRightIcon className="w-4 h-4" />
              </Link>
              <Link to="/login"
                className="flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold
                           bg-gradient-to-r from-blue-500 to-violet-600 text-white
                           hover:shadow-xl hover:shadow-blue-500/30 hover:scale-[1.02]
                           transition-all duration-200">
                Teacher Login <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>

            {/* Mini stats */}
            <div className="flex gap-6 flex-wrap">
              {[
                { value: '2',     label: 'Portal Roles' },
                { value: 'Auto',  label: 'Sheet Detection' },
                { value: 'PDF',   label: 'Export Ready' },
                { value: '< 40%', label: 'Critical Flag' },
              ].map(s => (
                <div key={s.label}>
                  <p className="text-2xl font-black gradient-text">{s.value}</p>
                  <p className="text-xs text-slate-500">{s.label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right: live dashboard preview */}
          <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}>
            <DashboardPreview />
          </motion.div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="relative z-10 px-6 py-20 border-y border-white/5">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-2">
            From Upload to <span className="gradient-text">Insight</span> in 4 Steps
          </h2>
          <p className="text-slate-500 text-center text-sm mb-12">
            The complete admin → teacher pipeline, fully automated
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {flow.map((f, i) => {
              const sc = stepColor[f.color]
              return (
                <motion.div key={f.step}
                  initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                  className={`glass rounded-2xl p-5 border ${sc.border} relative overflow-hidden`}>
                  <div className={`w-10 h-10 rounded-xl ${sc.num} flex items-center
                                   justify-center text-white font-black text-sm mb-4 shadow-lg`}>
                    {f.step}
                  </div>
                  {/* Connector line */}
                  {i < flow.length - 1 && (
                    <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10">
                      <ArrowRightIcon className="w-4 h-4 text-slate-600" />
                    </div>
                  )}
                  <h3 className={`font-bold mb-2 ${sc.text}`}>{f.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-2">
            Built for <span className="gradient-text">Educational Institutions</span>
          </h2>
          <p className="text-slate-500 text-center text-sm mb-12">
            Every feature designed around how colleges actually work
          </p>
          <motion.div variants={container} initial="hidden" whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => {
              const Icon = f.icon
              const cls  = colorMap[f.color]
              return (
                <motion.div key={f.title} variants={card}
                  className={`glass p-6 rounded-2xl border bg-gradient-to-br ${cls}
                               hover:scale-[1.02] hover:shadow-lg transition-all duration-300`}>
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${cls}
                                   flex items-center justify-center mb-4 shadow-inner`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* ── DUAL PORTAL CTA ── */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Admin card */}
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass rounded-3xl p-8 border border-orange-500/20
                       bg-gradient-to-br from-orange-500/10 to-red-600/5
                       hover:border-orange-500/40 transition-all duration-300">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600
                            flex items-center justify-center mb-5 shadow-lg shadow-orange-500/30">
              <ShieldCheckIcon className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-black text-white mb-2">Admin / HOD Portal</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              Upload mark sheets, select sheets, run analysis, push reports to all teachers,
              and manage user accounts — all from one dashboard.
            </p>
            <Link to="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm
                         bg-gradient-to-r from-orange-500 to-red-600 text-white
                         hover:shadow-lg hover:shadow-orange-500/30 hover:scale-[1.02]
                         transition-all duration-200">
              Admin Login <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </motion.div>

          {/* Teacher card */}
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }} viewport={{ once: true }}
            className="glass rounded-3xl p-8 border border-blue-500/20
                       bg-gradient-to-br from-blue-500/10 to-violet-600/5
                       hover:border-blue-500/40 transition-all duration-300">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600
                            flex items-center justify-center mb-5 shadow-lg shadow-blue-500/30">
              <AcademicCapIcon className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-black text-white mb-2">Teacher / Mentor Portal</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              View pushed class reports, drill into individual student performance cards,
              identify critical students, and download PDF reports for parents.
            </p>
            <Link to="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm
                         bg-gradient-to-r from-blue-500 to-violet-600 text-white
                         hover:shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02]
                         transition-all duration-200">
              Teacher Login <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      <footer className="relative z-10 text-center py-6 border-t border-white/5 space-y-1">
        <p className="text-slate-600 text-xs">AnalytiData Student Analytics &middot; Built with FastAPI + React &middot; &copy; {new Date().getFullYear()}</p>
        <p className="text-slate-700 text-xs">Developed by <span className="text-slate-400 font-semibold">Srinidhi S Joshi</span></p>
      </footer>
    </div>
  )
}
