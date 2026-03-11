import { createContext, useContext, useState, useEffect } from 'react'
import { academiesApi } from '../services/api'

const AcademyContext = createContext()

export function AcademyProvider({ children }) {
  const [academy, setAcademy] = useState(() => {
    return localStorage.getItem('selectedAcademy') || ''
  })
  const [academies, setAcademies] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await academiesApi.getAll()
        setAcademies(data.academies || [])
      } catch (err) {
        console.error('Error loading academies:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const selectAcademy = (value) => {
    setAcademy(value)
    localStorage.setItem('selectedAcademy', value)
  }

  return (
    <AcademyContext.Provider value={{ academy, selectAcademy, academies, loading }}>
      {children}
    </AcademyContext.Provider>
  )
}

export function useAcademy() {
  const context = useContext(AcademyContext)
  if (!context) throw new Error('useAcademy must be used within AcademyProvider')
  return context
}
