import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid
} from '@mui/material'
import { useState } from 'react'
import { LocationOn, AccessTime, Add } from '@mui/icons-material'

export default function Schedule() {
  const [tab, setTab] = useState(0)
  const [openDialog, setOpenDialog] = useState(false)
  const [eventType, setEventType] = useState('Entrenamiento')
  const [formData, setFormData] = useState({
    team: '',
    coach: '',
    date: '',
    time: '',
    place: '',
    opponent: '',
    matchType: 'Local'
  })

  const trainings = [
    { id: 1, team: 'Sub-10 A', day: 'Lunes', time: '16:00 - 17:30', place: 'Campo Principal', coach: 'Laura Fernández' },
    { id: 2, team: 'Sub-12 A', day: 'Lunes', time: '17:30 - 19:00', place: 'Campo Principal', coach: 'Ana Ruiz' },
    { id: 3, team: 'Sub-8', day: 'Martes', time: '16:00 - 17:00', place: 'Campo Auxiliar', coach: 'Roberto Gómez' },
    { id: 4, team: 'Sub-10 B', day: 'Miércoles', time: '16:00 - 17:30', place: 'Campo Principal', coach: 'Miguel Torres' }
  ]

  const games = [
    { id: 1, team: 'Sub-10 A', opponent: 'Club Deportivo', date: '2026-02-22', time: '10:00', place: 'Campo Principal', type: 'Local' },
    { id: 2, team: 'Sub-12 A', opponent: 'Academia FC', date: '2026-02-23', time: '11:00', place: 'Estadio Municipal', type: 'Visitante' },
    { id: 3, team: 'Sub-14', opponent: 'Escuela Fútbol', date: '2026-02-25', time: '16:00', place: 'Campo Principal', type: 'Local' }
  ]

  const teams = ['Sub-8', 'Sub-10 A', 'Sub-10 B', 'Sub-12 A', 'Sub-12 B', 'Sub-14']
  const coaches = ['Roberto Gómez', 'Laura Fernández', 'Miguel Torres', 'Ana Ruiz', 'Carlos Díaz', 'Pedro Morales']
  const places = ['Campo Principal', 'Campo Auxiliar', 'Cancha Techada', 'Estadio Municipal']

  const handleOpenDialog = () => {
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setFormData({
      team: '',
      coach: '',
      date: '',
      time: '',
      place: '',
      opponent: '',
      matchType: 'Local'
    })
  }

  const handleSubmit = () => {
    console.log('Nuevo evento:', { eventType, ...formData })
    handleCloseDialog()
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Calendario
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          sx={{ bgcolor: '#2e7d32' }}
          onClick={handleOpenDialog}
        >
          Nuevo Evento
        </Button>
      </Box>

      <Paper sx={{ mt: 3 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)}>
          <Tab label="Entrenamientos" />
          <Tab label="Partidos" />
        </Tabs>

        {tab === 0 && (
          <List>
            {trainings.map((training) => (
              <ListItem key={training.id} divider>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {training.team}
                      </Typography>
                      <Chip label={training.day} size="small" color="primary" />
                    </Box>
                  }
                  secondary={
                    <Box sx={{ mt: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <AccessTime fontSize="small" />
                        <Typography variant="body2">{training.time}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <LocationOn fontSize="small" />
                        <Typography variant="body2">{training.place}</Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Entrenador: {training.coach}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}

        {tab === 1 && (
          <List>
            {games.map((game) => (
              <ListItem key={game.id} divider>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {game.team} vs {game.opponent}
                      </Typography>
                      <Chip
                        label={game.type}
                        size="small"
                        color={game.type === 'Local' ? 'success' : 'warning'}
                      />
                    </Box>
                  }
                  secondary={
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2">
                        {game.date} - {game.time}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <LocationOn fontSize="small" />
                        <Typography variant="body2">{game.place}</Typography>
                      </Box>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Crear Nuevo Evento</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Tipo de Evento</InputLabel>
                  <Select
                    value={eventType}
                    label="Tipo de Evento"
                    onChange={(e) => setEventType(e.target.value)}
                  >
                    <MenuItem value="Entrenamiento">Entrenamiento</MenuItem>
                    <MenuItem value="Partido">Partido</MenuItem>
                    <MenuItem value="Reunión">Reunión</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Equipo</InputLabel>
                  <Select
                    value={formData.team}
                    label="Equipo"
                    onChange={(e) => handleInputChange('team', e.target.value)}
                  >
                    {teams.map((team) => (
                      <MenuItem key={team} value={team}>{team}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Entrenador</InputLabel>
                  <Select
                    value={formData.coach}
                    label="Entrenador"
                    onChange={(e) => handleInputChange('coach', e.target.value)}
                  >
                    {coaches.map((coach) => (
                      <MenuItem key={coach} value={coach}>{coach}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Fecha"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  slotProps={{
                    inputLabel: { shrink: true }
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Hora"
                  type="time"
                  value={formData.time}
                  onChange={(e) => handleInputChange('time', e.target.value)}
                  slotProps={{
                    inputLabel: { shrink: true }
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Instalación</InputLabel>
                  <Select
                    value={formData.place}
                    label="Instalación"
                    onChange={(e) => handleInputChange('place', e.target.value)}
                  >
                    {places.map((place) => (
                      <MenuItem key={place} value={place}>{place}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {eventType === 'Partido' && (
                <>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      required
                      label="Rival"
                      value={formData.opponent}
                      onChange={(e) => handleInputChange('opponent', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Tipo de Partido</InputLabel>
                      <Select
                        value={formData.matchType}
                        label="Tipo de Partido"
                        onChange={(e) => handleInputChange('matchType', e.target.value)}
                      >
                        <MenuItem value="Local">Local</MenuItem>
                        <MenuItem value="Visitante">Visitante</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </>
              )}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            sx={{ bgcolor: '#2e7d32' }}
            disabled={!formData.team || !formData.coach || !formData.date || !formData.time || !formData.place}
          >
            Crear Evento
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
