import { motion } from 'framer-motion'

const colorConfig = {
  blue:   { bg: 'from-blue-500/20 to-blue-500/5',    border: 'border-blue-500/20',   text: 'text-blue-400',   bar: 'from-blue-500 to-blue-400' },
  violet: { bg: 'from-violet-500/20 to-violet-500/5', border: 'border-violet-500/20', text: 'text-violet-400', bar: 'from-violet-500 to-violet-400' },
  cyan:   { bg: 'from-cyan-500/20 to-cyan-500/5',     border: 'border-cyan-500/20',   text: 'text-cyan-400',   bar: 'from-cyan-500 to-cyan-400' },
  green:  { bg: 'from-emerald-500/20 to-emerald-500/5', border: 'border-emerald-500/20', text: 'text-emerald-400', bar: 'from-emerald-500 to-emerald-400' },
  yellow: { bg: 'from-amber-500/20 to-amber-500/5',   border: 'border-amber-500/20',  text: 'text-amber-400',  bar: 'from-amber-500 to-amber-400' },
  pink:   { bg: 'from-pink-500/20 to-pink-500/5',     border: 'border-pink-500/20',   text: 'text-pink-400',   bar: 'from-pink-500 to-pink-400' },
}

export default function StatCard({ label, value, color = 'blue', icon: Icon, loading }) {
  const cfg = colorConfig[color] || colorConfig.blue

  return (
    <div className={`glass p-5 rounded-2xl border bg-gradient-to-br ${cfg.bg} ${cfg.border} transition-all hover:scale-[1.02] duration-300`}>
      {loading ? (
        <div className="space-y-3">
          <div className="skeleton h-4 w-16 rounded" />
          <div className="skeleton h-8 w-24 rounded" />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-2">
            {Icon && <Icon className={`w-4 h-4 ${cfg.text}`} />}
            <p className="text-xs text-slate-400 font-medium">{label}</p>
          </div>
          <motion.p
            className={`text-3xl font-black ${cfg.text}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}>
            {value ?? '—'}
          </motion.p>
        </>
      )}
    </div>
  )
}
