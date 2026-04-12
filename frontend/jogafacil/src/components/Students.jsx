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
  Alert,
  TableSortLabel,
  Checkbox
} from '@mui/material'
import { Add, Edit, Delete, Search, Visibility, DeleteSweep } from '@mui/icons-material'
import { studentsApi, teamsApi, paymentTypesApi } from '../services/api'
import { useAcademy } from '../context/AcademyContext'

export default function Students() {
  const { academy } = useAcademy()
  const [students, setStudents] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [positionFilter, setPositionFilter] = useState('')
  const [teamFilter, setTeamFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [windowFilter, setWindowFilter] = useState('')
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
    emergencyPhone: '',
    paymentWindow: 1,
    status: 'active'
  })
  const [noInscriptionWarning, setNoInscriptionWarning] = useState(false)
  const [hasInscriptionTemplate, setHasInscriptionTemplate] = useState(false)
  const [sortDirection, setSortDirection] = useState('asc')
  const [selectedIds, setSelectedIds] = useState(new Set())

  useEffect(() => {
    loadStudents()
    loadTeams()
    checkInscriptionTemplate()
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

  const checkInscriptionTemplate = async () => {
    if (!academy) {
      setHasInscriptionTemplate(false)
      return
    }
    try {
      const data = await paymentTypesApi.getAll(academy)
      const templates = data.paymentTypes || data.payment_types || []
      const found = templates.some(t => t.name && t.name.toLowerCase() === 'inscripción')
      setHasInscriptionTemplate(found)
    } catch {
      setHasInscriptionTemplate(false)
    }
  }

  const handleOpenDialog = () => {
    if (!hasInscriptionTemplate) {
      setNoInscriptionWarning(true)
      return
    }
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
      emergencyPhone: student.emergencyPhone || '',
      paymentWindow: student.paymentWindow ?? 1,
      status: student.status || 'active'
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
      emergencyPhone: '',
      paymentWindow: 1,
      status: 'active'
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

  const handleToggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedIds.size === filteredStudents.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredStudents.map(s => s.id)))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!window.confirm(`¿Estás seguro de eliminar ${selectedIds.size} alumno(s)?`)) return
    try {
      await Promise.all([...selectedIds].map(id => studentsApi.delete(id)))
      setSelectedIds(new Set())
      loadStudents()
    } catch (err) {
      setError('Error al eliminar alumnos: ' + err.message)
    }
  }

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesPosition = !positionFilter || (positionFilter === '__none__' ? !student.position : student.position === positionFilter)
    const matchesTeam = !teamFilter || (student.teamIds || []).includes(teamFilter)
    const matchesStatus = !statusFilter || student.status === statusFilter
    const matchesWindow = !windowFilter || Number(student.paymentWindow || 1) === Number(windowFilter)
    return matchesSearch && matchesPosition && matchesTeam && matchesStatus && matchesWindow
  }).sort((a, b) => {
    const cmp = (a.name || '').localeCompare(b.name || '')
    return sortDirection === 'asc' ? cmp : -cmp
  })

  // Stats
  const totalStudents = students.length
  const activeStudents = students.filter(s => s.status === 'active').length
  const inactiveStudents = students.filter(s => s.status !== 'active').length
  const positions = ['Portero', 'Defensa', 'Mediocampista', 'Delantero']
  const positionCounts = positions.reduce((acc, pos) => {
    acc[pos] = students.filter(s => s.position === pos).length
    return acc
  }, {})
  const noPosition = students.filter(s => !s.position).length
  const window1Count = students.filter(s => Number(s.paymentWindow) !== 2).length
  const window2Count = students.filter(s => Number(s.paymentWindow) === 2).length

  const handleStatClick = (type, value) => {
    if (type === 'position') {
      setPositionFilter(prev => prev === value ? '' : value)
      setStatusFilter('')
      setWindowFilter('')
    } else if (type === 'status') {
      setStatusFilter(prev => prev === value ? '' : value)
      setPositionFilter('')
      setWindowFilter('')
    } else if (type === 'window') {
      setWindowFilter(prev => prev === value ? '' : value)
      setPositionFilter('')
      setStatusFilter('')
    } else {
      setPositionFilter('')
      setStatusFilter('')
      setWindowFilter('')
    }
  }

  const statCardSx = (active) => ({
    p: 1.5, textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
    border: active ? 2 : 1,
    borderColor: active ? 'primary.main' : 'divider',
    bgcolor: active ? 'action.selected' : 'background.paper',
    '&:hover': { bgcolor: 'action.hover' }
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
        <Box sx={{ display: 'flex', gap: 1 }}>
          {selectedIds.size > 0 && (
            <Button variant="outlined" color="error" startIcon={<DeleteSweep />} onClick={handleBulkDelete}>
              Eliminar ({selectedIds.size})
            </Button>
          )}
          <Button variant="contained" startIcon={<Add />} sx={{ bgcolor: '#2e7d32' }} onClick={handleOpenDialog}>
            Nuevo Alumno
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!academy && <Alert severity="warning" sx={{ mb: 2 }}>Selecciona una academia en el encabezado para ver y crear alumnos.</Alert>}

      {/* Stats */}
      {academy && students.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3} md={2}>
            <Paper sx={statCardSx(!positionFilter && !statusFilter && !windowFilter)} onClick={() => handleStatClick('clear')}>
              <Typography variant="h5" fontWeight="bold">{totalStudents}</Typography>
              <Typography variant="caption" color="text.secondary">Total</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3} md={2}>
            <Paper sx={statCardSx(statusFilter === 'active')} onClick={() => handleStatClick('status', 'active')}>
              <Typography variant="h5" fontWeight="bold" color="success.main">{activeStudents}</Typography>
              <Typography variant="caption" color="text.secondary">Activos</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3} md={2}>
            <Paper sx={statCardSx(statusFilter === 'inactive')} onClick={() => handleStatClick('status', 'inactive')}>
              <Typography variant="h5" fontWeight="bold" color="text.disabled">{inactiveStudents}</Typography>
              <Typography variant="caption" color="text.secondary">Inactivos</Typography>
            </Paper>
          </Grid>
          {positions.map(pos => (
            <Grid item xs={6} sm={3} md={2} key={pos}>
              <Paper sx={statCardSx(positionFilter === pos)} onClick={() => handleStatClick('position', pos)}>
                <Typography variant="h5" fontWeight="bold">{positionCounts[pos]}</Typography>
                <Typography variant="caption" color="text.secondary">{pos}</Typography>
              </Paper>
            </Grid>
          ))}
          {noPosition > 0 && (
            <Grid item xs={6} sm={3} md={2}>
              <Paper sx={statCardSx(positionFilter === '__none__')} onClick={() => handleStatClick('position', '__none__')}>
                <Typography variant="h5" fontWeight="bold">{noPosition}</Typography>
                <Typography variant="caption" color="text.secondary">Sin posición</Typography>
              </Paper>
            </Grid>
          )}
          <Grid item xs={6} sm={3} md={2}>
            <Paper sx={statCardSx(windowFilter === '1')} onClick={() => handleStatClick('window', '1')}>
              <Typography variant="h5" fontWeight="bold">{window1Count}</Typography>
              <Typography variant="caption" color="text.secondary">Ventana 1</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3} md={2}>
            <Paper sx={statCardSx(windowFilter === '2')} onClick={() => handleStatClick('window', '2')}>
              <Typography variant="h5" fontWeight="bold">{window2Count}</Typography>
              <Typography variant="caption" color="text.secondary">Ventana 2</Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={5}>
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
        <Grid item xs={6} sm={3}>
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
        <Grid item xs={6} sm={4}>
          <FormControl variant="standard" sx={{ m: 1, minWidth: 120 }}>
            <InputLabel>Equipo</InputLabel>
            <Select
              value={teamFilter}
              label="Equipo"
              onChange={(e) => setTeamFilter(e.target.value)}
            >
              <MenuItem value="">Todos</MenuItem>
              {teams.map(t => (
                <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selectedIds.size > 0 && selectedIds.size < filteredStudents.length}
                  checked={filteredStudents.length > 0 && selectedIds.size === filteredStudents.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active
                  direction={sortDirection}
                  onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                >
                  Nombre
                </TableSortLabel>
              </TableCell>
              <TableCell>Posición</TableCell>
              <TableCell>Fecha de Nacimiento</TableCell>
              <TableCell>Equipos</TableCell>
              <TableCell>Ventana de Pago</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredStudents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  No hay alumnos registrados
                </TableCell>
              </TableRow>
            ) : (
              filteredStudents.map((student) => (
                <TableRow key={student.id} hover sx={{ cursor: 'pointer' }} onClick={() => setDetailStudent(student)}>
                  <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(student.id)}
                      onChange={() => handleToggleSelect(student.id)}
                    />
                  </TableCell>
                  <TableCell>{student.name}</TableCell>
                  <TableCell>{student.position || '—'}</TableCell>
                  <TableCell>{student.dateOfBirth || '—'}</TableCell>
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
                      label={student.paymentWindow === 2 ? 'Ventana 2' : 'Ventana 1'}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={student.status === 'inactive' ? 'Inactivo' : 'Activo'}
                      color={student.status === 'inactive' ? 'default' : 'success'}
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
                    label={detailStudent.status === 'inactive' ? 'Inactivo' : 'Activo'}
                    color={detailStudent.status === 'inactive' ? 'default' : 'success'}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Ventana de Pago</Typography>
                  <Typography>{detailStudent.paymentWindow === 2 ? 'Ventana 2 (15–20)' : 'Ventana 1 (1–5)'}</Typography>
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
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Ventana de Pago</InputLabel>
                  <Select
                    value={formData.paymentWindow}
                    label="Ventana de Pago"
                    onChange={(e) => handleInputChange('paymentWindow', e.target.value)}
                  >
                    <MenuItem value={1}>Ventana 1 (1–5)</MenuItem>
                    <MenuItem value={2}>Ventana 2 (15–20)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Estado</InputLabel>
                  <Select
                    value={formData.status}
                    label="Estado"
                    onChange={(e) => handleInputChange('status', e.target.value)}
                  >
                    <MenuItem value="active">Activo</MenuItem>
                    <MenuItem value="inactive">Inactivo</MenuItem>
                  </Select>
                </FormControl>
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

      {/* No inscription fee warning dialog */}
      <Dialog open={noInscriptionWarning} onClose={() => setNoInscriptionWarning(false)} maxWidth="sm">
        <DialogTitle>Cuota de Inscripción No Registrada</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mt: 1 }}>
            No hay una inscripción registrada, regístrala primero antes de crear alumnos en la Página de Administración.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNoInscriptionWarning(false)} variant="contained">
            Entendido
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
