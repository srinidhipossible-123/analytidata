import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TableCellsIcon, ChartBarIcon, SparklesIcon,
  ExclamationTriangleIcon, ArrowPathIcon,
  ChevronDownIcon, ChevronUpIcon, FunnelIcon,
} from '@heroicons/react/24/outline'
import { useData } from '../context/DataContext'
import Sidebar from '../components/Sidebar'
import StatCard from '../components/StatCard'
import ChartCard from '../components/ChartCard'
import InsightPanel from '../components/InsightPanel'
import GraphPreviewModal from '../components/GraphPreviewModal'
import api from '../api/client'
import toast from 'react-hot-toast'

const container = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }
const cardAnim  = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }

// All chart type filter options
const CHART_TYPES = ['all', 'bar', 'line', 'pie', 'histogram', 'heatmap', 'box', 'scatter']

const TYPE_LABEL = {
  all: '✦ All',
  bar: '▊ Bar',
  line: '〜 Line',
  pie: '◔ Pie',
  histogram: '▬ Histogram',
  heatmap: '⊞ Heatmap',
  box: '□ Box',
  scatter: '· Scatter',
}

const TYPE_ACTIVE = {
  bar:       'bg-blue-500/25 text-blue-300 border-blue-500/40',
  line:      'bg-cyan-500/25 text-cyan-300 border-cyan-500/40',
  pie:       'bg-violet-500/25 text-violet-300 border-violet-500/40',
  histogram: 'bg-emerald-500/25 text-emerald-300 border-emerald-500/40',
  heatmap:   'bg-pink-500/25 text-pink-300 border-pink-500/40',
  box:       'bg-amber-500/25 text-amber-300 border-amber-500/40',
  scatter:   'bg-orange-500/25 text-orange-300 border-orange-500/40',
  all:       'bg-blue-500/15 text-blue-200 border-blue-500/30',
}

