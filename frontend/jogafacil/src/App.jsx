import { useState } from 'react'
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Container,
  IconButton,
  FormControl,
  Select,
  MenuItem,
  Chip
} from '@mui/material'
import {
  SportsFootball,
  Dashboard as DashboardIcon,
  People,
  Groups,
  CalendarMonth,
  Payments as PaymentsIcon,
  Person,
  LocationOn,
  Menu as MenuIcon,
  Logout as LogoutIcon,
  AdminPanelSettings
} from '@mui/icons-material'

import Dashboard from './components/Dashboard'
import Students from './components/Students'
import Teams from './components/Teams'
import Schedule from './components/Schedule'
import Payments from './components/Payments'
import Coaches from './components/Coaches'
import Places from './components/Places'
import StudentDetail from './components/StudentDetail'
import Login from './components/Login'
import Users from './components/Users'
import { useAcademy } from './context/AcademyContext'
import { useAuth } from './context/AuthContext'

const drawerWidth = 240

const allMenuItems = [
  { id: 'dashboard', label: 'Panel de Control', icon: <DashboardIcon />, roles: ['admin'] },
  { id: 'students', label: 'Alumnos', icon: <People />, roles: ['admin'] },
  { id: 'teams', label: 'Equipos', icon: <Groups />, roles: ['admin', 'coach'] },
  { id: 'schedule', label: 'Calendario', icon: <CalendarMonth />, roles: ['admin', 'coach'] },
  { id: 'payments', label: 'Pagos', icon: <PaymentsIcon />, roles: ['admin'] },
  { id: 'coaches', label: 'Entrenadores', icon: <Person />, roles: ['admin'] },
  { id: 'places', label: 'Instalaciones', icon: <LocationOn />, roles: ['admin'] },
  { id: 'users', label: 'Administración', icon: <AdminPanelSettings />, roles: ['admin'] }
]

function App() {
  const { user, logout, isAdmin, isCoach } = useAuth()

  // If not authenticated, show login
  if (!user) {
    return <Login />
  }

  // Check for student detail query param (new tab view)
  const params = new URLSearchParams(window.location.search)
  const studentDetailId = params.get('student')

  if (studentDetailId) {
    return <StudentDetail studentId={studentDetailId} />
  }

  return <AuthenticatedApp />
}

function AuthenticatedApp() {
  const { user, logout, isAdmin, isCoach } = useAuth()
  const [currentView, setCurrentView] = useState(() => {
    // Default view based on role
    return isCoach ? 'schedule' : 'dashboard'
  })
  const [mobileOpen, setMobileOpen] = useState(false)
  const { academy, selectAcademy, academies } = useAcademy()

  const menuItems = allMenuItems.filter(item => item.roles.includes(user.role))

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return isAdmin ? <Dashboard /> : <Schedule />
      case 'students': return isAdmin ? <Students /> : <Schedule />
      case 'teams': return <Teams />
      case 'schedule': return <Schedule />
      case 'payments': return isAdmin ? <Payments /> : <Schedule />
      case 'coaches': return isAdmin ? <Coaches /> : <Schedule />
      case 'places': return isAdmin ? <Places /> : <Schedule />
      case 'users': return isAdmin ? <Users /> : <Schedule />
      default: return isCoach ? <Schedule /> : <Dashboard />
    }
  }

  const roleLabel = user.role === 'admin' ? 'Admin' : 'Entrenador'

  const drawer = (
    <Box>
      <Toolbar sx={{ bgcolor: '#2e7d32', color: 'white' }}>
        <SportsFootball sx={{ mr: 2 }} />
        <Typography variant="h6" noWrap>
          JogaFacil
        </Typography>
      </Toolbar>
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.id} disablePadding>
            <ListItemButton
              selected={currentView === item.id}
              onClick={() => {
                setCurrentView(item.id)
                setMobileOpen(false)
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          bgcolor: '#2e7d32'
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen(!mobileOpen)}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Escuela de Fútbol
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <Select
                value={academy}
                onChange={(e) => selectAcademy(e.target.value)}
                displayEmpty
                sx={{
                  color: 'white',
                  '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
                  '.MuiSvgIcon-root': { color: 'white' }
                }}
              >
                <MenuItem value="" disabled>Seleccionar Academia</MenuItem>
                {academies.map((a) => (
                  <MenuItem key={a.id || a} value={a.id || a}>{a.name || a}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Chip
              label={`${user.email} (${roleLabel})`}
              size="small"
              sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
              variant="outlined"
            />
            <IconButton color="inherit" onClick={logout} title="Cerrar sesión" aria-label="Cerrar sesión">
              <LogoutIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth }
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth }
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` }
        }}
      >
        <Toolbar />
        <Container maxWidth="lg">
          {renderView()}
        </Container>
      </Box>
    </Box>
  )
}

export default App
