import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Avatar,
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
  IconButton
} from '@mui/material'
import { Add, Email, Phone, Delete } from '@mui/icons-material'
import { coachesApi } from '../services/api'
import { useAcademy } from '../context/AcademyContext'

export default function Coaches() {
  const { academy } = useAcademy()
  const [coaches, setCoaches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [openDialog, setOpenDialog] = useState(false)
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false)
  const [editingCoach, setEditingCoach] = useState(null)
  const [selectedCoach, setSelectedCoach] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    specialty: '',
    phone: '',
    email: '',
    address: '',
    certifications: '',
    experience: ''
  })

  const specialties = ['Iniciación', 'Técnica', 'Táctica', 'Preparación Física', 'Porteros', 'General']

  useEffect(() => {
    loadCoaches()
  }, [])

  const loadCoaches = async () => {
    try {
      setLoading(true)
      const data = await coachesApi.getAll()
      setCoaches(data.coaches || [])
      setError(null)
    } catch (err) {
      setError('Error al cargar entrenadores: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = () => {
    setEditingCoach(null)
    setOpenDialog(true)
  }

  const handleOpenEditDialog = (coach) => {
    setEditingCoach(coach)
    setFormData({
      name: coach.name || '',
      specialty: coach.specialty || '',
      phone: coach.phone || '',
      email: coach.email || '',
      address: coach.address || '',
      certifications: coach.certifications || '',
      experience: coach.experience?.toString() || ''
    })
    setOpenDialog(true)
  }

  const handleOpenDetailsDialog = (coach) => {
    setSelectedCoach(coach)
    setOpenDetailsDialog(true)
  }

  const handleCloseDetailsDialog = () => {
    setOpenDetailsDialog(false)
    setSelectedCoach(null)
  }
  
  const handleCloseDialog = () => {
    setOpenDialog(false)
    setEditingCoach(null)
    setFormData({
      name: '',
      specialty: '',
      phone: '',
      email: '',
      address: '',
      certifications: '',
      experience: ''
    })
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    try {
      if (editingCoach) {
        await coachesApi.update(editingCoach.id, formData)
      } else {
        await coachesApi.create({ ...formData, academy })
      }
      handleCloseDialog()
      loadCoaches()
    } catch (err) {
      setError(`Error al ${editingCoach ? 'actualizar' : 'crear'} entrenador: ` + err.message)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este entrenador?')) {
      try {
        await coachesApi.delete(id)
        loadCoaches()
      } catch (err) {
        setError('Error al eliminar entrenador: ' + err.message)
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

  const filteredCoaches = coaches.filter(c => !academy || c.academy === academy)

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Entrenadores
        </Typography>
        <Button variant="contained" startIcon={<Add />} sx={{ bgcolor: '#2e7d32' }} onClick={handleOpenDialog}>
          Nuevo Entrenador
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!academy && <Alert severity="warning" sx={{ mb: 2 }}>Selecciona una academia en el encabezado para ver y crear entrenadores.</Alert>}

      <Grid container spacing={3}>
        {filteredCoaches.length === 0 ? (
          <Grid item xs={12}>
            <Typography align="center" color="text.secondary">
              No hay entrenadores registrados
            </Typography>
          </Grid>
        ) : (
          filteredCoaches.map((coach) => (
            <Grid item xs={12} sm={6} md={4} key={coach.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ width: 56, height: 56, bgcolor: '#2e7d32' }}>
                        {coach.name.split(' ').map(n => n[0]).join('')}
                      </Avatar>
                      <Box>
                        <Typography variant="h6" fontWeight="bold">
                          {coach.name}
                        </Typography>
                        <Chip label={coach.specialty} size="small" color="primary" />
                      </Box>
                    </Box>
                    <IconButton size="small" color="error" onClick={() => handleDelete(coach.id)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                    <Phone fontSize="small" color="action" />
                    <Typography variant="body2">{coach.phone}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <Email fontSize="small" color="action" />
                    <Typography variant="body2">{coach.email}</Typography>
                  </Box>
                </CardContent>
                <CardActions>
                  <Button size="small" onClick={() => handleOpenDetailsDialog(coach)}>Ver Detalles</Button>
                  <Button size="small" onClick={() => handleOpenEditDialog(coach)}>Editar</Button>
                </CardActions>
              </Card>
            </Grid>
          ))
        )}
      </Grid>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingCoach ? 'Editar Entrenador' : 'Registrar Nuevo Entrenador'}</DialogTitle>
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
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Especialidad</InputLabel>
                  <Select
                    value={formData.specialty}
                    label="Especialidad"
                    onChange={(e) => handleInputChange('specialty', e.target.value)}
                  >
                    {specialties.map((spec) => (
                      <MenuItem key={spec} value={spec}>{spec}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
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
                  required
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Dirección"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Certificaciones"
                  placeholder="Ej: UEFA B, Nivel 2"
                  value={formData.certifications}
                  onChange={(e) => handleInputChange('certifications', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Años de Experiencia"
                  type="number"
                  value={formData.experience}
                  onChange={(e) => handleInputChange('experience', e.target.value)}
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
            disabled={!formData.name || !formData.specialty || !formData.phone || !formData.email}
          >
            {editingCoach ? 'Actualizar Entrenador' : 'Registrar Entrenador'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openDetailsDialog} onClose={handleCloseDetailsDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Detalles del Entrenador</DialogTitle>
        <DialogContent>
          {selectedCoach && (
            <Box sx={{ pt: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Avatar sx={{ width: 64, height: 64, bgcolor: '#2e7d32' }}>
                  {selectedCoach.name.split(' ').map(n => n[0]).join('')}
                </Avatar>
                <Box>
                  <Typography variant="h6" gutterBottom>
                    {selectedCoach.name}
                  </Typography>
                  <Chip label={selectedCoach.specialty} color="primary" size="small" />
                </Box>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Teléfono:</strong> {selectedCoach.phone}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Email:</strong> {selectedCoach.email}
                  </Typography>
                </Grid>
                {selectedCoach.address && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>Dirección:</strong> {selectedCoach.address}
                    </Typography>
                  </Grid>
                )}
                {selectedCoach.certifications && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>Certificaciones:</strong> {selectedCoach.certifications}
                    </Typography>
                  </Grid>
                )}
                {selectedCoach.experience && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>Años de Experiencia:</strong> {selectedCoach.experience}
                    </Typography>
                  </Grid>
                )}
                {selectedCoach.createdAt && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>Fecha de Registro:</strong> {new Date(selectedCoach.createdAt).toLocaleDateString()}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetailsDialog}>Cerrar</Button>
          <Button 
            onClick={() => {
              handleCloseDetailsDialog()
              handleOpenEditDialog(selectedCoach)
            }}
            variant="contained"
            sx={{ bgcolor: '#2e7d32' }}
          >
            Editar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
