import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { PlusIcon, TrashIcon, PlayIcon, FunnelIcon } from '@heroicons/react/24/outline'
import { useData } from '../context/DataContext'
import Sidebar from '../components/Sidebar'
import api from '../api/client'
import toast from 'react-hot-toast'

const OPERATORS = [
  { value: 'eq',       label: '= equals' },
  { value: 'ne',       label: '≠ not equals' },
  { value: 'gt',       label: '> greater than' },
  { value: 'lt',       label: '< less than' },
  { value: 'gte',      label: '≥ greater or equal' },
  { value: 'lte',      label: '≤ less or equal' },
  { value: 'contains', label: 'contains (text)' },
  { value: 'not_null', label: 'is not empty' },
  { value: 'is_null',  label: 'is empty' },
]

const AGG_OPS = ['sum','mean','count','min','max']

export default function CustomAnalysis() {
  const { currentFile, currentSheet, stats } = useData()
  const navigate = useNavigate()
  const [cols,       setCols]       = useState([])
  const [selCols,    setSelCols]    = useState([])
  const [filters,    setFilters]    = useState([{ column: '', operator: 'eq', value: '' }])
  const [groupBy,    setGroupBy]    = useState('')
  const [aggCol,     setAggCol]     = useState('')
  const [aggOp,      setAggOp]      = useState('sum')
  const [result,     setResult]     = useState(null)
  const [loading,    setLoading]    = useState(false)

  useEffect(() => {
    if (!currentFile) { navigate('/upload'); return }
    if (stats?.columns) setCols(Object.keys(stats.columns))
  }, [currentFile, stats])

  const addFilter    = () => setFilters(f => [...f, { column: '', operator: 'eq', value: '' }])
  const removeFilter = i  => setFilters(f => f.filter((_,j) => j !== i))
  const updateFilter = (i, key, val) => setFilters(f => f.map((r,j) => j===i ? {...r,[key]:val} : r))

  const toggleCol = col => setSelCols(s => s.includes(col) ? s.filter(c=>c!==col) : [...s, col])

  const runQuery = async () => {
    setLoading(true)
    try {
      const payload = {
        columns: selCols,
        filters: filters.filter(f => f.column),
        group_by:     groupBy  || null,
        aggregation:  groupBy ? aggOp : null,
        agg_column:   groupBy ? aggCol : null,
      }
      const res = await api.post(`/api/custom/${currentFile.file_id}`, payload, {
        params: { sheet: currentSheet }
      })
      setResult(res.data)
      toast.success(`Query returned ${res.data.total} rows`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Query failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-navy-900">
      <Sidebar />
      <main className="flex-1 p-8 ml-16 md:ml-60">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="text-3xl font-bold mb-1">Custom Analysis Builder</h1>
            <p className="text-slate-400">Build SQL-style queries with filters, grouping, and aggregation</p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left panel */}
            <div className="lg:col-span-2 space-y-6">
              {/* Column selector */}
              <div className="glass rounded-2xl p-6">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                  SELECT Columns
                </h2>
                <div className="flex flex-wrap gap-2">
                  {cols.map(col => (
                    <button key={col} onClick={() => toggleCol(col)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        selCols.includes(col)
                          ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                          : 'glass text-slate-400 hover:text-white'}`}>
                      {col}
                    </button>
                  ))}
                  {cols.length === 0 && <p className="text-slate-500 text-sm">Load a file first</p>}
                </div>
                {selCols.length > 0 && (
                  <button onClick={() => setSelCols([])} className="mt-3 text-xs text-slate-500 hover:text-slate-300">
                    Clear selection
                  </button>
                )}
              </div>

              {/* Filters */}
              <div className="glass rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                    <FunnelIcon className="w-4 h-4 inline mr-1" /> WHERE Filters
                  </h2>
                  <button onClick={addFilter} className="btn-secondary text-xs py-1 px-3 flex items-center gap-1">
                    <PlusIcon className="w-3 h-3" /> Add Filter
                  </button>
                </div>
                <div className="space-y-3">
                  {filters.map((f, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <select value={f.column} onChange={e => updateFilter(i, 'column', e.target.value)}
                        className="input-glass flex-1 text-sm">
                        <option value="">-- column --</option>
                        {cols.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <select value={f.operator} onChange={e => updateFilter(i, 'operator', e.target.value)}
                        className="input-glass flex-1 text-sm">
                        {OPERATORS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      {!['not_null','is_null'].includes(f.operator) && (
                        <input value={f.value} onChange={e => updateFilter(i, 'value', e.target.value)}
                          placeholder="value" className="input-glass flex-1 text-sm" />
                      )}
                      <button onClick={() => removeFilter(i)} className="text-red-400 hover:text-red-300 p-1">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Group by */}
              <div className="glass rounded-2xl p-6">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">GROUP BY + Aggregate</h2>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Group By Column</label>
                    <select value={groupBy} onChange={e => setGroupBy(e.target.value)} className="input-glass text-sm">
                      <option value="">None</option>
                      {cols.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Aggregate Column</label>
                    <select value={aggCol} onChange={e => setAggCol(e.target.value)} className="input-glass text-sm" disabled={!groupBy}>
                      <option value="">-- column --</option>
                      {cols.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Operation</label>
                    <select value={aggOp} onChange={e => setAggOp(e.target.value)} className="input-glass text-sm" disabled={!groupBy}>
                      {AGG_OPS.map(o => <option key={o} value={o}>{o.toUpperCase()}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <button id="run-query" onClick={runQuery} disabled={loading || !currentFile}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3">
                {loading
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Running…</>
                  : <><PlayIcon className="w-4 h-4" /> Run Query</>}
              </button>
            </div>

            {/* Query summary */}
            <div className="space-y-4">
              <div className="glass rounded-2xl p-5">
                <h2 className="text-sm font-semibold text-slate-400 mb-3">Query Preview</h2>
                <pre className="text-xs text-blue-300 whitespace-pre-wrap font-mono leading-relaxed">
{`SELECT ${selCols.length ? selCols.join(', ') : '*'}
FROM ${currentFile?.filename || 'file'}
${filters.filter(f=>f.column).length ? `WHERE\n  ${filters.filter(f=>f.column).map(f=>`${f.column} ${f.operator} ${f.value||''}`).join('\n  AND ')}` : ''}
${groupBy ? `GROUP BY ${groupBy}\n${aggOp.toUpperCase()}(${aggCol})` : ''}`}
                </pre>
              </div>
              {result && (
                <div className="glass rounded-2xl p-5">
                  <p className="text-sm text-slate-400 mb-1">Results</p>
                  <p className="text-2xl font-bold gradient-text">{result.total}</p>
                  <p className="text-xs text-slate-500">rows returned</p>
                </div>
              )}
            </div>
          </div>

          {/* Results table */}
          <AnimatePresence>
            {result && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6 glass rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-white/5">
                  <span className="text-sm font-medium">{result.total} rows · {result.columns.length} columns</span>
                </div>
                <div className="overflow-x-auto max-h-80">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-white/5">
                        {result.columns.map(c => <th key={c} className="px-3 py-2 text-left text-slate-400 font-medium whitespace-nowrap">{c}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.map((row, i) => (
                        <tr key={i} className="border-t border-white/5 hover:bg-white/5">
                          {result.columns.map(c => <td key={c} className="px-3 py-2 text-slate-300 whitespace-nowrap">{row[c]}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
