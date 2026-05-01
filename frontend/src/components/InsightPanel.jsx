import { motion, AnimatePresence } from 'framer-motion'
import { SparklesIcon, LightBulbIcon, ExclamationTriangleIcon, CheckCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline'

const severityConfig = {
  info:    { icon: InformationCircleIcon, bg: 'from-blue-500/10 to-blue-500/5',    border: 'border-blue-500/20',   text: 'text-blue-400',   badge: 'badge-blue' },
  warning: { icon: ExclamationTriangleIcon, bg: 'from-amber-500/10 to-amber-500/5', border: 'border-amber-500/20', text: 'text-amber-400',  badge: 'badge-yellow' },
  success: { icon: CheckCircleIcon,       bg: 'from-emerald-500/10 to-emerald-500/5', border: 'border-emerald-500/20', text: 'text-emerald-400', badge: 'badge-green' },
}

const typeColors = {
  trend:          'badge-cyan',
  anomaly:        'badge-red',
  correlation:    'badge-violet',
  summary:        'badge-blue',
  recommendation: 'badge-green',
}

export default function InsightPanel({ insights = [], loading }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1,2,3,4].map(i => (
          <div key={i} className="glass rounded-xl p-4 space-y-2">
            <div className="skeleton h-4 w-32 rounded" />
            <div className="skeleton h-3 w-full rounded" />
            <div className="skeleton h-3 w-4/5 rounded" />
          </div>
        ))}
        <div className="text-center text-xs text-slate-500 flex items-center justify-center gap-2 pt-2">
          <SparklesIcon className="w-4 h-4 animate-pulse" /> Generating AI insights…
        </div>
      </div>
    )
  }

  if (!insights.length) {
    return (
      <div className="glass rounded-xl p-8 text-center text-slate-500">
        <LightBulbIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No insights yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {insights.map((ins, i) => {
          const cfg  = severityConfig[ins.severity] || severityConfig.info
          const Icon = cfg.icon
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`glass p-4 rounded-xl border bg-gradient-to-br ${cfg.bg} ${cfg.border}`}
            >
              <div className="flex items-start gap-3">
                <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cfg.text}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="text-sm font-semibold text-slate-200">{ins.title}</p>
                    <span className={`badge text-xs ${typeColors[ins.type] || 'badge-blue'}`}>{ins.type}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{ins.insight}</p>
                </div>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
