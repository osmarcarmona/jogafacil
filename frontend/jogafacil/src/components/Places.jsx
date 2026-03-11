import { useState } from 'react'
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
  MenuItem
} from '@mui/material'
import { Add, LocationOn, Grass } from '@mui/icons-material'

export default function Places() {
  const [openDialog, setOpenDialog] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    type: '',
    capacity: '',
    lighting: 'Sí',
    facilities: ''
  })

  const places = [
    {
      id: 1,
      name: 'Campo Principal',
      address: 'Av. Principal 123',
      type: 'Césped Natural',
      capacity: '11 vs 11',
      status: 'Disponible'
    },
    {
      id: 2,
      name: 'Campo Auxiliar',
      address: 'Av. Principal 123',
      type: 'Césped Artificial',
      capacity: '7 vs 7',
      status: 'Disponible'
    },
    {
      id: 3,
      name: 'Cancha Techada',
      address: 'Calle Deportiva 45',
      type: 'Sintético',
      capacity: '5 vs 5',
      status: 'En Mantenimiento'
    }
  ]

  const fieldTypes = ['Césped Natural', 'Césped Artificial', 'Sintético', 'Tierra', 'Concreto']
  const capacities = ['5 vs 5', '7 vs 7', '9 vs 9', '11 vs 11']

  const handleOpenDialog = () => setOpenDialog(true)
  
  const handleCloseDialog = () => {
    setOpenDialog(false)
    setFormData({
      name: '',
      address: '',
      type: '',
      capacity: '',
      lighting: 'Sí',
      facilities: ''
    })
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = () => {
    console.log('Nueva instalación:', formData)
    handleCloseDialog()
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

      <Grid container spacing={3}>
        {places.map((place) => (
          <Grid item xs={12} sm={6} md={4} key={place.id}>
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom fontWeight="bold">
                  {place.name}
                </Typography>
                <Chip
                  label={place.status}
                  color={place.status === 'Disponible' ? 'success' : 'warning'}
                  size="small"
                  sx={{ mb: 2 }}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <LocationOn fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    {place.address}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Grass fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    {place.type}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Capacidad: {place.capacity}
                </Typography>
              </CardContent>
              <CardActions>
                <Button size="small">Ver Horarios</Button>
                <Button size="small">Editar</Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Registrar Nueva Instalación</DialogTitle>
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
                <FormControl fullWidth required>
                  <InputLabel>Tipo de Superficie</InputLabel>
                  <Select
                    value={formData.type}
                    label="Tipo de Superficie"
                    onChange={(e) => handleInputChange('type', e.target.value)}
                  >
                    {fieldTypes.map((type) => (
                      <MenuItem key={type} value={type}>{type}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Capacidad</InputLabel>
                  <Select
                    value={formData.capacity}
                    label="Capacidad"
                    onChange={(e) => handleInputChange('capacity', e.target.value)}
                  >
                    {capacities.map((cap) => (
                      <MenuItem key={cap} value={cap}>{cap}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Iluminación</InputLabel>
                  <Select
                    value={formData.lighting}
                    label="Iluminación"
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
            Registrar Instalación
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
