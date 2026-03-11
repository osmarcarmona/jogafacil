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
  MenuItem
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
  Menu as MenuIcon
} from '@mui/icons-material'

import Dashboard from './components/Dashboard'
import Students from './components/Students'
import Teams from './components/Teams'
import Schedule from './components/Schedule'
import Payments from './components/Payments'
import Coaches from './components/Coaches'
import Places from './components/Places'
import StudentDetail from './components/StudentDetail'
import { useAcademy } from './context/AcademyContext'

const drawerWidth = 240

function App() {
  // Check for student detail query param (new tab view)
  const params = new URLSearchParams(window.location.search)
  const studentDetailId = params.get('student')

  if (studentDetailId) {
    return <StudentDetail studentId={studentDetailId} />
  }

  const [currentView, setCurrentView] = useState('dashboard')
  const [mobileOpen, setMobileOpen] = useState(false)
  const { academy, selectAcademy, academies } = useAcademy()

  const menuItems = [
    { id: 'dashboard', label: 'Panel de Control', icon: <DashboardIcon /> },
    { id: 'students', label: 'Alumnos', icon: <People /> },
    { id: 'teams', label: 'Equipos', icon: <Groups /> },
    { id: 'schedule', label: 'Calendario', icon: <CalendarMonth /> },
    { id: 'payments', label: 'Pagos', icon: <PaymentsIcon /> },
    { id: 'coaches', label: 'Entrenadores', icon: <Person /> },
    { id: 'places', label: 'Instalaciones', icon: <LocationOn /> }
  ]

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard />
      case 'students': return <Students />
      case 'teams': return <Teams />
      case 'schedule': return <Schedule />
      case 'payments': return <Payments />
      case 'coaches': return <Coaches />
      case 'places': return <Places />
      default: return <Dashboard />
    }
  }

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
                <MenuItem key={a.id || a} value={a.name || a}>{a.name || a}</MenuItem>
              ))}
            </Select>
          </FormControl>
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
