import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert
} from '@mui/material'
import { Add, Edit, Delete, Search, Visibility } from '@mui/icons-material'
import { studentsApi, teamsApi } from '../services/api'
import { useAcademy } from '../context/AcademyContext'

export default function Students() {
  const { academy } = useAcademy()
  const [students, setStudents] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [positionFilter, setPositionFilter] = useState('')
  const [openDialog, setOpenDialog] = useState(false)
  const [detailStudent, setDetailStudent] = useState(null)
  const [editingStudent, setEditingStudent] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    teamIds: [],
    position: '',
    dateOfBirth: '',
    address: '',
    emergencyContact: '',
    emergencyPhone: ''
  })

  useEffect(() => {
    loadStudents()
    loadTeams()
  }, [academy])

  const loadStudents = async () => {
    try {
      setLoading(true)
      const data = await studentsApi.getAll(academy)
      setStudents(data.students || [])
      setError(null)
    } catch (err) {
      setError('Error al cargar alumnos: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadTeams = async () => {
    try {
      const data = await teamsApi.getAll(academy)
      setTeams(data.teams || [])
    } catch (err) {
      console.error('Error al cargar equipos:', err)
    }
  }

  const handleOpenDialog = () => {
    setEditingStudent(null)
    setOpenDialog(true)
  }

  const handleOpenEditDialog = (student) => {
    setEditingStudent(student)
    setFormData({
      name: student.name || '',
      email: student.email || '',
      phone: student.phone || '',
      teamIds: student.teamIds || [],
      position: student.position || '',
      dateOfBirth: student.dateOfBirth || '',
      address: student.address || '',
      emergencyContact: student.emergencyContact || '',
      emergencyPhone: student.emergencyPhone || ''
    })
    setOpenDialog(true)
  }
  
  const handleCloseDialog = () => {
    setOpenDialog(false)
    setEditingStudent(null)
    setFormData({
      name: '',
      email: '',
      phone: '',
      teamIds: [],
      position: '',
      dateOfBirth: '',
      address: '',
      emergencyContact: '',
      emergencyPhone: ''
    })
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    try {
      if (editingStudent) {
        await studentsApi.update(editingStudent.id, formData)
      } else {
        await studentsApi.create({ ...formData, academy })
      }
      handleCloseDialog()
      loadStudents()
    } catch (err) {
      setError(`Error al ${editingStudent ? 'actualizar' : 'crear'} alumno: ` + err.message)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este alumno?')) {
      try {
        await studentsApi.delete(id)
        loadStudents()
      } catch (err) {
        setError('Error al eliminar alumno: ' + err.message)
      }
    }
  }

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesPosition = !positionFilter || student.position === positionFilter
    return matchesSearch && matchesPosition
  })

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Alumnos
        </Typography>
        <Button variant="contained" startIcon={<Add />} sx={{ bgcolor: '#2e7d32' }} onClick={handleOpenDialog}>
          Nuevo Alumno
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!academy && <Alert severity="warning" sx={{ mb: 2 }}>Selecciona una academia en el encabezado para ver y crear alumnos.</Alert>}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={8}>
          <TextField
            fullWidth
            placeholder="Buscar alumno..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                )
              }
            }}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
           <FormControl variant="standard" sx={{ m: 1, minWidth: 120 }}>
            <InputLabel>Posición</InputLabel>
            <Select
              value={positionFilter}
              label="Posición"
              onChange={(e) => setPositionFilter(e.target.value)}
            >
              <MenuItem value="">Todas</MenuItem>
              <MenuItem value="Portero">Portero</MenuItem>
              <MenuItem value="Defensa">Defensa</MenuItem>
              <MenuItem value="Mediocampista">Mediocampista</MenuItem>
              <MenuItem value="Delantero">Delantero</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Posición</TableCell>
              <TableCell>Fecha de Nacimiento</TableCell>
              <TableCell>Teléfono</TableCell>
              <TableCell>Equipos</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredStudents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No hay alumnos registrados
                </TableCell>
              </TableRow>
            ) : (
              filteredStudents.map((student) => (
                <TableRow key={student.id} hover sx={{ cursor: 'pointer' }} onClick={() => setDetailStudent(student)}>
                  <TableCell>{student.name}</TableCell>
                  <TableCell>{student.position || '—'}</TableCell>
                  <TableCell>{student.dateOfBirth || '—'}</TableCell>
                  <TableCell>{student.phone}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(student.teamIds || []).length === 0 ? '—' : student.teamIds.map((teamId) => {
                        const team = teams.find(t => t.id === teamId)
                        return <Chip key={teamId} label={team ? team.name : teamId} size="small" variant="outlined" />
                      })}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={student.status || 'Activo'}
                      color={student.status === 'active' ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" color="info" onClick={(e) => { e.stopPropagation(); setDetailStudent(student) }}>
                      <Visibility />
                    </IconButton>
                    <IconButton size="small" color="primary" onClick={(e) => { e.stopPropagation(); handleOpenEditDialog(student) }}>
                      <Edit />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); handleDelete(student.id) }}>
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={!!detailStudent} onClose={() => setDetailStudent(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Detalles del Alumno</DialogTitle>
        <DialogContent>
          {detailStudent && (
            <Box sx={{ pt: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Nombre Completo</Typography>
                  <Typography>{detailStudent.name}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Email</Typography>
                  <Typography>{detailStudent.email || '—'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Teléfono</Typography>
                  <Typography>{detailStudent.phone || '—'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Fecha de Nacimiento</Typography>
                  <Typography>{detailStudent.dateOfBirth || '—'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Posición</Typography>
                  <Typography>{detailStudent.position || '—'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Estado</Typography>
                  <Chip
                    label={detailStudent.status || 'Activo'}
                    color={detailStudent.status === 'active' ? 'success' : 'default'}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Dirección</Typography>
                  <Typography>{detailStudent.address || '—'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Contacto de Emergencia</Typography>
                  <Typography>{detailStudent.emergencyContact || '—'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Teléfono de Emergencia</Typography>
                  <Typography>{detailStudent.emergencyPhone || '—'}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Equipos</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
                    {(detailStudent.teamIds || []).length === 0 ? (
                      <Typography>—</Typography>
                    ) : (
                      detailStudent.teamIds.map((teamId) => {
                        const team = teams.find(t => t.id === teamId)
                        return <Chip key={teamId} label={team ? team.name : teamId} size="small" />
                      })
                    )}
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailStudent(null)}>Cerrar</Button>
          <Button
            variant="contained"
            sx={{ bgcolor: '#2e7d32' }}
            onClick={() => { handleOpenEditDialog(detailStudent); setDetailStudent(null) }}
          >
            Editar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingStudent ? 'Editar Alumno' : 'Registrar Nuevo Alumno'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="Nombre Completo"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Teléfono"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Fecha de Nacimiento"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                  slotProps={{
                    inputLabel: { shrink: true }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl variant="standard" sx={{ m: 1, minWidth: 120 }}>
                  <InputLabel>Posición</InputLabel>
                  <Select
                    value={formData.position}
                    label="Posición"
                    onChange={(e) => handleInputChange('position', e.target.value)}
                  >
                    <MenuItem value="">Sin definir</MenuItem>
                    <MenuItem value="Portero">Portero</MenuItem>
                    <MenuItem value="Defensa">Defensa</MenuItem>
                    <MenuItem value="Mediocampista">Mediocampista</MenuItem>
                    <MenuItem value="Delantero">Delantero</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Dirección"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Contacto de Emergencia"
                  value={formData.emergencyContact}
                  onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Teléfono de Emergencia"
                  value={formData.emergencyPhone}
                  onChange={(e) => handleInputChange('emergencyPhone', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl variant="standard" sx={{ m: 1, minWidth: 120 }}>
                  <InputLabel>Equipos</InputLabel>
                  <Select
                    multiple
                    value={formData.teamIds}
                    label="Equipos"
                    onChange={(e) => handleInputChange('teamIds', e.target.value)}
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
                            Seleccionar equipos
                          </Typography>
                        ) : (
                          selected.map((teamId) => {
                            const team = teams.find(t => t.id === teamId)
                            return team ? (
                              <Chip key={teamId} label={team.name} size="small" />
                            ) : null
                          })
                        )}
                      </Box>
                    )}
                  >
                    {teams.map((team) => (
                      <MenuItem key={team.id} value={team.id}>
                        {team.name} - {team.category}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
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
            disabled={!formData.name || !formData.phone}
          >
            {editingStudent ? 'Actualizar Alumno' : 'Registrar Alumno'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
