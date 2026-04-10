import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Box,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Alert,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'
import {
  TrendingUp,
  TrendingDown,
  MoneyOff,
  AttachMoney,
  PictureAsPdf,
} from '@mui/icons-material'
import { Button } from '@mui/material'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useAcademy } from '../context/AcademyContext'
import { paymentsApi, expensesApi, salariesApi } from '../services/api'
import {
  filterByMonth,
  computeMonthlySummary,
  computeMultiMonthSummaries,
} from '../utils/financialUtils'

const formatCurrency = (value) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)

const PAYMENT_TYPE_LABELS = {
  mensualidad: 'Mensualidad',
  inscripcion: 'Inscripción',
  custom: 'Personalizado',
}

const getCurrentMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function FinancialDashboard() {
  const { academy } = useAcademy()

  const [payments, setPayments] = useState([])
  const [expenses, setExpenses] = useState([])
  const [salaries, setSalaries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Single month selector
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth)
  // Multi-month range
  const [monthFrom, setMonthFrom] = useState(getCurrentMonth)
  const [monthTo, setMonthTo] = useState(getCurrentMonth)

  const fetchData = useCallback(async () => {
    if (!academy) return
    setLoading(true)
    setError(null)
    try {
      const [paymentsData, expensesData, salariesData] = await Promise.all([
        paymentsApi.getAll(academy),
        expensesApi.getAll(academy),
        salariesApi.getAll(academy),
      ])
      setPayments(paymentsData.payments || [])
      setExpenses(expensesData.expenses || [])
      setSalaries(salariesData.salaries || [])
    } catch (err) {
      setError('Error al cargar datos financieros: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [academy])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Single-month summary
  const summary = useMemo(() => {
    const mp = filterByMonth(payments, selectedMonth)
    const me = filterByMonth(expenses, selectedMonth)
    const ms = filterByMonth(salaries, selectedMonth)
    return computeMonthlySummary(mp, me, ms, selectedMonth)
  }, [payments, expenses, salaries, selectedMonth])

  // Multi-month summaries
  const multiMonthSummaries = useMemo(() => {
    return computeMultiMonthSummaries(payments, expenses, salaries, monthFrom, monthTo)
  }, [payments, expenses, salaries, monthFrom, monthTo])

  // Yearly net profit chart data (Jan–Dec of selected year)
  const selectedYear = selectedMonth.substring(0, 4)
  const yearlyNetProfit = useMemo(() => {
    const yearFrom = `${selectedYear}-01`
    const yearTo = `${selectedYear}-12`
    return computeMultiMonthSummaries(payments, expenses, salaries, yearFrom, yearTo)
  }, [payments, expenses, salaries, selectedYear])

  const generatePdf = useCallback(() => {
    const doc = new jsPDF()
    const fmt = (v) => formatCurrency(v)

    doc.setFontSize(18)
    doc.text('Resumen Financiero', 14, 20)
    doc.setFontSize(11)
    doc.text(`Mes: ${selectedMonth}`, 14, 28)

    // Summary table
    autoTable(doc, {
      startY: 34,
      head: [['Concepto', 'Monto']],
      body: [
        ['Ingreso Bruto', fmt(summary.grossIncome)],
        ['Ingreso Pendiente', fmt(summary.pendingIncome)],
        ['Egresos Totales', fmt(summary.totalOutflow)],
        ['  Gastos', fmt(summary.totalExpenses)],
        ['  Salarios', fmt(summary.totalSalaries)],
        ['Egresos Pendientes', fmt(summary.pendingOutflow)],
        ['Ganancia Neta', fmt(summary.netProfit)],
      ],
    })

    let y = doc.lastAutoTable.finalY + 10

    // Pagos detail
    const pagosRows = [
      ['Pagado', summary.paidPaymentsCount, fmt(summary.grossIncome)],
      ['Pendiente', summary.pendingPaymentsCount, fmt(summary.pendingIncome)],
    ]
    if (summary.incomeByPaymentType) {
      Object.entries(summary.incomeByPaymentType).forEach(([type, amt]) => {
        const label = PAYMENT_TYPE_LABELS[type] || type
        pagosRows.push([`  ${label}`, '', fmt(amt)])
      })
    }
    autoTable(doc, {
      startY: y,
      head: [['Pagos', 'Cantidad', 'Monto']],
      body: pagosRows,
    })
    y = doc.lastAutoTable.finalY + 10

    // Gastos detail
    const gastosRows = [
      ['Pagado', summary.paidExpensesCount, fmt(summary.totalExpenses)],
      ['Pendiente', summary.pendingExpensesCount, fmt(summary.pendingExpenses)],
    ]
    Object.entries(summary.expensesByCategory).forEach(([cat, { paid, pending }]) => {
      gastosRows.push([`  ${cat}`, '', `${fmt(paid + pending)} (Pagado: ${fmt(paid)} | Pendiente: ${fmt(pending)})`])
    })
    autoTable(doc, {
      startY: y,
      head: [['Gastos', 'Cantidad', 'Monto']],
      body: gastosRows,
    })
    y = doc.lastAutoTable.finalY + 10

    // Salarios detail
    const salariosRows = [
      ['Pagado', summary.paidSalariesCount, fmt(summary.totalSalaries)],
      ['Pendiente', summary.pendingSalariesCount, fmt(summary.pendingSalaries)],
    ]
    if (summary.salariesByCoach) {
      Object.entries(summary.salariesByCoach).forEach(([coach, amt]) => {
        salariosRows.push([`  ${coach}`, '', fmt(amt)])
      })
    }
    autoTable(doc, {
      startY: y,
      head: [['Salarios', 'Cantidad', 'Monto']],
      body: salariosRows,
    })
    y = doc.lastAutoTable.finalY + 10

    // Multi-month trend
    if (multiMonthSummaries.length > 0) {
      doc.setFontSize(13)
      doc.text('Tendencia Mensual', 14, y)
      autoTable(doc, {
        startY: y + 4,
        head: [['Mes', 'Ingreso Bruto', 'Egresos Totales', 'Ganancia Neta']],
        body: multiMonthSummaries.map((s) => [
          s.month,
          fmt(s.grossIncome),
          fmt(s.totalOutflow),
          fmt(s.netProfit),
        ]),
      })
    }

    doc.save(`resumen-financiero-${selectedMonth}.pdf`)
  }, [summary, multiMonthSummaries, selectedMonth])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="h5" fontWeight="bold">
          Resumen Financiero
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<PictureAsPdf />}
          onClick={generatePdf}
        >
          Exportar PDF
        </Button>
      </Box>

      {/* Month selector */}
      <Box sx={{ mb: 3 }}>
        <TextField
          label="Mes"
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          size="small"
          InputLabelProps={{ shrink: true }}
        />
      </Box>

      {/* Summary cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <AttachMoney color="success" />
              <Typography variant="subtitle2" color="text.secondary">Ingreso Bruto</Typography>
            </Box>
            <Typography variant="h5" fontWeight="bold">{formatCurrency(summary.grossIncome)}</Typography>
            <Typography variant="body2" color="text.secondary">
              Pendiente: {formatCurrency(summary.pendingIncome)}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <MoneyOff color="error" />
              <Typography variant="subtitle2" color="text.secondary">Egresos Totales</Typography>
            </Box>
            <Typography variant="h5" fontWeight="bold">{formatCurrency(summary.totalOutflow)}</Typography>
            <Typography variant="body2" color="text.secondary">
              Gastos: {formatCurrency(summary.totalExpenses)} | Salarios: {formatCurrency(summary.totalSalaries)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Pendiente: {formatCurrency(summary.pendingOutflow)}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              {summary.netProfit >= 0 ? <TrendingUp color="success" /> : <TrendingDown color="error" />}
              <Typography variant="subtitle2" color="text.secondary">Ganancia Neta</Typography>
            </Box>
            <Typography
              variant="h5"
              fontWeight="bold"
              color={summary.netProfit >= 0 ? 'success.main' : 'error.main'}
            >
              {formatCurrency(summary.netProfit)}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Detailed sections */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Pagos */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Pagos</Typography>
            <Typography variant="body2">Pagado: {formatCurrency(summary.grossIncome)} ({summary.paidPaymentsCount})</Typography>
            <Typography variant="body2">Pendiente: {formatCurrency(summary.pendingIncome)} ({summary.pendingPaymentsCount})</Typography>
            {Object.keys(summary.incomeByPaymentType || {}).length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary">Por tipo:</Typography>
                {Object.entries(summary.incomeByPaymentType).map(([type, amt]) => (
                  <Typography key={type} variant="body2" sx={{ pl: 1 }}>
                    {PAYMENT_TYPE_LABELS[type] || type}: {formatCurrency(amt)}
                  </Typography>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>
        {/* Gastos */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Gastos</Typography>
            <Typography variant="body2">Pagado: {formatCurrency(summary.totalExpenses)} ({summary.paidExpensesCount})</Typography>
            <Typography variant="body2">Pendiente: {formatCurrency(summary.pendingExpenses)} ({summary.pendingExpensesCount})</Typography>
            {Object.keys(summary.expensesByCategory).length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary">Por categoría:</Typography>
                {Object.entries(summary.expensesByCategory).map(([cat, { paid, pending }]) => (
                  <Typography key={cat} variant="body2" sx={{ pl: 1 }}>
                    {cat}: {formatCurrency(paid + pending)} (Pagado: {formatCurrency(paid)} | Pendiente: {formatCurrency(pending)})
                  </Typography>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>
        {/* Salarios */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Salarios</Typography>
            <Typography variant="body2">Pagado: {formatCurrency(summary.totalSalaries)} ({summary.paidSalariesCount})</Typography>
            <Typography variant="body2">Pendiente: {formatCurrency(summary.pendingSalaries)} ({summary.pendingSalariesCount})</Typography>
            {Object.keys(summary.salariesByCoach || {}).length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary">Por entrenador:</Typography>
                {Object.entries(summary.salariesByCoach).map(([coach, amt]) => (
                  <Typography key={coach} variant="body2" sx={{ pl: 1 }}>
                    {coach}: {formatCurrency(amt)}
                  </Typography>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Multi-month trend */}
      <Typography variant="h6" gutterBottom fontWeight="bold">
        Tendencia Mensual
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField
          label="Desde"
          type="month"
          value={monthFrom}
          onChange={(e) => setMonthFrom(e.target.value)}
          size="small"
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Hasta"
          type="month"
          value={monthTo}
          onChange={(e) => setMonthTo(e.target.value)}
          size="small"
          InputLabelProps={{ shrink: true }}
        />
      </Box>
      {multiMonthSummaries.length > 0 ? (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Mes</TableCell>
                <TableCell align="right">Ingreso Bruto</TableCell>
                <TableCell align="right">Egresos Totales</TableCell>
                <TableCell align="right">Ganancia Neta</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {multiMonthSummaries.map((s) => (
                <TableRow key={s.month}>
                  <TableCell>{s.month}</TableCell>
                  <TableCell align="right">{formatCurrency(s.grossIncome)}</TableCell>
                  <TableCell align="right">{formatCurrency(s.totalOutflow)}</TableCell>
                  <TableCell
                    align="right"
                    sx={{ color: s.netProfit >= 0 ? 'success.main' : 'error.main', fontWeight: 'bold' }}
                  >
                    {formatCurrency(s.netProfit)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Selecciona un rango válido para ver la tendencia.
        </Typography>
      )}

      {/* Yearly Net Profit Chart */}
      <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mt: 4 }}>
        Ganancia Neta — {selectedYear}
      </Typography>
      <Paper sx={{ p: 2 }}>
        {(() => {
          const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
          const values = yearlyNetProfit.map((s) => s.netProfit)
          const maxAbs = Math.max(...values.map(Math.abs), 1)
          const chartW = 600
          const chartH = 220
          const barW = chartW / 12 - 8
          const midY = chartH / 2

          return (
            <Box sx={{ overflowX: 'auto' }}>
              <svg width={chartW + 80} height={chartH + 40} style={{ display: 'block', margin: '0 auto' }}>
                {/* zero line */}
                <line x1={50} y1={midY} x2={chartW + 50} y2={midY} stroke="#bbb" strokeWidth={1} />
                {/* y-axis labels */}
                <text x={46} y={14} textAnchor="end" fontSize={10} fill="#888">{formatCurrency(maxAbs)}</text>
                <text x={46} y={midY + 4} textAnchor="end" fontSize={10} fill="#888">$0</text>
                <text x={46} y={chartH} textAnchor="end" fontSize={10} fill="#888">{formatCurrency(-maxAbs)}</text>
                {values.map((v, i) => {
                  const barH = (Math.abs(v) / maxAbs) * (midY - 10)
                  const x = 50 + i * (chartW / 12) + 4
                  const y = v >= 0 ? midY - barH : midY
                  const color = v >= 0 ? '#2e7d32' : '#d32f2f'
                  return (
                    <g key={i}>
                      <rect x={x} y={y} width={barW} height={barH || 1} fill={color} rx={2} />
                      <text x={x + barW / 2} y={chartH + 16} textAnchor="middle" fontSize={10} fill="#666">
                        {MONTH_LABELS[i]}
                      </text>
                      {v !== 0 && (
                        <text
                          x={x + barW / 2}
                          y={v >= 0 ? y - 4 : y + barH + 12}
                          textAnchor="middle"
                          fontSize={9}
                          fill={color}
                        >
                          {formatCurrency(v)}
                        </text>
                      )}
                    </g>
                  )
                })}
              </svg>
            </Box>
          )
        })()}
      </Paper>
    </Box>
  )
}
