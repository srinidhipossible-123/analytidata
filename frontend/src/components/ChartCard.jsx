import { useState, lazy, Suspense } from 'react'
import { motion } from 'framer-motion'
import { ArrowsPointingOutIcon, EyeIcon } from '@heroicons/react/24/outline'

// Lazy load Plotly to keep initial bundle small
const Plot = lazy(() => import('react-plotly.js'))

const PLOTLY_CONFIG = {
  displayModeBar: false,   // hidden in card view; shown in fullscreen modal
  displaylogo: false,
  responsive: true,
}

// Safe for ALL chart types
const BASE_OVERRIDE = {
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor:  'rgba(0,0,0,0)',
  font:          { color: '#94a3b8', size: 10, family: 'Inter' },
  margin:        { t: 10, b: 30, l: 40, r: 10 },
  legend:        { bgcolor: 'rgba(0,0,0,0)', font: { color: '#94a3b8', size: 10 } },
  showlegend:    false,
}

// Only for axis-based charts
const AXIS_OVERRIDE = {
  xaxis: { gridcolor: 'rgba(255,255,255,0.05)', zerolinecolor: 'rgba(255,255,255,0.08)', tickfont: { size: 9 } },
  yaxis: { gridcolor: 'rgba(255,255,255,0.05)', zerolinecolor: 'rgba(255,255,255,0.08)', tickfont: { size: 9 } },
}

// Types that must NOT get xaxis/yaxis overrides
const NO_AXIS_TYPES = new Set(['pie', 'heatmap'])

// Taller height for square/dense charts
const CHART_HEIGHT = {
  heatmap:   300,
  box:       280,
  histogram: 240,
  default:   240,
}

const TYPE_BADGE = {
  bar:       'badge-blue',
  line:      'badge-cyan',
  pie:       'badge-violet',
  histogram: 'badge-green',
  heatmap:   'badge-pink',
  box:       'badge-yellow',
  scatter:   'badge-orange',
}

function buildCardLayout(chart, expanded) {
  const h = expanded
    ? 420
    : (CHART_HEIGHT[chart.type] || CHART_HEIGHT.default)

  return {
    ...(chart.data.layout || {}),
    ...BASE_OVERRIDE,
    ...(NO_AXIS_TYPES.has(chart.type) ? {} : AXIS_OVERRIDE),
    title:    undefined,
    autosize: false,
    height:   h,
    width:    undefined,  // let CSS control width
  }
}

export default function ChartCard({ chart, onPreview }) {
  const [expanded, setExpanded] = useState(false)

  if (!chart?.data) return null

  const data   = chart.data.data || []
  const badge  = TYPE_BADGE[chart.type] || 'badge-blue'
  const layout = buildCardLayout(chart, expanded)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl overflow-hidden group"
    >
      {/* ── Card header ── */}
      <div className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`badge ${badge} flex-shrink-0 text-[10px]`}>{chart.type}</span>
          <span className="text-xs font-medium text-slate-300 truncate">{chart.title}</span>
        </div>

        {/* Action buttons — visible on hover */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100
                        transition-opacity duration-200 flex-shrink-0 ml-2">
          {onPreview && (
            <button
              onClick={() => onPreview(chart)}
              title="Preview fullscreen"
              className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg
                         bg-blue-500/10 hover:bg-blue-500/25 border border-blue-500/25
                         text-blue-300 transition-all duration-200"
            >
              <EyeIcon className="w-3 h-3" />
              <span className="hidden sm:inline">Preview</span>
            </button>
          )}

          <button
            onClick={() => setExpanded(e => !e)}
            title={expanded ? 'Collapse' : 'Expand'}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500
                       hover:text-white transition-all duration-200"
          >
            <ArrowsPointingOutIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Plot ── */}
      <div className="w-full overflow-hidden">
        <Suspense fallback={
          <div className="skeleton rounded-none" style={{ height: layout.height }} />
        }>
          <Plot
            data={data}
            layout={layout}
            config={PLOTLY_CONFIG}
            style={{ width: '100%' }}
            useResizeHandler
          />
        </Suspense>
      </div>
    </motion.div>
  )
}
