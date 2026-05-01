import { useCallback, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CloudArrowUpIcon, DocumentIcon, XMarkIcon,
  TableCellsIcon, ChevronRightIcon, TrashIcon
} from '@heroicons/react/24/outline'
import { useData } from '../context/DataContext'
import Sidebar from '../components/Sidebar'
import api from '../api/client'
import toast from 'react-hot-toast'

export default function Upload() {
  const { setCurrentFile, setCurrentSheet, setPreview, reset } = useData()
  const navigate = useNavigate()
  const [file,       setFile]       = useState(null)
  const [uploading,  setUploading]  = useState(false)
  const [uploaded,   setUploaded]   = useState(null)   // { file_id, filename, sheets }
  const [activeSheet,setActiveSheet]= useState(null)
  const [preview,    setPreviewLocal]= useState(null)
  const [history,    setHistory]    = useState([])
  const [histLoading,setHistLoading]= useState(true)

  useEffect(() => {
    api.get('/api/files').then(r => setHistory(r.data)).catch(() => {}).finally(() => setHistLoading(false))
  }, [])

  const onDrop = useCallback(accepted => {
    if (accepted.length) setFile(accepted[0])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
              'application/vnd.ms-excel': ['.xls'],
              'text/csv': ['.csv'] },
    maxFiles: 1,
  })

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await api.post('/api/upload', form)
      setUploaded(res.data)
      setActiveSheet(res.data.sheets[0])
      toast.success(`"${res.data.filename}" uploaded!`)
      fetchPreview(res.data.file_id, res.data.sheets[0])
      setHistory(h => [res.data, ...h])
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const fetchPreview = async (file_id, sheet) => {
    try {
      const res = await api.get(`/api/files/${file_id}/preview`, { params: { sheet } })
      setPreviewLocal(res.data)
    } catch {
      setPreviewLocal(null)
    }
  }

  const handleAnalyze = () => {
    setCurrentFile(uploaded)
    setCurrentSheet(activeSheet)
    setPreview(preview)
    navigate('/dashboard')
  }

  const handleHistorySelect = async (f) => {
    setCurrentFile(f)
    setCurrentSheet(f.sheets[0])
    const res = await api.get(`/api/files/${f.file_id}/preview`, { params: { sheet: f.sheets[0] } })
    setPreview(res.data)
    navigate('/dashboard')
  }

  const handleDelete = async (file_id, e) => {
    e.stopPropagation()
    try {
      await api.delete(`/api/files/${file_id}`)
      setHistory(h => h.filter(f => f.file_id !== file_id))
      toast.success('File deleted')
    } catch {
      toast.error('Delete failed')
    }
  }

  return (
    <div className="flex min-h-screen bg-navy-900">
      <Sidebar />
      <main className="flex-1 p-8 ml-16 md:ml-60">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="text-3xl font-bold mb-1">Upload Data</h1>
            <p className="text-slate-400">Upload an Excel or CSV file to begin analysis</p>
          </motion.div>

          {/* Dropzone */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div {...getRootProps()} id="dropzone"
              className={`glass rounded-3xl p-12 text-center cursor-pointer transition-all duration-300 border-2 border-dashed
                ${isDragActive ? 'border-blue-500 bg-blue-500/10 glow-blue' : 'border-white/10 hover:border-blue-500/50 hover:bg-white/5'}`}>
              <input {...getInputProps()} id="file-input" />
              <motion.div animate={isDragActive ? { scale: 1.1 } : { scale: 1 }} transition={{ type: 'spring' }}>
                <CloudArrowUpIcon className={`w-16 h-16 mx-auto mb-4 ${isDragActive ? 'text-blue-400' : 'text-slate-500'}`} />
              </motion.div>
              {file ? (
                <div>
                  <p className="text-blue-400 font-semibold text-lg">{file.name}</p>
                  <p className="text-slate-500 text-sm mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div>
                  <p className="text-xl font-semibold mb-2">{isDragActive ? 'Drop it here!' : 'Drag & Drop your file'}</p>
                  <p className="text-slate-500 text-sm">or click to browse — .xlsx, .xls, .csv supported</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Upload controls */}
          <AnimatePresence>
            {file && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }} className="mt-4 flex gap-3">
                <button id="upload-btn" onClick={handleUpload} disabled={uploading} className="btn-primary flex items-center gap-2">
                  {uploading
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Uploading…</>
                    : <><CloudArrowUpIcon className="w-4 h-4" /> Upload File</>}
                </button>
                <button onClick={() => { setFile(null); setUploaded(null) }} className="btn-secondary flex items-center gap-1">
                  <XMarkIcon className="w-4 h-4" /> Clear
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sheet selector + preview */}
          <AnimatePresence>
            {uploaded && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8 space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <TableCellsIcon className="w-5 h-5 text-blue-400" />
                  <span className="text-sm text-slate-400">Sheets:</span>
                  {uploaded.sheets.map(s => (
                    <button key={s} id={`sheet-${s}`}
                      onClick={() => { setActiveSheet(s); fetchPreview(uploaded.file_id, s) }}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        activeSheet === s ? 'bg-blue-500 text-white' : 'glass text-slate-400 hover:text-white'}`}>
                      {s}
                    </button>
                  ))}
                </div>

                {preview && (
                  <div className="glass rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-300">
                        Preview — {preview.total_rows} rows × {preview.columns.length} columns
                      </span>
                      <button id="analyze-btn" onClick={handleAnalyze} className="btn-primary text-sm py-1.5 px-4 flex items-center gap-1">
                        Analyze <ChevronRightIcon className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="overflow-x-auto max-h-72">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-white/5">
                            {preview.columns.map(c => (
                              <th key={c} className="px-3 py-2 text-left text-slate-400 font-medium whitespace-nowrap">{c}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {preview.rows.map((row, i) => (
                            <tr key={i} className="border-t border-white/5 hover:bg-white/5">
                              {preview.columns.map(c => (
                                <td key={c} className="px-3 py-2 text-slate-300 whitespace-nowrap max-w-[150px] truncate">{row[c]}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* History */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-12">
            <h2 className="text-lg font-semibold mb-4">Recent Files</h2>
            {histLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="skeleton h-14 rounded-xl" />)}
              </div>
            ) : history.length === 0 ? (
              <div className="glass rounded-xl p-8 text-center text-slate-500">No files uploaded yet</div>
            ) : (
              <div className="space-y-2">
                {history.map(f => (
                  <div key={f.file_id} onClick={() => handleHistorySelect(f)}
                    className="glass rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-white/10 transition-all group">
                    <div className="flex items-center gap-3">
                      <DocumentIcon className="w-5 h-5 text-blue-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-200">{f.filename}</p>
                        <p className="text-xs text-slate-500">{f.sheets?.join(', ')} · {(f.size/1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ChevronRightIcon className="w-4 h-4 text-slate-600 group-hover:text-blue-400 transition-colors" />
                      <button onClick={e => handleDelete(f.file_id, e)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <TrashIcon className="w-4 h-4 text-red-400 hover:text-red-300" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  )
}
