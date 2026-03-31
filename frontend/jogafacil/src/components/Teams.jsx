import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  IconButton,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Link,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText
} from '@mui/material'
import { Add, People, Person, Delete, RemoveCircleOutline, AccessTime, LocationOn } from '@mui/icons-material'
import { teamsApi, coachesApi, studentsApi, scheduleApi, placesApi } from '../services/api'
import { useAcademy } from '../context/AcademyContext'
import { useAuth } from '../context/AuthContext'

export default function Teams() {
  const { academy } = useAcademy()
  const { isAdmin } = useAuth()
  const [teams, setTeams] = useState([])
  const [coaches, setCoaches] = useState([])
  const [students, setStudents] = useState([])
  const [teamStudents, setTeamStudents] = useState([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [openDialog, setOpenDialog] = useState(false)
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false)
  const [editingTeam, setEditingTeam] = useState(null)
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [places, setPlaces] = useState([])
  const [detailsTab, setDetailsTab] = useState(0)
  const [teamSchedule, setTeamSchedule] = useState([])
  const [loadingSchedule, setLoadingSchedule] = useState(false)
  const [scheduleError, setScheduleError] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    coachIds: [],
    ageGroup: '',
    maxCapacity: '20'
  })

  const categories = ['Infantil', 'Juvenil', 'Cadete', 'Junior']

  useEffect(() => {
    loadTeams()
    loadCoaches()
    loadStudents()
    loadPlaces()
  }, [academy])

  const loadTeams = async () => {
    try {
      setLoading(true)
      const data = await teamsApi.getAll(academy)
      setTeams(data.teams || [])
      setError(null)
    } catch (err) {
      setError('Error al cargar equipos: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadCoaches = async () => {
    try {
      const data = await coachesApi.getAll(academy)
      setCoaches(data.coaches || [])
    } catch (err) {
      console.error('Error al cargar entrenadores:', err)
    }
  }

  const loadStudents = async () => {
    try {
      const data = await studentsApi.getAll(academy)
      setStudents(data.students || [])
    } catch (err) {
      console.error('Error al cargar alumnos:', err)
    }
  }

  const loadPlaces = async () => {
    try {
      const data = await placesApi.getAll(academy)
      setPlaces(data.places || [])
    } catch (err) {
      console.error('Error al cargar instalaciones:', err)
    }
  }

  const getName = (list, id) => list.find(i => i.id === id)?.name || id

  const handleOpenDialog = () => {
    setEditingTeam(null)
    setOpenDialog(true)
  }

  const handleOpenEditDialog = (team) => {
    setEditingTeam(team)
    // Handle both coachIds (array) and coachId (single) from backend
    const coachIdsList = team.coachIds || (team.coachId ? [team.coachId] : [])
    
    setFormData({
      name: team.name || '',
      category: team.category || '',
      coachIds: coachIdsList,
      ageGroup: team.ageGroup || '',
      maxCapacity: team.maxCapacity?.toString() || '20'
    })
    setOpenDialog(true)
  }

  const handleOpenDetailsDialog = async (team) => {
    setSelectedTeam(team)
    setOpenDetailsDialog(true)
    setLoadingStudents(true)
    setDetailsTab(0)
    setTeamSchedule([])
    setScheduleError(null)
    setLoadingSchedule(true)
    
    // Filter students that belong to this team
    const studentsInTeam = students.filter(student => {
      if (student.teamIds && Array.isArray(student.teamIds)) {
        return student.teamIds.includes(team.id)
      }
      if (student.teamId) {
        return student.teamId === team.id
      }
      return false
    })
    setTeamStudents(studentsInTeam)
    setLoadingStudents(false)

    // Fetch schedule events for this team
    try {
      const data = await scheduleApi.getAll(academy)
      const allEvents = data.schedule || []
      const filtered = allEvents
        .filter(ev => ev.teamId === team.id)
        .sort((a, b) => {
          const dateCompare = (a.date || '').localeCompare(b.date || '')
          if (dateCompare !== 0) return dateCompare
          return (a.startTime || '').localeCompare(b.startTime || '')
        })
      setTeamSchedule(filtered)
    } catch (err) {
      setScheduleError('Error al cargar horario: ' + err.message)
    } finally {
      setLoadingSchedule(false)
    }
  }

  const handleCloseDetailsDialog = () => {
    setOpenDetailsDialog(false)
    setSelectedTeam(null)
    setTeamStudents([])
    setTeamSchedule([])
    setScheduleError(null)
    setDetailsTab(0)
  }

  const handleRemoveStudentFromTeam = async (student) => {
    if (!window.confirm(`¿Quitar a ${student.name} de este equipo?`)) return
    try {
      const updatedTeamIds = (student.teamIds || []).filter(id => id !== selectedTeam.id)
      await studentsApi.update(student.id, { teamIds: updatedTeamIds })
      // Update local state
      const updated = students.map(s => s.id === student.id ? { ...s, teamIds: updatedTeamIds } : s)
      setStudents(updated)
      setTeamStudents(prev => prev.filter(s => s.id !== student.id))
    } catch (err) {
      setError('Error al quitar jugador del equipo: ' + err.message)
    }
  }
  
  const handleCloseDialog = () => {
    setOpenDialog(false)
    setEditingTeam(null)
    setFormData({
      name: '',
      category: '',
      coachIds: [],
      ageGroup: '',
      maxCapacity: '20'
    })
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    try {
      if (editingTeam) {
        await teamsApi.update(editingTeam.id, formData)
      } else {
        await teamsApi.create({ ...formData, academy })
      }
      handleCloseDialog()
      loadTeams()
    } catch (err) {
      setError(`Error al ${editingTeam ? 'actualizar' : 'crear'} equipo: ` + err.message)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este equipo?')) {
      try {
        await teamsApi.delete(id)
        loadTeams()
      } catch (err) {
        setError('Error al eliminar equipo: ' + err.message)
      }
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  const filteredTeams = teams

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Equipos
        </Typography>
        {isAdmin && (
          <Button variant="contained" startIcon={<Add />} sx={{ bgcolor: '#2e7d32' }} onClick={handleOpenDialog}>
            Nuevo Equipo
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!academy && <Alert severity="warning" sx={{ mb: 2 }}>Selecciona una academia en el encabezado para ver y crear equipos.</Alert>}

      <Grid container spacing={3}>
        {filteredTeams.length === 0 ? (
          <Grid item xs={12}>
            <Typography align="center" color="text.secondary">
              No hay equipos registrados
            </Typography>
          </Grid>
        ) : (
          filteredTeams.map((team) => (
            <Grid item xs={12} sm={6} md={4} key={team.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <Typography variant="h5" gutterBottom fontWeight="bold">
                      {team.name}
                    </Typography>
                    {isAdmin && (
                      <IconButton size="small" color="error" onClick={() => handleDelete(team.id)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                  <Chip label={team.category} color="primary" size="small" sx={{ mb: 2 }} />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Person fontSize="small" color="action" />
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                      {(() => {
                        const coachIdsList = team.coachIds || (team.coachId ? [team.coachId] : [])
                        if (coachIdsList.length === 0) {
                          return <Typography variant="body2" color="text.secondary">Sin entrenador</Typography>
                        }
                        return coachIdsList.map((cId) => {
                          const coach = coaches.find(c => c.id === cId)
                          return <Chip key={cId} label={coach ? coach.name : cId} size="small" variant="outlined" />
                        })
                      })()}
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <People fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      Capacidad: {team.currentSize || 0}/{team.maxCapacity || 'N/A'}
                    </Typography>
                  </Box>
                  {team.ageGroup && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Edad: {team.ageGroup}
                    </Typography>
                  )}
                </CardContent>
                <CardActions>
                  <Button size="small" onClick={() => handleOpenDetailsDialog(team)}>Ver Detalles</Button>
                  {isAdmin && <Button size="small" onClick={() => handleOpenEditDialog(team)}>Editar</Button>}
                </CardActions>
              </Card>
            </Grid>
          ))
        )}
      </Grid>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingTeam ? 'Editar Equipo' : 'Crear Nuevo Equipo'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="Nombre del Equipo"
                  placeholder="Ej: Sub-10 A"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl variant="standard" sx={{ m: 1, minWidth: 120 }} required>
                  <InputLabel>Categoría</InputLabel>
                  <Select
                    value={formData.category}
                    label="Categoría"
                    onChange={(e) => handleInputChange('category', e.target.value)}
                  >
                    {categories.map((cat) => (
                      <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Grupo de Edad"
                  placeholder="Ej: 8-10 años"
                  value={formData.ageGroup}
                  onChange={(e) => handleInputChange('ageGroup', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl variant="standard" sx={{ m: 1, minWidth: 120 }}>
                  <InputLabel>Entrenadores</InputLabel>
                  <Select
                    multiple
                    value={formData.coachIds}
                    label="Entrenadores"
                    onChange={(e) => handleInputChange('coachIds', e.target.value)}
                    sx={{
                      minHeight: '56px',
                      '& .MuiSelect-select': {
                        minHeight: '40px !important',
                        display: 'flex',
                        alignItems: 'center'
                      }
                    }}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, py: 0.5 }}>
                        {selected.length === 0 ? (
                          <Typography variant="body2" color="text.secondary">
                            Seleccionar entrenadores
                          </Typography>
                        ) : (
                          selected.map((coachId) => {
                            const coach = coaches.find(c => c.id === coachId)
                            return coach ? (
                              <Chip key={coachId} label={coach.name} size="small" />
                            ) : null
                          })
                        )}
                      </Box>
                    )}
                  >
                    {coaches.map((coach) => (
                      <MenuItem key={coach.id} value={coach.id}>
                        {coach.name} - {coach.specialty}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="Máximo de Jugadores"
                  type="number"
                  value={formData.maxCapacity}
                  onChange={(e) => handleInputChange('maxCapacity', e.target.value)}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            sx={{ bgcolor: '#2e7d32' }}
            disabled={!formData.name || !formData.category || !formData.ageGroup}
          >
            {editingTeam ? 'Actualizar Equipo' : 'Crear Equipo'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openDetailsDialog} onClose={handleCloseDetailsDialog} maxWidth="md" fullWidth>
        <DialogTitle>Detalles del Equipo</DialogTitle>
        <DialogContent>
          {selectedTeam && (
            <Box sx={{ pt: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Typography variant="h6">{selectedTeam.name}</Typography>
                <Chip label={selectedTeam.category} color="primary" size="small" />
              </Box>
              <Tabs value={detailsTab} onChange={(_, v) => setDetailsTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tab label="Información" />
                <Tab label="Horario" />
              </Tabs>

              {detailsTab === 0 && (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <Typography variant="subtitle2" color="primary" gutterBottom>
                        Información General
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>Grupo de Edad:</strong> {selectedTeam.ageGroup}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>Capacidad Máxima:</strong> {selectedTeam.maxCapacity || 'N/A'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>Jugadores Actuales:</strong> {teamStudents.length}
                      </Typography>
                      {selectedTeam.createdAt && (
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          <strong>Fecha de Creación:</strong> {new Date(selectedTeam.createdAt).toLocaleDateString()}
                        </Typography>
                      )}
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <Typography variant="subtitle2" color="primary" gutterBottom>
                        Entrenadores
                      </Typography>
                      {(() => {
                        const coachIdsList = selectedTeam.coachIds || (selectedTeam.coachId ? [selectedTeam.coachId] : [])
                        if (coachIdsList.length === 0) {
                          return (
                            <Typography variant="body2" color="text.secondary">
                              Sin entrenadores asignados
                            </Typography>
                          )
                        }
                        return coachIdsList.map((coachId) => {
                          const coach = coaches.find(c => c.id === coachId)
                          return (
                            <Chip
                              key={coachId}
                              label={coach ? coach.name : `ID: ${coachId}`}
                              size="small"
                              color={coach ? 'default' : 'default'}
                              sx={{ mr: 0.5, mb: 0.5 }}
                            />
                          )
                        })
                      })()}
                    </Paper>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>
                      Lista de Jugadores ({teamStudents.length})
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    {loadingStudents ? (
                      <Box display="flex" justifyContent="center" py={3}>
                        <CircularProgress size={24} />
                      </Box>
                    ) : teamStudents.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" align="center" py={3}>
                        No hay jugadores en este equipo
                      </Typography>
                    ) : (
                      <TableContainer sx={{ maxHeight: 400 }}>
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow>
                              <TableCell>#</TableCell>
                              <TableCell>Nombre</TableCell>
                              {isAdmin && <TableCell align="right">Acciones</TableCell>}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {teamStudents.map((student, index) => (
                              <TableRow key={student.id} hover>
                                <TableCell sx={{ width: 50 }}>{index + 1}</TableCell>
                                <TableCell>
                                  <Link
                                    href={`?student=${student.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    variant="body2"
                                    underline="hover"
                                    sx={{ cursor: 'pointer' }}
                                  >
                                    {student.name}
                                  </Link>
                                </TableCell>
                                {isAdmin && (
                                  <TableCell align="right">
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => handleRemoveStudentFromTeam(student)}
                                      title="Quitar del equipo"
                                    >
                                      <RemoveCircleOutline fontSize="small" />
                                    </IconButton>
                                  </TableCell>
                                )}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </Grid>
                </Grid>
              )}

              {detailsTab === 1 && (
                <Box>
                  {loadingSchedule ? (
                    <Box display="flex" justifyContent="center" py={4}>
                      <CircularProgress size={28} />
                    </Box>
                  ) : scheduleError ? (
                    <Alert severity="error" sx={{ my: 2 }}>{scheduleError}</Alert>
                  ) : teamSchedule.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" align="center" py={4}>
                      No hay eventos programados para este equipo
                    </Typography>
                  ) : (
                    <List disablePadding>
                      {teamSchedule.map((ev) => (
                        <ListItem key={ev.id} divider>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip
                                  label={ev.type === 'match' ? 'Partido' : 'Entrenamiento'}
                                  size="small"
                                  sx={{
                                    bgcolor: ev.type === 'match' ? 'warning.light' : 'success.light',
                                    color: ev.type === 'match' ? 'warning.contrastText' : 'success.contrastText'
                                  }}
                                />
                                {ev.type === 'match' && ev.opponent && (
                                  <Typography variant="subtitle2">
                                    vs {ev.opponent}
                                  </Typography>
                                )}
                                {ev.type === 'match' && ev.matchType && (
                                  <Chip label={ev.matchType} size="small" variant="outlined"
                                    color={ev.matchType === 'Local' ? 'success' : 'warning'} />
                                )}
                              </Box>
                            }
                            secondary={
                              <Box sx={{ mt: 0.5 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3 }}>
                                  <AccessTime sx={{ fontSize: 16 }} color="action" />
                                  <Typography variant="body2" color="text.secondary">
                                    {ev.date} — Llegada: {ev.arrivalTime} | Inicio: {ev.startTime}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3 }}>
                                  <LocationOn sx={{ fontSize: 16 }} color="action" />
                                  <Typography variant="body2" color="text.secondary">
                                    {getName(places, ev.placeId)}
                                  </Typography>
                                </Box>
                                <Typography variant="body2" color="text.secondary">
                                  Entrenador: {getName(coaches, ev.coachId)}
                                  {ev.kit ? ` | Equipación: ${ev.kit}` : ''}
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetailsDialog}>Cerrar</Button>
          {isAdmin && (
            <Button 
              onClick={() => {
                handleCloseDetailsDialog()
                handleOpenEditDialog(selectedTeam)
              }}
              variant="contained"
              sx={{ bgcolor: '#2e7d32' }}
            >
              Editar
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  )
}
