import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Container,
  AppBar,
  Toolbar,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material'
import { SportsFootball, Edit } from '@mui/icons-material'
import { studentsApi, teamsApi } from '../services/api'

export default function StudentDetail({ studentId }) {
  const [student, setStudent] = useState(null)
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState(null)
  const [formData, setFormData] = useState({})

  useEffect(() => {
    const load = async () => {
      try {
        const [studentData, teamsData] = await Promise.all([
          studentsApi.getById(studentId),
          teamsApi.getAll()
        ])
        setStudent(studentData)
        setTeams(teamsData.teams || [])
      } catch (err) {
        setError('Error al cargar datos del alumno: ' + err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [studentId])

  const startEditing = () => {
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
    setEditing(true)
    setSuccessMsg(null)
  }

  const cancelEditing = () => {
    setEditing(false)
    setFormData({})
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const updated = await studentsApi.update(studentId, formData)
      setStudent(updated)
      setEditing(false)
      setSuccessMsg('Alumno actualizado correctamente')
      setError(null)
    } catch (err) {
      setError('Error al actualizar alumno: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    )
  }

  if (!student && error) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    )
  }

  if (!student) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Alert severity="warning">Alumno no encontrado</Alert>
      </Container>
    )
  }

  return (
    <Box>
      <AppBar position="static" sx={{ bgcolor: '#2e7d32' }}>
        <Toolbar>
          <SportsFootball sx={{ mr: 2 }} />
          <Typography variant="h6">JogaFacil — Detalles del Alumno</Typography>
        </Toolbar>
      </AppBar>
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {successMsg && <Alert severity="success" sx={{ mb: 2 }}>{successMsg}</Alert>}
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" fontWeight="bold">
              {editing ? 'Editar Alumno' : student.name}
            </Typography>
            {!editing && (
              <Button startIcon={<Edit />} variant="outlined" onClick={startEditing}>
                Editar
              </Button>
            )}
          </Box>

          {editing ? (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField fullWidth required label="Nombre Completo" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Email" type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth required label="Teléfono" value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Fecha de Nacimiento" type="date" value={formData.dateOfBirth} onChange={(e) => handleChange('dateOfBirth', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Posición</InputLabel>
                  <Select value={formData.position} label="Posición" onChange={(e) => handleChange('position', e.target.value)}>
                    <MenuItem value="">Sin definir</MenuItem>
                    <MenuItem value="Portero">Portero</MenuItem>
                    <MenuItem value="Defensa">Defensa</MenuItem>
                    <MenuItem value="Mediocampista">Mediocampista</MenuItem>
                    <MenuItem value="Delantero">Delantero</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Dirección" value={formData.address} onChange={(e) => handleChange('address', e.target.value)} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Contacto de Emergencia" value={formData.emergencyContact} onChange={(e) => handleChange('emergencyContact', e.target.value)} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Teléfono de Emergencia" value={formData.emergencyPhone} onChange={(e) => handleChange('emergencyPhone', e.target.value)} />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Ventana de Pago</InputLabel>
                  <Select value={formData.paymentWindow} label="Ventana de Pago" onChange={(e) => handleChange('paymentWindow', e.target.value)}>
                    <MenuItem value={1}>Ventana 1 (1–5)</MenuItem>
                    <MenuItem value={2}>Ventana 2 (15–20)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Estado</InputLabel>
                  <Select value={formData.status} label="Estado" onChange={(e) => handleChange('status', e.target.value)}>
                    <MenuItem value="active">Activo</MenuItem>
                    <MenuItem value="inactive">Inactivo</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Equipos</InputLabel>
                  <Select
                    multiple
                    value={formData.teamIds}
                    label="Equipos"
                    onChange={(e) => handleChange('teamIds', e.target.value)}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((teamId) => {
                          const team = teams.find(t => t.id === teamId)
                          return <Chip key={teamId} label={team ? team.name : teamId} size="small" />
                        })}
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
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 1 }}>
                  <Button onClick={cancelEditing} disabled={saving}>Cancelar</Button>
                  <Button variant="contained" sx={{ bgcolor: '#2e7d32' }} onClick={handleSave} disabled={saving || !formData.name || !formData.phone}>
                    {saving ? 'Guardando...' : 'Guardar'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          ) : (
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">Email</Typography>
                <Typography>{student.email || '—'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">Teléfono</Typography>
                <Typography>{student.phone || '—'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">Fecha de Nacimiento</Typography>
                <Typography>{student.dateOfBirth || '—'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">Posición</Typography>
                <Typography>{student.position || '—'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">Estado</Typography>
                <Chip label={student.status === 'inactive' ? 'Inactivo' : 'Activo'} color={student.status === 'inactive' ? 'default' : 'success'} size="small" />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">Ventana de Pago</Typography>
                <Typography>{student.paymentWindow === 2 ? 'Ventana 2 (15–20)' : 'Ventana 1 (1–5)'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Dirección</Typography>
                <Typography>{student.address || '—'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">Contacto de Emergencia</Typography>
                <Typography>{student.emergencyContact || '—'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">Teléfono de Emergencia</Typography>
                <Typography>{student.emergencyPhone || '—'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Equipos</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
                  {(student.teamIds || []).length === 0 ? (
                    <Typography>—</Typography>
                  ) : (
                    student.teamIds.map((teamId) => {
                      const team = teams.find(t => t.id === teamId)
                      return <Chip key={teamId} label={team ? team.name : teamId} size="small" />
                    })
                  )}
                </Box>
              </Grid>
            </Grid>
          )}
        </Paper>
      </Container>
    </Box>
  )
}
