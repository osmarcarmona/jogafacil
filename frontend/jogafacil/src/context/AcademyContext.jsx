import { createContext, useContext, useState, useEffect } from 'react'
import { academiesApi } from '../services/api'
import { useAuth } from './AuthContext'

const AcademyContext = createContext()

export function AcademyProvider({ children }) {
  const { user } = useAuth()
  const [academy, setAcademy] = useState(() => {
    return localStorage.getItem('selectedAcademy') || ''
  })
  const [academies, setAcademies] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await academiesApi.getAll()
        let allAcademies = data.academies || []

        // Filter to only the user's allowed academies
        if (user?.academies && user.academies.length > 0) {
          allAcademies = allAcademies.filter(a => {
            const academyId = a.id || a
            const academyName = a.name || a
            return user.academies.includes(academyId) || user.academies.includes(academyName)
          })
        }

        setAcademies(allAcademies)

        // Auto-select if user only has one academy and none is selected
        if (!academy && allAcademies.length === 1) {
          const autoId = allAcademies[0].id || allAcademies[0]
          setAcademy(autoId)
          localStorage.setItem('selectedAcademy', autoId)
        }

        // Clear selection if it's not in the allowed list
        if (academy && allAcademies.length > 0) {
          const allowed = allAcademies.some(a => (a.id || a) === academy || (a.name || a) === academy)
          if (!allowed) {
            const fallback = allAcademies[0].id || allAcademies[0]
            setAcademy(fallback)
            localStorage.setItem('selectedAcademy', fallback)
          }
        }
      } catch (err) {
        console.error('Error loading academies:', err)
      } finally {
        setLoading(false)
      }
    }
    if (user) load()
  }, [user])

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