export default function Dashboard() {
  const { currentFile, currentSheet, stats, setStats, charts, setCharts, insights, setInsights } = useData()
  const navigate  = useNavigate()
  const [loading, setLoading]        = useState({ stats: false, charts: false, insights: false })
  const [expanded, setExpanded]      = useState({})
  const [activeFilter, setActiveFilter] = useState('all')
  const [filterOpen, setFilterOpen]  = useState(false)
  const [previewChart, setPreviewChart] = useState(null)

  const fileId = currentFile?.file_id
  const sheet  = currentSheet

  useEffect(() => {
    if (!fileId) { navigate('/upload'); return }
    if (!stats)         loadStats()
    if (!charts.length) loadCharts()
    if (!insights.length) loadInsights()
  }, [fileId, sheet])

  const loadStats = async () => {
    setLoading(l => ({ ...l, stats: true }))
    try {
      const res = await api.get(`/api/analysis/${fileId}`, { params: { sheet } })
      setStats(res.data)
    } catch { toast.error('Failed to load statistics') }
    finally { setLoading(l => ({ ...l, stats: false })) }
  }

  const loadCharts = async () => {
    setLoading(l => ({ ...l, charts: true }))
    try {
      const res = await api.get(`/api/charts/${fileId}`, { params: { sheet } })
      setCharts(res.data.charts)
    } catch { toast.error('Failed to load charts') }
    finally { setLoading(l => ({ ...l, charts: false })) }
  }

  const loadInsights = async () => {
    setLoading(l => ({ ...l, insights: true }))
    try {
      const res = await api.get(`/api/insights/${fileId}`, { params: { sheet } })
      setInsights(res.data.insights)
    } catch { toast.error('Failed to load insights') }
    finally { setLoading(l => ({ ...l, insights: false })) }
  }

  const shape    = stats?.shape || {}
  const columns  = stats?.columns || {}
  const missing  = stats?.missing || {}
  const outliers = stats?.outliers || {}

  const numericCols  = Object.entries(columns).filter(([,v]) => v.type === 'numeric')
  const catCols      = Object.entries(columns).filter(([,v]) => v.type === 'categorical')
  const totalMissing = Object.values(missing).reduce((s,v) => s + v.count, 0)

  const typeColor = t => t === 'numeric' ? 'badge-blue' : t === 'categorical' ? 'badge-violet' : 'badge-green'

  // Available filter types derived from current charts
  const availableTypes = useMemo(() => {
    const types = new Set(charts.map(c => c.type))
    return CHART_TYPES.filter(t => t === 'all' || types.has(t))
  }, [charts])

  // Filtered chart list
  const filteredCharts = useMemo(() => {
    if (activeFilter === 'all') return charts
    return charts.filter(c => c.type === activeFilter)
  }, [charts, activeFilter])

  return (
    <div className="flex min-h-screen bg-navy-900">
      <Sidebar />
      <main className="flex-1 p-8 ml-16 md:ml-60 max-w-screen-2xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-slate-400 text-sm mt-1">{currentFile?.filename} · {sheet}</p>
          </div>
          <button onClick={() => { loadStats(); loadCharts(); loadInsights() }}
            className="btn-secondary flex items-center gap-2 text-sm">
            <ArrowPathIcon className="w-4 h-4" /> Refresh
          </button>
        </div>

        {/* Summary stat cards */}
        <motion.div variants={container} initial="hidden" animate="visible"
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Rows',    value: shape.rows?.toLocaleString() ?? '—', color: 'blue',   icon: TableCellsIcon },
            { label: 'Columns',       value: shape.cols ?? '—',                    color: 'violet', icon: ChartBarIcon },
            { label: 'Numeric Cols',  value: numericCols.length,                  color: 'cyan',   icon: ChartBarIcon },
            { label: 'Missing Values',value: totalMissing,                         color: totalMissing > 0 ? 'yellow' : 'green', icon: ExclamationTriangleIcon },
          ].map((s, i) => (
            <motion.div key={i} variants={cardAnim}>
              <StatCard {...s} loading={loading.stats} />
            </motion.div>
          ))}
        </motion.div>

        {/* Charts + Insights layout */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">

          {/* Charts section */}
          <div className="xl:col-span-2 space-y-4">

            {/* Charts header with filter dropdown */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <ChartBarIcon className="w-5 h-5 text-blue-400" /> Auto-Generated Charts
              </h2>

              {/* Filter dropdown */}
              {!loading.charts && charts.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setFilterOpen(o => !o)}
                    className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl
                               glass border border-white/10 hover:bg-white/10
                               text-slate-300 hover:text-white transition-all duration-200"
                  >
                    <FunnelIcon className="w-4 h-4 text-blue-400" />
                    <span>
                      {TYPE_LABEL[activeFilter] || activeFilter}
                    </span>
                    <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${filterOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {filterOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-52 z-20
                                   bg-[#0d1526]/95 backdrop-blur-2xl border border-white/10
                                   rounded-2xl shadow-2xl shadow-black/50 overflow-hidden"
                      >
                        <div className="p-2 space-y-0.5">
                          {availableTypes.map(type => (
                            <button
                              key={type}
                              onClick={() => { setActiveFilter(type); setFilterOpen(false) }}
                              className={`w-full text-left px-3 py-2 rounded-xl text-sm
                                          transition-all duration-150 border
                                          ${activeFilter === type
                                            ? `${TYPE_ACTIVE[type]}`
                                            : 'text-slate-400 border-transparent hover:bg-white/8 hover:text-slate-200'
                                          }`}
                            >
                              {TYPE_LABEL[type] || type}
                            </button>
                          ))}
                        </div>
                        {/* Count indicator */}
                        <div className="px-4 py-2 border-t border-white/5 text-xs text-slate-600">
                          {filteredCharts.length} chart{filteredCharts.length !== 1 ? 's' : ''} shown
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Filter chips — quick-access row */}
            {!loading.charts && charts.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-wrap gap-2"
              >
                {availableTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => setActiveFilter(type)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all duration-200
                                ${activeFilter === type
                                  ? TYPE_ACTIVE[type]
                                  : 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-300 hover:bg-white/10'}`}
                  >
                    {TYPE_LABEL[type] || type}
                  </button>
                ))}
              </motion.div>
            )}

            {/* Chart grid */}
            {loading.charts ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1,2,3,4].map(i => <div key={i} className="skeleton h-64 rounded-2xl" />)}
              </div>
            ) : filteredCharts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass rounded-2xl p-10 text-center text-slate-500"
              >
                {charts.length === 0 ? 'No charts generated' : `No ${activeFilter} charts found`}
              </motion.div>
            ) : (
              <motion.div
                layout
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <AnimatePresence mode="popLayout">
                  {filteredCharts.map((c, i) => (
                    <motion.div
                      key={`${c.type}-${c.title}-${i}`}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.92 }}
                      transition={{ duration: 0.22, delay: i * 0.04 }}
                    >
                      <ChartCard
                        chart={c}
                        onPreview={(chart) => setPreviewChart(chart)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </div>

          {/* AI Insights */}
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <SparklesIcon className="w-5 h-5 text-violet-400" /> AI Insights
            </h2>
            <InsightPanel insights={insights} loading={loading.insights} />
          </div>
        </div>

        {/* Column details accordion */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5">
            <h2 className="text-lg font-semibold">Column Details</h2>
          </div>
          <div className="divide-y divide-white/5">
            {Object.entries(columns).map(([col, s]) => {
              const miss = missing[col] || {}
              const out  = outliers[col] || {}
              const open = expanded[col]
              return (
                <div key={col}>
                  <button onClick={() => setExpanded(e => ({ ...e, [col]: !e[col] }))}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-slate-200">{col}</span>
                      <span className={`badge ${typeColor(s.type)}`}>{s.type}</span>
                      {miss.percentage > 0 && <span className="badge badge-yellow">{miss.percentage}% missing</span>}
                      {out.percentage > 5 && <span className="badge badge-red">{out.percentage}% outliers</span>}
                    </div>
                    {open ? <ChevronUpIcon className="w-4 h-4 text-slate-500" /> : <ChevronDownIcon className="w-4 h-4 text-slate-500" />}
                  </button>
                  <AnimatePresence>
                    {open && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="px-6 pb-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                          {s.type === 'numeric' && [
                            ['Mean',     s.mean],   ['Median', s.median],
                            ['Std Dev',  s.std],    ['Min',    s.min],
                            ['Max',      s.max],    ['Q1/Q3',  `${s.q1} / ${s.q3}`],
                            ['Skewness', s.skewness],['Kurtosis',s.kurtosis],
                          ].map(([k,v]) => (
                            <div key={k} className="glass rounded-xl p-3">
                              <p className="text-xs text-slate-500">{k}</p>
                              <p className="text-sm font-semibold text-slate-200 mt-0.5 truncate">{v}</p>
                            </div>
                          ))}
                          {s.type === 'categorical' && (
                            <>
                              <div className="glass rounded-xl p-3">
                                <p className="text-xs text-slate-500">Unique</p>
                                <p className="text-sm font-semibold text-slate-200">{s.unique_count}</p>
                              </div>
                              <div className="glass rounded-xl p-3">
                                <p className="text-xs text-slate-500">Top Value</p>
                                <p className="text-sm font-semibold text-slate-200 truncate">{s.most_frequent}</p>
                              </div>
                              {Object.entries(s.top_values || {}).slice(0,4).map(([k,v]) => (
                                <div key={k} className="glass rounded-xl p-3">
                                  <p className="text-xs text-slate-500 truncate">{k}</p>
                                  <p className="text-sm font-semibold text-slate-200">{v}</p>
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        </div>

      </main>

      {/* Fullscreen graph preview portal */}
      <AnimatePresence>
        {previewChart && (
          <GraphPreviewModal
            key="preview"
            chart={previewChart}
            onClose={() => setPreviewChart(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
