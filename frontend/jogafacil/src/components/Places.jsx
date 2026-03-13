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
  IconButton
} from '@mui/material'
import { Add, LocationOn, Grass, Delete } from '@mui/icons-material'
import { placesApi } from '../services/api'
import { useAcademy } from '../context/AcademyContext'

const initialFormData = {
  name: '',
  address: '',
  type: '',
  capacity: '',
  lighting: 'Sí',
  facilities: ''
}

export default function Places() {
  const { academy } = useAcademy()
  const [places, setPlaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [openDialog, setOpenDialog] = useState(false)
  const [editingPlace, setEditingPlace] = useState(null)
  const [formData, setFormData] = useState(initialFormData)

  const fieldTypes = ['Césped Natural', 'Césped Artificial', 'Sintético', 'Tierra', 'Concreto']
  const capacities = ['5 vs 5', '7 vs 7', '9 vs 9', '11 vs 11']

  useEffect(() => {
    loadPlaces()
  }, [academy])

  const loadPlaces = async () => {
    try {
      setLoading(true)
      const data = await placesApi.getAll(academy)
      setPlaces(data.places || [])
      setError(null)
    } catch (err) {
      setError('Error al cargar instalaciones: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = () => {
    setEditingPlace(null)
    setFormData(initialFormData)
    setOpenDialog(true)
  }

  const handleOpenEditDialog = (place) => {
    setEditingPlace(place)
    setFormData({
      name: place.name || '',
      address: place.address || '',
      type: place.type || '',
      capacity: place.capacity || '',
      lighting: place.lighting || 'Sí',
      facilities: Array.isArray(place.facilities) ? place.facilities.join(', ') : (place.facilities || '')
    })
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setEditingPlace(null)
    setFormData(initialFormData)
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    try {
      const payload = {
        ...formData,
        facilities: formData.facilities
          ? formData.facilities.split(',').map(f => f.trim()).filter(Boolean)
          : [],
        academy
      }

      if (editingPlace) {
        await placesApi.update(editingPlace.id, payload)
      } else {
        await placesApi.create(payload)
      }
      handleCloseDialog()
      loadPlaces()
    } catch (err) {
      setError(`Error al ${editingPlace ? 'actualizar' : 'crear'} instalación: ` + err.message)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta instalación?')) {
      try {
        await placesApi.delete(id)
        loadPlaces()
      } catch (err) {
        setError('Error al eliminar instalación: ' + err.message)
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

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Instalaciones
        </Typography>
        <Button variant="contained" startIcon={<Add />} sx={{ bgcolor: '#2e7d32' }} onClick={handleOpenDialog}>
          Nueva Instalación
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!academy && <Alert severity="warning" sx={{ mb: 2 }}>Selecciona una academia en el encabezado para ver y crear instalaciones.</Alert>}

      <Grid container spacing={3}>
        {places.length === 0 ? (
          <Grid item xs={12}>
            <Typography align="center" color="text.secondary">
              No hay instalaciones registradas
            </Typography>
          </Grid>
        ) : (
          places.map((place) => (
            <Grid item xs={12} sm={6} md={4} key={place.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <Typography variant="h5" gutterBottom fontWeight="bold">
                      {place.name}
                    </Typography>
                    <IconButton size="small" color="error" onClick={() => handleDelete(place.id)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                  <Chip
                    label={place.status === 'active' ? 'Disponible' : 'En Mantenimiento'}
                    color={place.status === 'active' ? 'success' : 'warning'}
                    size="small"
                    sx={{ mb: 2 }}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <LocationOn fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {place.address}
                    </Typography>
                  </Box>
                  {place.type && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Grass fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        {place.type}
                      </Typography>
                    </Box>
                  )}
                  {place.capacity && (
                    <Typography variant="body2" color="text.secondary">
                      Capacidad: {place.capacity}
                    </Typography>
                  )}
                </CardContent>
                <CardActions>
                  <Button size="small" onClick={() => handleOpenEditDialog(place)}>Editar</Button>
                </CardActions>
              </Card>
            </Grid>
          ))
        )}
      </Grid>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingPlace ? 'Editar Instalación' : 'Registrar Nueva Instalación'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="Nombre de la Instalación"
                  placeholder="Ej: Campo Principal"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="Dirección"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl variant="standard" sx={{ m: 1, minWidth: 120 }} required>
                  <InputLabel>Tipo de Superficie</InputLabel>
                  <Select
                    value={formData.type}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                  >
                    {fieldTypes.map((type) => (
                      <MenuItem key={type} value={type}>{type}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl variant="standard" sx={{ m: 1, minWidth: 120 }} required>
                  <InputLabel>Capacidad</InputLabel>
                  <Select
                    value={formData.capacity}
                    onChange={(e) => handleInputChange('capacity', e.target.value)}
                  >
                    {capacities.map((cap) => (
                      <MenuItem key={cap} value={cap}>{cap}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl variant="standard" sx={{ m: 1, minWidth: 120 }}>
                  <InputLabel>Iluminación</InputLabel>
                  <Select
                    value={formData.lighting}
                    onChange={(e) => handleInputChange('lighting', e.target.value)}
                  >
                    <MenuItem value="Sí">Sí</MenuItem>
                    <MenuItem value="No">No</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Instalaciones Adicionales"
                  placeholder="Ej: Vestuarios, Gradas, Estacionamiento"
                  multiline
                  rows={2}
                  value={formData.facilities}
                  onChange={(e) => handleInputChange('facilities', e.target.value)}
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
            disabled={!formData.name || !formData.address || !formData.type || !formData.capacity}
          >
            {editingPlace ? 'Actualizar Instalación' : 'Registrar Instalación'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
