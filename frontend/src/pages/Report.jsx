import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  DocumentArrowDownIcon, TableCellsIcon, SparklesIcon, ChartBarIcon
} from '@heroicons/react/24/outline'
import { useData } from '../context/DataContext'
import Sidebar from '../components/Sidebar'
import InsightPanel from '../components/InsightPanel'
import ChartCard from '../components/ChartCard'
import api from '../api/client'
import toast from 'react-hot-toast'

export default function Report() {
  const { currentFile, currentSheet, stats, charts, insights } = useData()
  const navigate = useNavigate()
  const [dlLoading, setDlLoading] = useState({ pdf: false, excel: false })

  useEffect(() => {
    if (!currentFile) navigate('/upload')
  }, [currentFile])

  const download = async (type) => {
    setDlLoading(l => ({ ...l, [type]: true }))
    try {
      const url  = `/api/export/${currentFile.file_id}/${type}`
      const res  = await api.get(url, {
        params:       { sheet: currentSheet },
        responseType: 'blob',
      })
      const blob  = new Blob([res.data])
      const link  = document.createElement('a')
      link.href   = URL.createObjectURL(blob)
      link.download = type === 'pdf' ? 'datalens_report.pdf' : 'datalens_export.xlsx'
      link.click()
      toast.success(`${type.toUpperCase()} downloaded!`)
    } catch {
      toast.error('Download failed')
    } finally {
      setDlLoading(l => ({ ...l, [type]: false }))
    }
  }

  const shape   = stats?.shape || {}
  const columns = stats?.columns || {}
  const missing = stats?.missing || {}

  return (
    <div className="flex min-h-screen bg-navy-900">
      <Sidebar />
      <main className="flex-1 p-8 ml-16 md:ml-60">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Report</h1>
              <p className="text-slate-400 text-sm mt-1">{currentFile?.filename} · {currentSheet}</p>
            </div>
            <div className="flex gap-3">
              <button id="download-excel" onClick={() => download('excel')} disabled={dlLoading.excel}
                className="btn-secondary flex items-center gap-2 text-sm">
                {dlLoading.excel
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <TableCellsIcon className="w-4 h-4" />}
                Excel
              </button>
              <button id="download-pdf" onClick={() => download('pdf')} disabled={dlLoading.pdf}
                className="btn-primary flex items-center gap-2 text-sm">
                {dlLoading.pdf
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <DocumentArrowDownIcon className="w-4 h-4" />}
                PDF Report
              </button>
            </div>
          </div>

          {/* Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Rows',   value: shape.rows?.toLocaleString() ?? '—' },
              { label: 'Columns',      value: shape.cols ?? '—' },
              { label: 'Numeric',      value: Object.values(columns).filter(c=>c.type==='numeric').length },
              { label: 'Categorical',  value: Object.values(columns).filter(c=>c.type==='categorical').length },
            ].map((s,i) => (
              <motion.div key={i} initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.08 }}
                className="glass rounded-2xl p-5 text-center">
                <p className="text-3xl font-black gradient-text">{s.value}</p>
                <p className="text-xs text-slate-500 mt-1">{s.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Statistics table */}
          <div className="glass rounded-2xl overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
              <ChartBarIcon className="w-5 h-5 text-blue-400" />
              <h2 className="font-semibold">Column Statistics</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white/5 text-slate-400 text-xs">
                    {['Column','Type','Mean/Top','Std/Unique','Min','Max','Missing %'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(columns).map(([col, s], i) => {
                    const miss = missing[col] || {}
                    return (
                      <tr key={col} className={`border-t border-white/5 ${i%2===0 ? '' : 'bg-white/[0.02]'}`}>
                        <td className="px-4 py-3 font-medium text-slate-200">{col}</td>
                        <td className="px-4 py-3">
                          <span className={`badge ${s.type==='numeric'?'badge-blue':s.type==='categorical'?'badge-violet':'badge-green'}`}>{s.type}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-300">{s.type==='numeric' ? s.mean : (Object.keys(s.top_values||{})[0]??'—')}</td>
                        <td className="px-4 py-3 text-slate-300">{s.type==='numeric' ? s.std : s.unique_count}</td>
                        <td className="px-4 py-3 text-slate-400">{s.min ?? '—'}</td>
                        <td className="px-4 py-3 text-slate-400">{s.max ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className={miss.percentage > 0 ? 'text-amber-400' : 'text-emerald-400'}>{miss.percentage ?? 0}%</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Charts grid */}
          {charts.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ChartBarIcon className="w-5 h-5 text-blue-400" /> Charts
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {charts.map((c, i) => <ChartCard key={i} chart={c} />)}
              </div>
            </div>
          )}

          {/* AI Insights */}
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <SparklesIcon className="w-5 h-5 text-violet-400" /> AI Insights
            </h2>
            <InsightPanel insights={insights} loading={false} />
          </div>
        </div>
      </main>
    </div>
  )
}
