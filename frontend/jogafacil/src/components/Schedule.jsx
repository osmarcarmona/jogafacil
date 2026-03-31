import { useState, useEffect, useRef } from 'react'
import {
  Box, Typography, Tabs, Tab, Paper, List, ListItem, ListItemText, Chip,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, Grid, CircularProgress,
  Alert, IconButton, ToggleButtonGroup, ToggleButton, Tooltip, Autocomplete
} from '@mui/material'
import { LocationOn, AccessTime, Add, Delete, Edit, ViewList, CalendarMonth, ChevronLeft, ChevronRight, Visibility, Share, ContentCopy } from '@mui/icons-material'
import { scheduleApi, teamsApi, coachesApi, placesApi, studentsApi } from '../services/api'
import { useAcademy } from '../context/AcademyContext'
import { useAuth } from '../context/AuthContext'
import RosterSelector from './RosterSelector'
import { filterPlayersByTeam } from '../utils/rosterUtils'
import html2canvas from 'html2canvas-pro'

const initialFormData = {
  teamId: '', coachId: '', placeId: '', placeName: '', date: '',
  arrivalTime: '', startTime: '', kit: '',
  opponent: '', matchType: 'Local',
  fieldType: '', jornada: '',
  roster: []
}

export default function Schedule() {
  const { academy } = useAcademy()
  const { user, isAdmin, isCoach } = useAuth()
  const [tab, setTab] = useState(0)
  const [events, setEvents] = useState([])
  const [teams, setTeams] = useState([])
  const [coaches, setCoaches] = useState([])
  const [places, setPlaces] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [openDialog, setOpenDialog] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [eventType, setEventType] = useState('training')
  const [formData, setFormData] = useState(initialFormData)
  const [filterDateFrom, setFilterDateFrom] = useState(() => {
    const now = new Date()
    const day = now.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const monday = new Date(now)
    monday.setDate(now.getDate() + diff)
    return monday.toISOString().split('T')[0]
  })
  const [filterDateTo, setFilterDateTo] = useState(() => {
    const now = new Date()
    const day = now.getDay()
    const diff = day === 0 ? 0 : 7 - day
    const sunday = new Date(now)
    sunday.setDate(now.getDate() + diff)
    return sunday.toISOString().split('T')[0]
  })
  const [filterTeam, setFilterTeam] = useState('')
  const [viewMode, setViewMode] = useState('list') // 'list' | 'calendar'
  const [calendarMode, setCalendarMode] = useState('month') // 'month' | 'week'
  const [currentDate, setCurrentDate] = useState(new Date())
  const [detailEvent, setDetailEvent] = useState(null)
  const detailRef = useRef(null)

  const handleShareImage = async () => {
    if (!detailRef.current) return
    try {
      const canvas = await html2canvas(detailRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
      })
      canvas.toBlob(async (blob) => {
        if (!blob) return
        const file = new File([blob], 'convocatoria.png', { type: 'image/png' })
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: 'Convocatoria' })
        } else {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = 'convocatoria.png'
          a.click()
          URL.revokeObjectURL(url)
        }
      }, 'image/png')
    } catch (err) {
      console.error('Error generating image:', err)
    }
  }

  const [copied, setCopied] = useState(false)

  const handleCopyImage = async () => {
    if (!detailRef.current) return
    try {
      const canvas = await html2canvas(detailRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
      })
      canvas.toBlob(async (blob) => {
        if (!blob) return
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ])
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        } catch (err) {
          console.error('Clipboard write failed:', err)
        }
      }, 'image/png')
    } catch (err) {
      console.error('Error generating image:', err)
    }
  }

  useEffect(() => { loadAll() }, [academy])

  const loadAll = async () => {
    try {
      setLoading(true)
      const [sData, tData, cData, pData, stData] = await Promise.all([
        scheduleApi.getAll(academy), teamsApi.getAll(academy),
        coachesApi.getAll(academy), placesApi.getAll(academy),
        studentsApi.getAll(academy)
      ])
      setEvents(sData.schedule || [])
      setTeams(tData.teams || [])
      setCoaches(cData.coaches || [])
      setPlaces(pData.places || [])
      setStudents(stData.students || [])
      setError(null)
    } catch (err) {
      setError('Error al cargar datos: ' + err.message)
    } finally { setLoading(false) }
  }

  const getName = (list, id) => list.find(i => i.id === id)?.name || id
  const getPlaceName = (ev) => {
    if (ev.placeName) return ev.placeName
    return getName(places, ev.placeId)
  }
  const getTeamCoaches = (teamId) => {
    const team = teams.find(t => t.id === teamId)
    if (!team) return coaches
    const ids = team.coachIds || (team.coachId ? [team.coachId] : [])
    return ids.length ? coaches.filter(c => ids.includes(c.id)) : coaches
  }
  const applyFilters = (items) => {
    let filtered = items
    if (filterDateFrom) filtered = filtered.filter(e => e.date >= filterDateFrom)
    if (filterDateTo) filtered = filtered.filter(e => e.date <= filterDateTo)
    if (filterTeam) filtered = filtered.filter(e => e.teamId === filterTeam)
    return filtered
  }
  const trainings = applyFilters(events.filter(e => e.type === 'training'))
  const matches = applyFilters(events.filter(e => e.type === 'match'))

  // Coach can only write to teams they are assigned to
  const canWriteEvent = (ev) => {
    if (isAdmin) return true
    if (!isCoach || !user?.coachId) return false
    const team = teams.find(t => t.id === ev.teamId)
    if (!team) return false
    const coachIds = team.coachIds || (team.coachId ? [team.coachId] : [])
    return coachIds.includes(user.coachId)
  }

  const canCreateEvents = isAdmin || isCoach

  const handleOpenDialog = () => {
    setEditingEvent(null); setEventType(tab === 1 ? 'match' : 'training')
    setFormData(initialFormData); setOpenDialog(true)
  }
  const handleOpenEditDialog = (ev) => {
    setEditingEvent(ev); setEventType(ev.type || 'training')
    setFormData({
      teamId: ev.teamId || '', coachId: ev.coachId || '',
      placeId: ev.placeId || '', placeName: ev.placeName || '',
      date: ev.date || '',
      arrivalTime: ev.arrivalTime || '', startTime: ev.startTime || '',
      kit: ev.kit || '', opponent: ev.opponent || '',
      matchType: ev.matchType || 'Local',
      fieldType: ev.fieldType || '', jornada: ev.jornada || '',
      roster: ev.roster || []
    })
    setOpenDialog(true)
  }
  const handleCloseDialog = () => {
    setOpenDialog(false); setEditingEvent(null); setFormData(initialFormData)
  }
  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value }
      if (field === 'teamId') {
        const team = teams.find(t => t.id === value)
        const ids = team?.coachIds || (team?.coachId ? [team.coachId] : [])
        updated.coachId = ids.length === 1 ? ids[0] : ''
        updated.roster = []
      }
      return updated
    })
  }
  const handleSubmit = async () => {
    try {
      const payload = { ...formData, type: eventType, academy }
      // If custom place name was typed (no placeId), send placeName
      if (!payload.placeId && payload.placeName) {
        delete payload.placeId
      } else {
        delete payload.placeName
      }
      if (eventType === 'training') { delete payload.opponent; delete payload.matchType; delete payload.roster; delete payload.fieldType; delete payload.jornada }
      if (editingEvent) await scheduleApi.update(editingEvent.id, payload)
      else await scheduleApi.create(payload)
      handleCloseDialog(); loadAll()
    } catch (err) {
      setError((editingEvent ? 'Error al actualizar' : 'Error al crear') + ' evento: ' + err.message)
    }
  }
  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este evento?')) return
    try { await scheduleApi.delete(id); loadAll() }
    catch (err) { setError('Error al eliminar evento: ' + err.message) }
  }

  if (loading) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
      <CircularProgress />
    </Box>
  )

  const availableCoaches = formData.teamId ? getTeamCoaches(formData.teamId) : coaches
  // Coaches can only create/edit events for their assigned teams
  const availableTeams = isCoach && user?.coachId
    ? teams.filter(t => {
        const coachIds = t.coachIds || (t.coachId ? [t.coachId] : [])
        return coachIds.includes(user.coachId)
      })
    : teams
  const hasPlace = !!(formData.placeId || formData.placeName)
  const isFormValid = formData.teamId && formData.coachId && formData.date
    && formData.arrivalTime && formData.startTime && hasPlace
    && (eventType === 'training' || formData.opponent)
  const canSubmit = editingEvent ? (formData.teamId && formData.date) : isFormValid

  const renderList = (items, isMatch) => (
    <List>
      {items.length === 0 ? (
        <ListItem>
          <ListItemText primary={
            <Typography align="center" color="text.secondary">
              No hay {isMatch ? 'partidos' : 'entrenamientos'} registrados
            </Typography>
          } />
        </ListItem>
      ) : items.map((ev) => (
        <ListItem key={ev.id} divider secondaryAction={
          <Box>
            {isMatch && (
              <Button size="small" startIcon={<Visibility fontSize="small" />} onClick={() => setDetailEvent(ev)}>Ver</Button>
            )}
            {canWriteEvent(ev) && (
              <>
                <Button size="small" onClick={() => handleOpenEditDialog(ev)}>Editar</Button>
                <IconButton size="small" color="error" onClick={() => handleDelete(ev.id)}>
                  <Delete fontSize="small" />
                </IconButton>
              </>
            )}
          </Box>
        }>
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {getName(teams, ev.teamId)}
                  {isMatch && ev.opponent ? ` vs ${ev.opponent}` : ''}
                </Typography>
                {isMatch && ev.matchType && (
                  <Chip label={ev.matchType} size="small"
                    color={ev.matchType === 'Local' ? 'success' : 'warning'} />
                )}
              </Box>
            }
            secondary={
              <Box sx={{ mt: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <AccessTime fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    {ev.date} — Llegada: {ev.arrivalTime} | Inicio: {ev.startTime}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <LocationOn fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    {getPlaceName(ev)}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Entrenador: {getName(coaches, ev.coachId)}
                  {ev.kit ? ` | Equipación: ${ev.kit}` : ''}
                </Typography>
                {isMatch && (ev.fieldType || ev.jornada) && (
                  <Typography variant="body2" color="text.secondary">
                    {ev.fieldType ? `Cancha: ${ev.fieldType}` : ''}
                    {ev.fieldType && ev.jornada ? ' | ' : ''}
                    {ev.jornada || ''}
                  </Typography>
                )}
                {isMatch && ev.roster && ev.roster.length > 0 && (
                  <Typography variant="body2" color="text.secondary">
                    Convocados: {ev.roster.length}
                  </Typography>
                )}
              </Box>
            }
          />
        </ListItem>
      ))}
    </List>
  )

  // Calendar helpers
  const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
  const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

  const toDateStr = (d) => d.toISOString().split('T')[0]

  const getMonthDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    let startOffset = firstDay.getDay() - 1
    if (startOffset < 0) startOffset = 6
    const days = []
    for (let i = -startOffset; i <= lastDay.getDate() - 1; i++) {
      const d = new Date(year, month, i + 1)
      days.push(d)
    }
    while (days.length % 7 !== 0) {
      days.push(new Date(year, month, lastDay.getDate() + (days.length - lastDay.getDate() - startOffset + 1)))
    }
    return days
  }

  const getWeekDays = () => {
    const d = new Date(currentDate)
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const monday = new Date(d)
    monday.setDate(d.getDate() + diff)
    return Array.from({ length: 7 }, (_, i) => {
      const wd = new Date(monday)
      wd.setDate(monday.getDate() + i)
      return wd
    })
  }

  const navigateCalendar = (direction) => {
    const d = new Date(currentDate)
    if (calendarMode === 'month') d.setMonth(d.getMonth() + direction)
    else d.setDate(d.getDate() + direction * 7)
    setCurrentDate(d)
  }

  const getEventsForDate = (dateStr) => {
    let filtered = events.filter(e => e.date === dateStr)
    if (filterTeam) filtered = filtered.filter(e => e.teamId === filterTeam)
    return filtered
  }

  const calendarTitle = calendarMode === 'month'
    ? `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    : (() => {
        const days = getWeekDays()
        const from = days[0]
        const to = days[6]
        return `${from.getDate()} ${MONTH_NAMES[from.getMonth()].slice(0, 3)} — ${to.getDate()} ${MONTH_NAMES[to.getMonth()].slice(0, 3)} ${to.getFullYear()}`
      })()

  const renderCalendar = () => {
    const days = calendarMode === 'month' ? getMonthDays() : getWeekDays()
    const today = toDateStr(new Date())
    const currentMonth = currentDate.getMonth()

    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton onClick={() => navigateCalendar(-1)}><ChevronLeft /></IconButton>
            <Typography variant="h6" sx={{ minWidth: 220, textAlign: 'center' }}>{calendarTitle}</Typography>
            <IconButton onClick={() => navigateCalendar(1)}><ChevronRight /></IconButton>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" variant="outlined" onClick={() => setCurrentDate(new Date())}>Hoy</Button>
            <ToggleButtonGroup size="small" value={calendarMode} exclusive
              onChange={(_, v) => v && setCalendarMode(v)}>
              <ToggleButton value="month">Mes</ToggleButton>
              <ToggleButton value="week">Semana</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>

        <Box sx={{
          display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
          border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden'
        }}>
          {DAY_NAMES.map(d => (
            <Box key={d} sx={{ p: 1, textAlign: 'center', bgcolor: 'grey.100', fontWeight: 'bold', fontSize: 13, borderBottom: '1px solid', borderColor: 'divider' }}>
              {d}
            </Box>
          ))}
          {days.map((day, idx) => {
            const dateStr = toDateStr(day)
            const dayEvents = getEventsForDate(dateStr)
            const isCurrentMonth = day.getMonth() === currentMonth
            const isToday = dateStr === today
            return (
              <Box key={idx} sx={{
                minHeight: calendarMode === 'week' ? 150 : 100,
                p: 0.5, borderRight: (idx + 1) % 7 !== 0 ? '1px solid' : 'none',
                borderBottom: '1px solid', borderColor: 'divider',
                bgcolor: isToday ? 'action.hover' : (!isCurrentMonth && calendarMode === 'month' ? 'grey.50' : 'background.paper'),
                opacity: !isCurrentMonth && calendarMode === 'month' ? 0.5 : 1
              }}>
                <Typography variant="caption" sx={{ fontWeight: isToday ? 'bold' : 'normal', color: isToday ? 'primary.main' : 'text.secondary' }}>
                  {day.getDate()}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3, mt: 0.3 }}>
                  {dayEvents.slice(0, calendarMode === 'week' ? 6 : 3).map(ev => (
                    <Tooltip key={ev.id} title={`${getName(teams, ev.teamId)} — ${ev.startTime} — ${getPlaceName(ev)}`} arrow>
                      <Box sx={{
                        display: 'flex', alignItems: 'center', gap: 0.3,
                        px: 0.5, py: 0.2, borderRadius: 0.5, fontSize: 11,
                        bgcolor: ev.type === 'match' ? 'warning.light' : 'success.light',
                        color: ev.type === 'match' ? 'warning.contrastText' : 'success.contrastText',
                        '&:hover .cal-actions': { display: canWriteEvent(ev) ? 'flex' : 'none' }
                      }}>
                        <Box sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: canWriteEvent(ev) ? 'pointer' : 'default' }}
                          onClick={() => canWriteEvent(ev) && handleOpenEditDialog(ev)}>
                          {ev.startTime} {getName(teams, ev.teamId)}
                        </Box>
                        {canWriteEvent(ev) && (
                          <Box className="cal-actions" sx={{ display: 'none', alignItems: 'center', gap: 0 }}>
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleOpenEditDialog(ev) }}
                              sx={{ p: 0.2, color: 'inherit' }}>
                              <Edit sx={{ fontSize: 12 }} />
                            </IconButton>
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDelete(ev.id) }}
                              sx={{ p: 0.2, color: 'inherit' }}>
                              <Delete sx={{ fontSize: 12 }} />
                            </IconButton>
                          </Box>
                        )}
                      </Box>
                    </Tooltip>
                  ))}
                  {dayEvents.length > (calendarMode === 'week' ? 6 : 3) && (
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, pl: 0.5 }}>
                      +{dayEvents.length - (calendarMode === 'week' ? 6 : 3)} más
                    </Typography>
                  )}
                </Box>
              </Box>
            )
          })}
        </Box>
      </Box>
    )
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h4" fontWeight="bold">Calendario</Typography>
          <ToggleButtonGroup size="small" value={viewMode} exclusive
            onChange={(_, v) => v && setViewMode(v)}>
            <ToggleButton value="list"><ViewList fontSize="small" /></ToggleButton>
            <ToggleButton value="calendar"><CalendarMonth fontSize="small" /></ToggleButton>
          </ToggleButtonGroup>
        </Box>
        <Button variant="contained" startIcon={<Add />} sx={{ bgcolor: '#2e7d32', display: canCreateEvents ? 'inline-flex' : 'none' }} onClick={handleOpenDialog}>
          Nuevo Evento
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!academy && <Alert severity="warning" sx={{ mb: 2 }}>Selecciona una academia en el encabezado para ver y crear eventos.</Alert>}

      {viewMode === 'list' && (
        <>
          <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              type="date" label="Desde" size="small"
              InputLabelProps={{ shrink: true }}
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              sx={{ minWidth: 160 }}
            />
            <TextField
              type="date" label="Hasta" size="small"
              InputLabelProps={{ shrink: true }}
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              sx={{ minWidth: 160 }}
            />
            <FormControl variant="standard" size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Filtrar por Equipo</InputLabel>
              <Select value={filterTeam} onChange={(e) => setFilterTeam(e.target.value)}>
                <MenuItem value="">Todos</MenuItem>
                {teams.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
              </Select>
            </FormControl>
            {(filterDateFrom || filterDateTo || filterTeam) && (
              <Button size="small" onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); setFilterTeam('') }}>
                Limpiar filtros
              </Button>
            )}
          </Paper>

          <Paper sx={{ mb: 3 }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
              <Tab label={`Entrenamientos (${trainings.length})`} />
              <Tab label={`Partidos (${matches.length})`} />
            </Tabs>
          </Paper>

          {tab === 0 && renderList(trainings, false)}
          {tab === 1 && renderList(matches, true)}
        </>
      )}

      {viewMode === 'calendar' && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
            <FormControl variant="standard" size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Filtrar por Equipo</InputLabel>
              <Select value={filterTeam} onChange={(e) => setFilterTeam(e.target.value)}>
                <MenuItem value="">Todos</MenuItem>
                {teams.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
              </Select>
            </FormControl>
            {filterTeam && (
              <Button size="small" onClick={() => setFilterTeam('')}>Limpiar filtro</Button>
            )}
          </Box>
          {renderCalendar()}
        </Paper>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingEvent ? 'Editar Evento' : 'Nuevo Evento'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl variant="standard" sx={{ m: 1, minWidth: 120 }} required fullWidth>
                  <InputLabel>Tipo de Evento</InputLabel>
                  <Select value={eventType} label="Tipo de Evento"
                    onChange={(e) => setEventType(e.target.value)}>
                    <MenuItem value="training">Entrenamiento</MenuItem>
                    <MenuItem value="match">Partido</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl variant="standard" sx={{ m: 1, minWidth: 120 }} required fullWidth>
                  <InputLabel>Equipo</InputLabel>
                  <Select value={formData.teamId} label="Equipo"
                    onChange={(e) => handleInputChange('teamId', e.target.value)}>
                    {availableTeams.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl variant="standard" sx={{ m: 1, minWidth: 120 }} required fullWidth>
                  <InputLabel>Entrenador</InputLabel>
                  <Select value={formData.coachId} label="Entrenador"
                    onChange={(e) => handleInputChange('coachId', e.target.value)}>
                    {availableCoaches.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl variant="standard" sx={{ m: 1, minWidth: 120 }} required fullWidth>
                  <Autocomplete
                    freeSolo
                    options={places}
                    getOptionLabel={(option) => {
                      if (typeof option === 'string') return option
                      return option.name || ''
                    }}
                    value={
                      formData.placeId
                        ? places.find(p => p.id === formData.placeId) || null
                        : formData.placeName || null
                    }
                    onChange={(_, newValue) => {
                      if (newValue && typeof newValue === 'object' && newValue.id) {
                        handleInputChange('placeId', newValue.id)
                        setFormData(prev => ({ ...prev, placeName: '' }))
                      } else {
                        handleInputChange('placeId', '')
                        setFormData(prev => ({ ...prev, placeName: typeof newValue === 'string' ? newValue : '' }))
                      }
                    }}
                    onInputChange={(_, inputValue, reason) => {
                      if (reason === 'input') {
                        const match = places.find(p => p.name === inputValue)
                        if (match) {
                          handleInputChange('placeId', match.id)
                          setFormData(prev => ({ ...prev, placeName: '' }))
                        } else {
                          handleInputChange('placeId', '')
                          setFormData(prev => ({ ...prev, placeName: inputValue }))
                        }
                      }
                    }}
                    renderInput={(params) => (
                      <TextField {...params} label="Instalación" required
                        placeholder="Seleccionar o escribir instalación" />
                    )}
                    isOptionEqualToValue={(option, value) => {
                      if (typeof value === 'string') return option.name === value
                      return option.id === value?.id
                    }}
                    fullWidth
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth required type="date" label="Fecha"
                  InputLabelProps={{ shrink: true }}
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)} />
              </Grid>
              <Grid item xs={6} sm={4}>
                <TextField fullWidth required type="time" label="Hora Llegada"
                  InputLabelProps={{ shrink: true }}
                  value={formData.arrivalTime}
                  onChange={(e) => handleInputChange('arrivalTime', e.target.value)} />
              </Grid>
              <Grid item xs={6} sm={4}>
                <TextField fullWidth required type="time" label="Hora Inicio"
                  InputLabelProps={{ shrink: true }}
                  value={formData.startTime}
                  onChange={(e) => handleInputChange('startTime', e.target.value)} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Equipación" placeholder="Ej: Camiseta roja"
                  value={formData.kit}
                  onChange={(e) => handleInputChange('kit', e.target.value)} />
              </Grid>
              {eventType === 'match' && (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth required label="Rival"
                      value={formData.opponent}
                      onChange={(e) => handleInputChange('opponent', e.target.value)} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl variant="standard" sx={{ m: 1, minWidth: 120 }} required fullWidth>
                      <InputLabel>Tipo de Partido</InputLabel>
                      <Select value={formData.matchType} label="Tipo de Partido"
                        onChange={(e) => handleInputChange('matchType', e.target.value)}>
                        <MenuItem value="Local">Local</MenuItem>
                        <MenuItem value="Visitante">Visitante</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl variant="standard" sx={{ m: 1, minWidth: 120 }} required fullWidth>
                      <Autocomplete
                        freeSolo
                        options={['Fútbol 7', 'Fútbol 8', 'Fútbol 11', 'Fútbol Sala']}
                        value={formData.fieldType || null}
                        onChange={(_, newValue) => handleInputChange('fieldType', newValue || '')}
                        onInputChange={(_, inputValue, reason) => {
                          if (reason === 'input') handleInputChange('fieldType', inputValue)
                        }}
                        renderInput={(params) => (
                          <TextField {...params} label="Tipo de Cancha" placeholder="Ej: Fútbol 7" />
                        )}
                        fullWidth
                      />
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl variant="standard" sx={{ m: 1, minWidth: 120 }} required fullWidth>
                      <Autocomplete
                        freeSolo
                        options={Array.from({ length: 38 }, (_, i) => `Jornada ${i + 1}`)}
                        value={formData.jornada || null}
                        onChange={(_, newValue) => handleInputChange('jornada', newValue || '')}
                        onInputChange={(_, inputValue, reason) => {
                          if (reason === 'input') handleInputChange('jornada', inputValue)
                        }}
                        renderInput={(params) => (
                          <TextField {...params} label="Jornada" placeholder="Ej: Jornada 1" />
                        )}
                        fullWidth
                      />
                    </FormControl>
                  </Grid>
                  {formData.teamId && (
                    <Grid item xs={12}>
                      <RosterSelector
                        players={filterPlayersByTeam(students, formData.teamId)}
                        selectedIds={formData.roster}
                        onChange={(newRoster) => setFormData(prev => ({ ...prev, roster: newRoster }))}
                      />
                    </Grid>
                  )}
                </>
              )}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained" sx={{ bgcolor: '#2e7d32' }}
            disabled={!canSubmit}>
            {editingEvent ? 'Actualizar' : 'Crear'} Evento
          </Button>
        </DialogActions>
      </Dialog>

      {/* Match Detail Dialog */}
      <Dialog open={!!detailEvent} onClose={() => setDetailEvent(null)} maxWidth="sm" fullWidth>
        {detailEvent && (
          <>
            <DialogTitle>
              {getName(teams, detailEvent.teamId)}
              {detailEvent.opponent ? ` vs ${detailEvent.opponent}` : ''}
              {detailEvent.matchType && (
                <Chip label={detailEvent.matchType} size="small" sx={{ ml: 1 }}
                  color={detailEvent.matchType === 'Local' ? 'success' : 'warning'} />
              )}
            </DialogTitle>
            <DialogContent>
              <Box ref={detailRef} sx={{ display: 'flex', flexDirection: 'column', gap: 1, pt: 1, pb: 1 }}>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 0.5 }}>
                  {getName(teams, detailEvent.teamId)}
                  {detailEvent.opponent ? ` vs ${detailEvent.opponent}` : ''}
                  {detailEvent.matchType ? ` (${detailEvent.matchType})` : ''}
                </Typography>
                <Typography variant="body2">
                  <AccessTime fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                  {detailEvent.date} — Llegada: {detailEvent.arrivalTime} | Inicio: {detailEvent.startTime}
                </Typography>
                <Typography variant="body2">
                  <LocationOn fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                  {getPlaceName(detailEvent)}
                </Typography>
                <Typography variant="body2">
                  Entrenador: {getName(coaches, detailEvent.coachId)}
                  {detailEvent.kit ? ` | Equipación: ${detailEvent.kit}` : ''}
                </Typography>
                {(detailEvent.fieldType || detailEvent.jornada) && (
                  <Typography variant="body2">
                    {detailEvent.fieldType ? `Cancha: ${detailEvent.fieldType}` : ''}
                    {detailEvent.fieldType && detailEvent.jornada ? ' | ' : ''}
                    {detailEvent.jornada || ''}
                  </Typography>
                )}

                {detailEvent.roster && detailEvent.roster.length > 0 ? (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                      Convocados ({detailEvent.roster.length}):
                    </Typography>
                    <List dense>
                      {detailEvent.roster.map((playerId, idx) => (
                        <ListItem key={playerId} sx={{ py: 0.25 }}>
                          <ListItemText primary={`${idx + 1}. ${getName(students, playerId)}`} />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    No hay convocados definidos para este partido.
                  </Typography>
                )}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCopyImage} startIcon={<ContentCopy />} color="primary">
                {copied ? 'Copiado' : 'Copiar'}
              </Button>
              <Button onClick={handleShareImage} startIcon={<Share />} color="primary">
                Compartir
              </Button>
              <Button onClick={() => setDetailEvent(null)}>Cerrar</Button>
              <Button variant="contained" sx={{ bgcolor: '#2e7d32' }}
                onClick={() => { handleOpenEditDialog(detailEvent); setDetailEvent(null) }}>
                Editar
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  )
}