import { useState, useMemo } from 'react'
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  TableSortLabel
} from '@mui/material'
import { CheckCircle, Warning, Error, Receipt, Search, FilterList } from '@mui/icons-material'

export default function Payments() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('Todos')
  const [orderBy, setOrderBy] = useState('student')
  const [order, setOrder] = useState('asc')

  const payments = [
    { id: 1, student: 'Juan Pérez', month: 'Febrero 2026', amount: 50, status: 'Pagado', date: '2026-02-05' },
    { id: 2, student: 'María García', month: 'Febrero 2026', amount: 50, status: 'Pendiente', date: '-' },
    { id: 3, student: 'Carlos López', month: 'Febrero 2026', amount: 50, status: 'Pagado', date: '2026-02-03' },
    { id: 4, student: 'Ana Martínez', month: 'Febrero 2026', amount: 50, status: 'Pagado', date: '2026-02-01' },
    { id: 5, student: 'Pedro Sánchez', month: 'Enero 2026', amount: 50, status: 'Vencido', date: '-' },
    { id: 6, student: 'Pedro Sánchez', month: 'Febrero 2026', amount: 50, status: 'Vencido', date: '-' },
    { id: 7, student: 'Laura Rodríguez', month: 'Febrero 2026', amount: 50, status: 'Pendiente', date: '-' },
    { id: 8, student: 'Diego Fernández', month: 'Febrero 2026', amount: 50, status: 'Pagado', date: '2026-02-10' }
  ]

  const filteredAndSortedPayments = useMemo(() => {
    let filtered = payments.filter(payment => {
      const matchesSearch = payment.student.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'Todos' || payment.status === statusFilter
      return matchesSearch && matchesStatus
    })

    filtered.sort((a, b) => {
      let aValue = a[orderBy]
      let bValue = b[orderBy]

      if (orderBy === 'amount') {
        aValue = Number(aValue)
        bValue = Number(bValue)
      }

      if (aValue < bValue) return order === 'asc' ? -1 : 1
      if (aValue > bValue) return order === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [searchTerm, statusFilter, orderBy, order])

  const paymentMetrics = useMemo(() => {
    const pendingTotal = payments
      .filter(p => p.status === 'Pendiente')
      .reduce((sum, p) => sum + p.amount, 0)
    
    const overdueTotal = payments
      .filter(p => p.status === 'Vencido')
      .reduce((sum, p) => sum + p.amount, 0)
    
    const paidTotal = payments
      .filter(p => p.status === 'Pagado')
      .reduce((sum, p) => sum + p.amount, 0)

    return {
      pending: pendingTotal,
      overdue: overdueTotal,
      paid: paidTotal,
      total: pendingTotal + overdueTotal
    }
  }, [payments])

  const handleSort = (property) => {
    const isAsc = orderBy === property && order === 'asc'
    setOrder(isAsc ? 'desc' : 'asc')
    setOrderBy(property)
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Pagado': return <CheckCircle fontSize="small" />
      case 'Pendiente': return <Warning fontSize="small" />
      case 'Vencido': return <Error fontSize="small" />
      default: return null
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pagado': return 'success'
      case 'Pendiente': return 'warning'
      case 'Vencido': return 'error'
      default: return 'default'
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Pagos
        </Typography>
        <Button variant="contained" startIcon={<Receipt />} sx={{ bgcolor: '#2e7d32' }}>
          Registrar Pago
        </Button>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 2,
              bgcolor: statusFilter === 'Pendiente' ? '#ffe0b2' : '#fff3e0',
              borderLeft: '4px solid #ff9800',
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                bgcolor: '#ffe0b2',
                transform: 'translateY(-2px)',
                boxShadow: 2
              }
            }}
            onClick={() => setStatusFilter(statusFilter === 'Pendiente' ? 'Todos' : 'Pendiente')}
          >
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Pendientes
            </Typography>
            <Typography variant="h4" fontWeight="bold" color="#ed6c02">
              ${paymentMetrics.pending}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 2,
              bgcolor: statusFilter === 'Vencido' ? '#ffcdd2' : '#ffebee',
              borderLeft: '4px solid #f44336',
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                bgcolor: '#ffcdd2',
                transform: 'translateY(-2px)',
                boxShadow: 2
              }
            }}
            onClick={() => setStatusFilter(statusFilter === 'Vencido' ? 'Todos' : 'Vencido')}
          >
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Vencidos
            </Typography>
            <Typography variant="h4" fontWeight="bold" color="#d32f2f">
              ${paymentMetrics.overdue}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 2,
              bgcolor: '#fce4ec',
              borderLeft: '4px solid #e91e63',
              opacity: 0.7
            }}
          >
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Total por Cobrar
            </Typography>
            <Typography variant="h4" fontWeight="bold" color="#c2185b">
              ${paymentMetrics.total}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 2,
              bgcolor: statusFilter === 'Pagado' ? '#c8e6c9' : '#e8f5e9',
              borderLeft: '4px solid #4caf50',
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                bgcolor: '#c8e6c9',
                transform: 'translateY(-2px)',
                boxShadow: 2
              }
            }}
            onClick={() => setStatusFilter(statusFilter === 'Pagado' ? 'Todos' : 'Pagado')}
          >
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Cobrado
            </Typography>
            <Typography variant="h4" fontWeight="bold" color="#2e7d32">
              ${paymentMetrics.paid}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Buscar por alumno..."
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
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Filtrar por Estado</InputLabel>
              <Select
                value={statusFilter}
                label="Filtrar por Estado"
                onChange={(e) => setStatusFilter(e.target.value)}
                startAdornment={
                  <InputAdornment position="start">
                    <FilterList />
                  </InputAdornment>
                }
              >
                <MenuItem value="Todos">Todos</MenuItem>
                <MenuItem value="Pagado">Pagado</MenuItem>
                <MenuItem value="Pendiente">Pendiente</MenuItem>
                <MenuItem value="Vencido">Vencido</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ mb: 2, p: 2, bgcolor: '#f5f5f5' }}>
        <Typography variant="body2" color="text.secondary">
          Mostrando {filteredAndSortedPayments.length} de {payments.length} pagos
        </Typography>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'student'}
                  direction={orderBy === 'student' ? order : 'asc'}
                  onClick={() => handleSort('student')}
                >
                  Alumno
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'month'}
                  direction={orderBy === 'month' ? order : 'asc'}
                  onClick={() => handleSort('month')}
                >
                  Período
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'amount'}
                  direction={orderBy === 'amount' ? order : 'asc'}
                  onClick={() => handleSort('amount')}
                >
                  Monto
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'status'}
                  direction={orderBy === 'status' ? order : 'asc'}
                  onClick={() => handleSort('status')}
                >
                  Estado
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'date'}
                  direction={orderBy === 'date' ? order : 'asc'}
                  onClick={() => handleSort('date')}
                >
                  Fecha de Pago
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAndSortedPayments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    No se encontraron pagos
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedPayments.map((payment) => (
                <TableRow key={payment.id} hover>
                  <TableCell>{payment.student}</TableCell>
                  <TableCell>{payment.month}</TableCell>
                  <TableCell>${payment.amount}</TableCell>
                  <TableCell>
                    <Chip
                      icon={getStatusIcon(payment.status)}
                      label={payment.status}
                      color={getStatusColor(payment.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{payment.date}</TableCell>
                  <TableCell align="right">
                    {payment.status !== 'Pagado' && (
                      <Button size="small" variant="outlined" color="success">
                        Marcar Pagado
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}
