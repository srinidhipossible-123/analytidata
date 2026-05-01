import { useEffect, useRef, lazy, Suspense } from 'react'
import { motion } from 'framer-motion'
import {
  XMarkIcon,
  ArrowDownTrayIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'

const Plot = lazy(() => import('react-plotly.js'))

const PLOTLY_CONFIG = {
  displayModeBar: true,
  displaylogo: false,
  modeBarButtonsToRemove: ['sendDataToCloud', 'editInChartStudio', 'lasso2d'],
  responsive: true,
  toImageButtonOptions: {
    format: 'png',
    filename: 'datalens_chart',
    scale: 2,
  },
}

// Base overrides safe for ALL chart types
const BASE_OVERRIDE = {
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor:  'rgba(0,0,0,0)',
  font:          { color: '#94a3b8', size: 13, family: 'Inter' },
  legend:        { bgcolor: 'rgba(0,0,0,0)', font: { color: '#94a3b8' } },
  margin:        { t: 60, b: 50, l: 60, r: 40 },
}

// Extra overrides ONLY for chart types that use x/y axes
const AXIS_OVERRIDE = {
  xaxis: { gridcolor: 'rgba(255,255,255,0.06)', zerolinecolor: 'rgba(255,255,255,0.12)' },
  yaxis: { gridcolor: 'rgba(255,255,255,0.06)', zerolinecolor: 'rgba(255,255,255,0.12)' },
}

// Types that must NOT receive xaxis/yaxis overrides
const NO_AXIS_TYPES = new Set(['pie', 'heatmap'])

const TYPE_COLOR = {
  bar:       'bg-blue-500/20 text-blue-300 border-blue-500/30',
  line:      'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  pie:       'bg-violet-500/20 text-violet-300 border-violet-500/30',
  histogram: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  heatmap:   'bg-pink-500/20 text-pink-300 border-pink-500/30',
  box:       'bg-amber-500/20 text-amber-300 border-amber-500/30',
  scatter:   'bg-orange-500/20 text-orange-300 border-orange-500/30',
}

function buildLayout(chart, height) {
  const base = {
    ...(chart.data.layout || {}),
    ...BASE_OVERRIDE,
    ...(NO_AXIS_TYPES.has(chart.type) ? {} : AXIS_OVERRIDE),
    title: { text: chart.title, font: { color: '#e2e8f0', size: 16, family: 'Inter' } },
    autosize: false,
    height,
  }
  return base
}

export default function GraphPreviewModal({ chart, onClose }) {
  const plotRef = useRef(null)

  // ESC key closes the modal
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (!chart?.data) return null

  const data      = chart.data.data || []
  const typeColor = TYPE_COLOR[chart.type] || 'bg-slate-500/20 text-slate-300 border-slate-500/30'

  // Chart height: subtract header (~72px) + footer (~40px) + padding (~32px) from viewport
  const chartH = Math.max(400, window.innerHeight - 200)
  const layout = buildLayout(chart, chartH)

  const handleDownload = () => {
    if (plotRef.current) {
      const Plotly = window.Plotly
      if (Plotly) {
        Plotly.downloadImage(plotRef.current.el, {
          format: 'png', filename: `datalens_${chart.type}_${chart.title}`, scale: 2,
        })
      } else {
        // Fallback: click the camera icon in the modebar
        const btn = document.querySelector('.modebar-btn[data-title="Download plot as a png"]')
        if (btn) btn.click()
      }
    }
  }

  return (
    <>
      {/* Backdrop — separate from modal so AnimatePresence is handled by parent */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal panel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 48 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 24 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        className="fixed inset-4 md:inset-8 lg:inset-10 z-50 flex flex-col
                   bg-[#0a0f1e]/96 backdrop-blur-2xl border border-white/10 rounded-3xl
                   shadow-[0_0_80px_rgba(59,130,246,0.18),0_0_160px_rgba(139,92,246,0.10)]
                   overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4
                        border-b border-white/[0.07] bg-white/[0.02] flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* Pulsing live dot */}
            <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
            </span>

            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                              text-xs font-semibold border flex-shrink-0 ${typeColor}`}>
              <ChartBarIcon className="w-3 h-3" />
              {chart.type?.toUpperCase()}
            </span>

            <h2 className="text-slate-100 font-semibold text-sm md:text-base
                           leading-tight truncate">
              {chart.title}
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl
                         bg-blue-500/10 hover:bg-blue-500/25 border border-blue-500/30
                         text-blue-300 transition-all duration-200"
            >
              <ArrowDownTrayIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download PNG</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10
                         text-slate-400 hover:text-white transition-all duration-200"
              aria-label="Close preview"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Chart area — explicit pixel height so Plotly renders correctly ── */}
        <div className="flex-1 overflow-hidden bg-transparent"
             style={{ minHeight: 0 }}>
          <Suspense fallback={
            <div className="flex items-center justify-center" style={{ height: chartH }}>
              <div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500
                              rounded-full animate-spin" />
            </div>
          }>
            <Plot
              ref={plotRef}
              data={data}
              layout={layout}
              config={PLOTLY_CONFIG}
              style={{ width: '100%', height: `${chartH}px` }}
              useResizeHandler={false}
            />
          </Suspense>
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-2 flex items-center justify-between
                        border-t border-white/[0.05] flex-shrink-0">
          <p className="text-xs text-slate-700">
            Use the modebar to zoom, pan, or reset the view
          </p>
          <p className="text-xs text-slate-600">
            Press{' '}
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-slate-400
                            font-mono text-[10px]">
              ESC
            </kbd>{' '}
            to close
          </p>
        </div>
      </motion.div>
    </>
  )
}
