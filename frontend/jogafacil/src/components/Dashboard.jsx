import { useState, useEffect } from 'react'
import { Grid, Paper, Typography, Box, CircularProgress, Alert } from '@mui/material'
import { People, Groups, Person, CalendarMonth } from '@mui/icons-material'
import { studentsApi, teamsApi, coachesApi, scheduleApi } from '../services/api'
import { useAcademy } from '../context/AcademyContext'

const StatCard = ({ title, value, icon: Icon, color, loading }) => (
  <Paper sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
    <Box sx={{ bgcolor: color, p: 2, borderRadius: 2, color: 'white' }}>
      <Icon fontSize="large" />
    </Box>
    <Box>
      <Typography variant="h4" fontWeight="bold">
        {loading ? <CircularProgress size={28} /> : value}
      </Typography>
      <Typography color="text.secondary">{title}</Typography>
    </Box>
  </Paper>
)

export default function Dashboard() {
  const { academy } = useAcademy()
  const [stats, setStats] = useState({ students: 0, teams: 0, coaches: 0, schedule: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [studentsData, teamsData, coachesData, scheduleData] = await Promise.all([
          studentsApi.getAll(academy),
          teamsApi.getAll(academy),
          coachesApi.getAll(academy),
          scheduleApi.getAll(academy)
        ])
        setStats({
          students: (studentsData.students || []).length,
          teams: (teamsData.teams || []).length,
          coaches: (coachesData.coaches || []).length,
          schedule: (scheduleData.schedule || []).length
        })
        setError(null)
      } catch (err) {
        setError('Error al cargar métricas: ' + err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [academy])

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        Panel de Control
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!academy && <Alert severity="warning" sx={{ mb: 2 }}>Selecciona una academia en el encabezado para ver las métricas.</Alert>}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Alumnos" value={stats.students} icon={People} color="#2e7d32" loading={loading} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Equipos" value={stats.teams} icon={Groups} color="#1976d2" loading={loading} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Entrenadores" value={stats.coaches} icon={Person} color="#ed6c02" loading={loading} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Eventos" value={stats.schedule} icon={CalendarMonth} color="#d32f2f" loading={loading} />
        </Grid>
      </Grid>
    </Box>
  )
}
