import { Grid, Paper, Typography, Box } from '@mui/material'
import { People, Groups, CalendarMonth, Payments } from '@mui/icons-material'

const StatCard = ({ title, value, icon: Icon, color }) => (
  <Paper sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
    <Box sx={{ bgcolor: color, p: 2, borderRadius: 2, color: 'white' }}>
      <Icon fontSize="large" />
    </Box>
    <Box>
      <Typography variant="h4" fontWeight="bold">{value}</Typography>
      <Typography color="text.secondary">{title}</Typography>
    </Box>
  </Paper>
)

export default function Dashboard() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        Panel de Control
      </Typography>
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Alumnos" value="156" icon={People} color="#2e7d32" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Equipos" value="12" icon={Groups} color="#1976d2" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Entrenamientos" value="24" icon={CalendarMonth} color="#ed6c02" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Pagos Pendientes" value="8" icon={Payments} color="#d32f2f" />
        </Grid>
      </Grid>
    </Box>
  )
}
