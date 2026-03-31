import { useState, useEffect } from 'react'
import {
  Box, Typography, Button, Alert, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem, Grid, Chip, OutlinedInput
} from '@mui/material'
import { Add, Edit, Delete } from '@mui/icons-material'
import { usersApi, coachesApi } from '../services/api'
import { useAcademy } from '../context/AcademyContext'

export default function Users() {
  const { academy, academies: availableAcademies } = useAcademy()
  const [users, setUsers] = useState([])
  const [coaches, setCoaches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [openDialog, setOpenDialog] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [formData, setFormData] = useState({
    email: '', password: '', name: '', role: 'coach', academies: [], coachId: ''
  })

  useEffect(() => { loadData() }, [academy])

  const loadData = async () => {
    try {
      setLoading(true)
      const [uData, cData] = await Promise.all([
        usersApi.getAll(academy),
        coachesApi.getAll(academy)
      ])
      setUsers(uData.users || [])
      setCoaches(cData.coaches || [])
      setError(null)
    } catch (err) {
      setError('Error al cargar usuarios: ' + err.message)
    } finally { setLoading(false) }
  }

  const getUserAcademies = (u) => u.academies || (u.academy ? [u.academy] : [])

  const handleOpenCreate = () => {
    setEditingUser(null)
    setFormData({ email: '', password: '', name: '', role: 'coach', academies: academy ? [academy] : [], coachId: '' })
    setOpenDialog(true)
  }

  const handleOpenEdit = (user) => {
    setEditingUser(user)
    setFormData({
      email: user.email || '',
      password: '',
      name: user.name || '',
      role: user.role || 'coach',
      academies: getUserAcademies(user),
      coachId: user.coachId || ''
    })
    setOpenDialog(true)
  }

  const handleClose = () => { setOpenDialog(false); setEditingUser(null) }

  const handleSubmit = async () => {
    try {
      const payload = {
        ...formData,
        academy: formData.academies[0] || '',
      }
      if (editingUser) {
        if (!payload.password) delete payload.password
        delete payload.email
        await usersApi.update(editingUser.id, payload)
      } else {
        await usersApi.create(payload)
      }
      handleClose()
      loadData()
    } catch (err) {
      setError(`Error al ${editingUser ? 'actualizar' : 'crear'} usuario: ` + err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este usuario?')) return
    try { await usersApi.delete(id); loadData() }
    catch (err) { setError('Error al eliminar usuario: ' + err.message) }
  }

  if (loading) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
      <CircularProgress />
    </Box>
  )

  const roleColor = (role) => role === 'admin' ? 'error' : 'primary'

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">Administración de Usuarios</Typography>
        <Button variant="contained" startIcon={<Add />} sx={{ bgcolor: '#2e7d32' }} onClick={handleOpenCreate}>
          Nuevo Usuario
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!academy && <Alert severity="warning" sx={{ mb: 2 }}>Selecciona una academia para ver usuarios.</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Rol</TableCell>
              <TableCell>Academias</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Entrenador</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">No hay usuarios registrados</TableCell>
              </TableRow>
            ) : users.map((u) => (
              <TableRow key={u.id} hover>
                <TableCell>{u.name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <Chip label={u.role === 'admin' ? 'Admin' : 'Entrenador'} size="small" color={roleColor(u.role)} />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {getUserAcademies(u).map(a => (
                      <Chip key={a} label={a} size="small" variant="outlined" />
                    ))}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip label={u.status === 'active' ? 'Activo' : 'Inactivo'} size="small"
                    color={u.status === 'active' ? 'success' : 'default'} variant="outlined" />
                </TableCell>
                <TableCell>
                  {u.coachId ? (coaches.find(c => c.id === u.coachId)?.name || u.coachId) : '—'}
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => handleOpenEdit(u)}><Edit fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(u.id)}><Delete fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField fullWidth required label="Nombre" value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth required label="Email" type="email" value={formData.email}
                  disabled={!!editingUser}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label={editingUser ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
                  type="password" required={!editingUser} value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Rol</InputLabel>
                  <Select value={formData.role} label="Rol"
                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}>
                    <MenuItem value="admin">Admin</MenuItem>
                    <MenuItem value="coach">Entrenador</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Academias</InputLabel>
                  <Select
                    multiple
                    value={formData.academies}
                    onChange={(e) => setFormData(prev => ({ ...prev, academies: e.target.value }))}
                    input={<OutlinedInput label="Academias" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map(v => <Chip key={v} label={v} size="small" />)}
                      </Box>
                    )}
                  >
                    {availableAcademies.map(a => {
                      const id = a.id || a
                      const name = a.name || a
                      return <MenuItem key={id} value={id}>{name}</MenuItem>
                    })}
                  </Select>
                </FormControl>
              </Grid>
              {formData.role === 'coach' && (
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Entrenador vinculado</InputLabel>
                    <Select value={formData.coachId} label="Entrenador vinculado"
                      onChange={(e) => setFormData(prev => ({ ...prev, coachId: e.target.value }))}>
                      <MenuItem value="">Ninguno</MenuItem>
                      {coaches.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
              )}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained" sx={{ bgcolor: '#2e7d32' }}
            disabled={!formData.name || !formData.email || formData.academies.length === 0 || (!editingUser && !formData.password)}>
            {editingUser ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
