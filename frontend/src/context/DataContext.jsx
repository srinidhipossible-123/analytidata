import { createContext, useContext, useState } from 'react'

const DataContext = createContext()

export function DataProvider({ children }) {
  const [currentFile,   setCurrentFile]   = useState(null)   // { file_id, filename, sheets }
  const [currentSheet,  setCurrentSheet]  = useState('Sheet1')
  const [stats,         setStats]         = useState(null)
  const [charts,        setCharts]        = useState([])
  const [insights,      setInsights]      = useState([])
  const [preview,       setPreview]       = useState(null)   // { columns, rows, total_rows }
  const [queryResult,   setQueryResult]   = useState(null)

  const reset = () => {
    setCurrentFile(null)
    setCurrentSheet('Sheet1')
    setStats(null)
    setCharts([])
    setInsights([])
    setPreview(null)
    setQueryResult(null)
  }

  return (
    <DataContext.Provider value={{
      currentFile,  setCurrentFile,
      currentSheet, setCurrentSheet,
      stats,        setStats,
      charts,       setCharts,
      insights,     setInsights,
      preview,      setPreview,
      queryResult,  setQueryResult,
      reset,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export const useData = () => useContext(DataContext)
