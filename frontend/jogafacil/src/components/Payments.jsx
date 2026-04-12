import { useState, useEffect, useMemo, useCallback } from 'react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
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
  TableSortLabel,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Tabs,
  Tab,
  IconButton,
  Checkbox
} from '@mui/material'
import { CheckCircle, Warning, Error as ErrorIcon, Receipt, Search, FilterList, Payment as PaymentIcon, Edit, Delete, Add, PictureAsPdf, DeleteSweep } from '@mui/icons-material'
import { useAcademy } from '../context/AcademyContext'
import { paymentsApi, studentsApi, teamsApi, paymentTypesApi, expensesApi, salariesApi, coachesApi, scheduleApi } from '../services/api'
import { getDisplayStatus, filterPayments, filterPaymentsByType } from '../utils/paymentUtils'
import { getExpenseDisplayStatus, filterExpenses, filterExpensesByCategory, filterExpensesByDateRange, computeExpenseMetrics, validateExpense } from '../utils/expenseUtils'
import { getSalaryDisplayStatus, filterSalaries, filterSalariesByCoach, filterSalariesByTeam, filterSalariesByDateRange, computeSalaryMetrics } from '../utils/salaryUtils'

const STATUS_LABELS = {
  pending: 'Pendiente',
  paid: 'Pagado',
  overdue: 'Vencido',
  cancelled: 'Cancelado',
}

const PAYMENT_TYPE_LABELS = {
  mensualidad: 'Mensualidad',
  inscripcion: 'Inscripción',
  custom: 'Personalizado',
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'pix', label: 'Pix' },
]

const EXPENSE_CATEGORIES = [
  { value: 'Alquiler', label: 'Alquiler' },
  { value: 'Equipamiento', label: 'Equipamiento' },
  { value: 'Transporte', label: 'Transporte' },
  { value: 'Servicios', label: 'Servicios' },
  { value: 'Otros', label: 'Otros' },
]

export default function Payments() {
  const { academy } = useAcademy()
  const [payments, setPayments] = useState([])
  const [students, setStudents] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('Todos')
  const [teamFilter, setTeamFilter] = useState('Todos')
  const [typeFilter, setTypeFilter] = useState('Todos')

  // Period range — default to last 2 months
  const defaultMonthFrom = useMemo(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }, [])
  const defaultMonthTo = useMemo(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }, [])
  const [monthFrom, setMonthFrom] = useState(defaultMonthFrom)
  const [monthTo, setMonthTo] = useState(defaultMonthTo)

  const [orderBy, setOrderBy] = useState('studentName')
  const [order, setOrder] = useState('asc')

  // Create payment dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ studentId: '', amount: '', dueDate: '', description: '', templateId: '', teamId: '' })
  const [createMode, setCreateMode] = useState('individual') // 'individual' or 'team'
  const [createLoading, setCreateLoading] = useState(false)
  const [templates, setTemplates] = useState([])
  const [templatesLoading, setTemplatesLoading] = useState(false)

  // Mark-as-paid dialog
  const [payDialogOpen, setPayDialogOpen] = useState(false)
  const [payTarget, setPayTarget] = useState(null)
  const [payMethod, setPayMethod] = useState('cash')
  const [payAmount, setPayAmount] = useState('')
  const [payLoading, setPayLoading] = useState(false)

  // Edit payment dialog
  const [editPaymentOpen, setEditPaymentOpen] = useState(false)
  const [editPaymentForm, setEditPaymentForm] = useState({ amount: '', dueDate: '', description: '', status: '' })
  const [editPaymentId, setEditPaymentId] = useState(null)
  const [editPaymentLoading, setEditPaymentLoading] = useState(false)

  // Delete payment dialog
  const [deletePaymentOpen, setDeletePaymentOpen] = useState(false)
  const [deletePaymentTarget, setDeletePaymentTarget] = useState(null)

  // Bulk selection
  const [selectedPaymentIds, setSelectedPaymentIds] = useState(new Set())

  // Edit/delete abono dialog
  const [editAbonoOpen, setEditAbonoOpen] = useState(false)
  const [editAbonoPaymentId, setEditAbonoPaymentId] = useState(null)
  const [editAbonoIndex, setEditAbonoIndex] = useState(null)
  const [editAbonoForm, setEditAbonoForm] = useState({ amount: '', date: '', method: '' })
  const [editAbonoLoading, setEditAbonoLoading] = useState(false)
  const [deleteAbonoOpen, setDeleteAbonoOpen] = useState(false)
  const [deleteAbonoPaymentId, setDeleteAbonoPaymentId] = useState(null)
  const [deleteAbonoIndex, setDeleteAbonoIndex] = useState(null)
  const [deleteAbonoEntry, setDeleteAbonoEntry] = useState(null)

  // Generate payments
  const [generateLoading, setGenerateLoading] = useState(false)

  // Snackbar
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })

  // Active tab: 0 = Pagos, 1 = Tipos de Pago, 2 = Gastos, 3 = Salarios
  const [activeTab, setActiveTab] = useState(0)

  // --- Expenses state ---
  const [expenses, setExpenses] = useState([])
  const [expensesLoading, setExpensesLoading] = useState(false)
  const [expenseSearchTerm, setExpenseSearchTerm] = useState('')
  const [expenseStatusFilter, setExpenseStatusFilter] = useState('Todos')
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('Todos')
  const [expenseDateFrom, setExpenseDateFrom] = useState('')
  const [expenseDateTo, setExpenseDateTo] = useState('')

  // Expense create dialog
  const [expenseCreateOpen, setExpenseCreateOpen] = useState(false)
  const [expenseCreateForm, setExpenseCreateForm] = useState({ description: '', amount: '', category: 'Otros', dueDate: '', status: 'pending' })
  const [expenseCreateLoading, setExpenseCreateLoading] = useState(false)

  // Expense edit dialog
  const [expenseEditOpen, setExpenseEditOpen] = useState(false)
  const [expenseEditForm, setExpenseEditForm] = useState({ description: '', amount: '', category: '', dueDate: '', status: '' })
  const [expenseEditId, setExpenseEditId] = useState(null)
  const [expenseEditLoading, setExpenseEditLoading] = useState(false)

  // Expense mark-paid dialog
  const [expensePayOpen, setExpensePayOpen] = useState(false)
  const [expensePayTarget, setExpensePayTarget] = useState(null)
  const [expensePayMethod, setExpensePayMethod] = useState('cash')
  const [expensePayAmount, setExpensePayAmount] = useState('')
  const [expensePayLoading, setExpensePayLoading] = useState(false)

  // Expense delete dialog
  const [expenseDeleteOpen, setExpenseDeleteOpen] = useState(false)
  const [expenseDeleteTarget, setExpenseDeleteTarget] = useState(null)

  // --- Salarios state ---
  const [salaries, setSalaries] = useState([])
  const [salariesLoading, setSalariesLoading] = useState(false)
  const [coaches, setCoaches] = useState([])
  const [salarySearchTerm, setSalarySearchTerm] = useState('')
  const [salaryStatusFilter, setSalaryStatusFilter] = useState('Todos')
  const [salaryCoachFilter, setSalaryCoachFilter] = useState('Todos')
  const [salaryTeamFilter, setSalaryTeamFilter] = useState('Todos')
  const [salaryDateFrom, setSalaryDateFrom] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  })
  const [salaryDateTo, setSalaryDateTo] = useState(() => {
    const d = new Date()
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  })

  // Salary generate
  const [salaryGenerateMonth, setSalaryGenerateMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [salaryGenerateLoading, setSalaryGenerateLoading] = useState(false)

  // Salary edit dialog
  const [salaryEditOpen, setSalaryEditOpen] = useState(false)
  const [salaryEditForm, setSalaryEditForm] = useState({ amount: '', dueDate: '', status: '' })
  const [salaryEditId, setSalaryEditId] = useState(null)
  const [salaryEditOriginalAmount, setSalaryEditOriginalAmount] = useState(null)
  const [salaryEditLoading, setSalaryEditLoading] = useState(false)

  // Salary mark-paid dialog
  const [salaryPayOpen, setSalaryPayOpen] = useState(false)
  const [salaryPayTarget, setSalaryPayTarget] = useState(null)
  const [salaryPayMethod, setSalaryPayMethod] = useState('cash')
  const [salaryPayAmount, setSalaryPayAmount] = useState('')
  const [salaryPayLoading, setSalaryPayLoading] = useState(false)

  // Salary delete dialog
  const [salaryDeleteOpen, setSalaryDeleteOpen] = useState(false)
  const [salaryDeleteTarget, setSalaryDeleteTarget] = useState(null)

  // Template management state
  const [managedTemplates, setManagedTemplates] = useState([])
  const [managedTemplatesLoading, setManagedTemplatesLoading] = useState(false)
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [templateForm, setTemplateForm] = useState({ name: '', defaultAmount: '', description: '' })
  const [editingTemplateId, setEditingTemplateId] = useState(null)
  const [templateSaving, setTemplateSaving] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const now = new Date()

  // --- Data fetching ---
  const fetchPayments = useCallback(async () => {
    if (!academy) return
    try {
      setError(null)
      const data = await paymentsApi.getAll(academy)
      setPayments(data.payments || [])
    } catch (err) {
      setError(err.message)
    }
  }, [academy])

  const fetchStudents = useCallback(async () => {
    if (!academy) return
    try {
      const data = await studentsApi.getAll(academy)
      setStudents(data.students || [])
    } catch (err) {
      console.error('Error loading students:', err)
    }
  }, [academy])

  const fetchTeams = useCallback(async () => {
    if (!academy) return
    try {
      const data = await teamsApi.getAll(academy)
      setTeams(data.teams || [])
    } catch (err) {
      console.error('Error loading teams:', err)
    }
  }, [academy])

  const fetchExpenses = useCallback(async () => {
    if (!academy) return
    setExpensesLoading(true)
    try {
      const data = await expensesApi.getAll(academy)
      setExpenses(data.expenses || [])
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' })
    } finally {
      setExpensesLoading(false)
    }
  }, [academy])

  const fetchSalaries = useCallback(async () => {
    if (!academy) return
    setSalariesLoading(true)
    try {
      const data = await salariesApi.getAll(academy)
      setSalaries(data.salaries || [])
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' })
    } finally {
      setSalariesLoading(false)
    }
  }, [academy])

  const fetchCoaches = useCallback(async () => {
    if (!academy) return
    try {
      const data = await coachesApi.getAll(academy)
      setCoaches(data.coaches || [])
    } catch (err) {
      console.error('Error loading coaches:', err)
    }
  }, [academy])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await Promise.all([fetchPayments(), fetchStudents(), fetchTeams()])
      setLoading(false)
    }
    load()
  }, [fetchPayments, fetchStudents, fetchTeams])

  // --- Filtering & sorting ---
  const statusFilterKey = statusFilter === 'Todos' ? 'Todos'
    : statusFilter === 'Pagado' ? 'paid'
    : statusFilter === 'Pendiente' ? 'pending'
    : statusFilter === 'Vencido' ? 'overdue'
    : statusFilter === 'Cancelado' ? 'cancelled'
    : statusFilter

  // Build lookup: studentId → set of teamIds
  const studentTeamMap = useMemo(() => {
    const map = {}
    students.forEach(s => {
      map[s.id] = s.teamIds || []
    })
    return map
  }, [students])

  // Build lookup: teamId → team name
  const teamNameMap = useMemo(() => {
    const map = {}
    teams.forEach(t => {
      map[t.id] = t.name
    })
    return map
  }, [teams])

  const filteredAndSortedPayments = useMemo(() => {
    let filtered = filterPayments(payments, searchTerm, statusFilterKey, now)

    // Payment type filter
    filtered = filterPaymentsByType(filtered, typeFilter)

    // Período range filter
    if (monthFrom) {
      filtered = filtered.filter(p => p.month >= monthFrom)
    }
    if (monthTo) {
      filtered = filtered.filter(p => p.month <= monthTo)
    }

    // Equipo filter
    if (teamFilter && teamFilter !== 'Todos') {
      filtered = filtered.filter(p => {
        const teamIds = studentTeamMap[p.studentId] || []
        return teamIds.includes(teamFilter)
      })
    }

    const sorted = [...filtered].sort((a, b) => {
      let aValue = a[orderBy]
      let bValue = b[orderBy]

      if (orderBy === 'amount') {
        aValue = Number(aValue)
        bValue = Number(bValue)
      }
      if (orderBy === 'displayStatus') {
        aValue = getDisplayStatus(a, now)
        bValue = getDisplayStatus(b, now)
      }

      if (aValue < bValue) return order === 'asc' ? -1 : 1
      if (aValue > bValue) return order === 'asc' ? 1 : -1
      return 0
    })

    return sorted
  }, [payments, searchTerm, statusFilterKey, typeFilter, monthFrom, monthTo, teamFilter, studentTeamMap, orderBy, order])

  // --- Metrics ---
  const paymentMetrics = useMemo(() => {
    let pending = 0, overdue = 0, paid = 0
    filteredAndSortedPayments.forEach(p => {
      const ds = getDisplayStatus(p, now)
      const amt = Number(p.amount) || 0
      const abonado = Number(p.paidAmount || 0)
      if (ds === 'paid') {
        paid += amt
      } else {
        // For pending/overdue: abonos count as paid, remainder is outstanding
        paid += abonado
        const outstanding = amt - abonado
        if (ds === 'overdue') overdue += outstanding
        else if (ds === 'pending') pending += outstanding
      }
    })
    return { pending, overdue, paid, total: pending + overdue }
  }, [filteredAndSortedPayments])

  // --- Handlers ---
  const handleSort = (property) => {
    const isAsc = orderBy === property && order === 'asc'
    setOrder(isAsc ? 'desc' : 'asc')
    setOrderBy(property)
  }

  // --- Create payment ---
  const handleCreateOpen = async () => {
    setCreateForm({ studentId: '', amount: '', dueDate: '', description: '', templateId: '', teamId: '' })
    setCreateMode('individual')
    setCreateOpen(true)
    setTemplatesLoading(true)
    try {
      const data = await paymentTypesApi.getAll(academy)
      setTemplates(data.paymentTypes || [])
    } catch (err) {
      console.error('Error loading templates:', err)
      setTemplates([])
    } finally {
      setTemplatesLoading(false)
    }
  }

  const handleTemplateChange = (templateId) => {
    if (!templateId) {
      setCreateForm(f => ({ ...f, templateId: '', amount: '', description: '' }))
      return
    }
    const template = templates.find(t => t.id === templateId)
    if (template) {
      setCreateForm(f => ({
        ...f,
        templateId: template.id,
        amount: String(template.defaultAmount),
        description: template.description || template.name,
      }))
    }
  }

  const handleCreateSubmit = async () => {
    if (!createForm.amount || !createForm.dueDate) return
    if (createMode === 'individual' && !createForm.studentId) return
    if (createMode === 'team' && !createForm.teamId) return

    setCreateLoading(true)
    try {
      // Determine which students to create payments for
      let targetStudents = []
      if (createMode === 'individual') {
        const student = students.find(s => s.id === createForm.studentId)
        if (student) targetStudents = [student]
      } else {
        targetStudents = students.filter(s =>
          s.status === 'active' && (s.teamIds || []).includes(createForm.teamId)
        )
      }

      let created = 0
      for (const student of targetStudents) {
        const payload = {
          studentId: student.id,
          studentName: student.name || '',
          amount: Number(createForm.amount),
          dueDate: createForm.dueDate,
          month: createForm.dueDate.substring(0, 7),
          status: 'pending',
          paymentType: 'custom',
          description: createForm.description || undefined,
          academy,
        }
        if (createForm.templateId) {
          payload.paymentTypeTemplateId = createForm.templateId
        }
        await paymentsApi.create(payload)
        created++
      }

      setCreateOpen(false)
      const msg = createMode === 'team'
        ? `${created} pagos registrados para el equipo`
        : 'Pago registrado correctamente'
      setSnackbar({ open: true, message: msg, severity: 'success' })
      await fetchPayments()
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' })
    } finally {
      setCreateLoading(false)
    }
  }

  // --- Mark as paid ---
  const handlePayOpen = (payment) => {
    setPayTarget(payment)
    setPayMethod('cash')
    const remaining = Number(payment.amount) - Number(payment.paidAmount || 0)
    setPayAmount(String(remaining))
    setPayDialogOpen(true)
  }

  const handlePaySubmit = async () => {
    if (!payTarget || !payAmount || Number(payAmount) <= 0) return
    setPayLoading(true)
    try {
      await paymentsApi.markPaid(payTarget.id, {
        paidDate: new Date().toISOString().split('T')[0],
        method: payMethod,
        paidAmount: Number(payAmount),
      })
      setPayDialogOpen(false)
      const remaining = Number(payTarget.amount) - Number(payTarget.paidAmount || 0)
      const msg = Number(payAmount) >= remaining
        ? 'Pago completado'
        : `Abono de $${payAmount} registrado`
      setSnackbar({ open: true, message: msg, severity: 'success' })
      await fetchPayments()
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' })
    } finally {
      setPayLoading(false)
    }
  }

  // --- Edit payment ---
  const handleEditPaymentOpen = (payment) => {
    setEditPaymentId(payment.id)
    setEditPaymentForm({
      amount: String(Number(payment.amount)),
      dueDate: payment.dueDate || '',
      description: payment.description || '',
      status: payment.status || 'pending',
    })
    setEditPaymentOpen(true)
  }

  const handleEditPaymentSubmit = async () => {
    if (!editPaymentId || !editPaymentForm.amount || !editPaymentForm.dueDate) return
    setEditPaymentLoading(true)
    try {
      await paymentsApi.update(editPaymentId, {
        amount: Number(editPaymentForm.amount),
        dueDate: editPaymentForm.dueDate,
        month: editPaymentForm.dueDate.substring(0, 7),
        description: editPaymentForm.description || undefined,
        status: editPaymentForm.status,
      })
      setEditPaymentOpen(false)
      setSnackbar({ open: true, message: 'Pago actualizado correctamente', severity: 'success' })
      await fetchPayments()
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' })
    } finally {
      setEditPaymentLoading(false)
    }
  }

  // --- Delete payment ---
  const handleDeletePaymentOpen = (payment) => {
    setDeletePaymentTarget(payment)
    setDeletePaymentOpen(true)
  }

  const handleDeletePaymentSubmit = async () => {
    if (!deletePaymentTarget) return
    try {
      await paymentsApi.delete(deletePaymentTarget.id)
      setDeletePaymentOpen(false)
      setDeletePaymentTarget(null)
      setSnackbar({ open: true, message: 'Pago eliminado', severity: 'success' })
      await fetchPayments()
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' })
    }
  }

  // --- Bulk delete payments ---
  const handleTogglePaymentSelect = (id) => {
    setSelectedPaymentIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSelectAllPayments = () => {
    if (selectedPaymentIds.size === filteredAndSortedPayments.length) {
      setSelectedPaymentIds(new Set())
    } else {
      setSelectedPaymentIds(new Set(filteredAndSortedPayments.map(p => p.id)))
    }
  }

  const handleBulkDeletePayments = async () => {
    if (selectedPaymentIds.size === 0) return
    if (!window.confirm(`¿Estás seguro de eliminar ${selectedPaymentIds.size} pago(s)?`)) return
    try {
      await Promise.all([...selectedPaymentIds].map(id => paymentsApi.delete(id)))
      setSelectedPaymentIds(new Set())
      setSnackbar({ open: true, message: `${selectedPaymentIds.size} pagos eliminados`, severity: 'success' })
      await fetchPayments()
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' })
    }
  }

  // --- Edit/delete abono ---
  const handleEditAbonoOpen = (paymentId, index, entry) => {
    setEditAbonoPaymentId(paymentId)
    setEditAbonoIndex(index)
    setEditAbonoForm({ amount: String(Number(entry.amount)), date: entry.date || '', method: entry.method || 'cash' })
    setEditAbonoOpen(true)
  }

  const handleEditAbonoSubmit = async () => {
    if (!editAbonoPaymentId || editAbonoIndex === null || !editAbonoForm.amount || !editAbonoForm.date) return
    setEditAbonoLoading(true)
    try {
      await paymentsApi.updateHistory(editAbonoPaymentId, {
        action: 'edit',
        index: editAbonoIndex,
        amount: Number(editAbonoForm.amount),
        date: editAbonoForm.date,
        method: editAbonoForm.method,
      })
      setEditAbonoOpen(false)
      setSnackbar({ open: true, message: 'Abono actualizado', severity: 'success' })
      await fetchPayments()
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' })
    } finally {
      setEditAbonoLoading(false)
    }
  }

  const handleDeleteAbonoOpen = (paymentId, index, entry) => {
    setDeleteAbonoPaymentId(paymentId)
    setDeleteAbonoIndex(index)
    setDeleteAbonoEntry(entry)
    setDeleteAbonoOpen(true)
  }

  const handleDeleteAbonoSubmit = async () => {
    if (!deleteAbonoPaymentId || deleteAbonoIndex === null) return
    try {
      await paymentsApi.updateHistory(deleteAbonoPaymentId, {
        action: 'delete',
        index: deleteAbonoIndex,
      })
      setDeleteAbonoOpen(false)
      setDeleteAbonoEntry(null)
      setSnackbar({ open: true, message: 'Abono eliminado', severity: 'success' })
      await fetchPayments()
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' })
    }
  }

  // --- Generate payments ---
  const handleGenerate = async () => {
    setGenerateLoading(true)
    try {
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const result = await paymentsApi.generate({ month: currentMonth, academy })
      setSnackbar({
        open: true,
        message: `Pagos generados: ${result.created || 0} creados, ${result.skipped || 0} omitidos`,
        severity: 'success',
      })
      await fetchPayments()
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' })
    } finally {
      setGenerateLoading(false)
    }
  }

  // --- Template management ---
  const fetchManagedTemplates = useCallback(async () => {
    if (!academy) return
    setManagedTemplatesLoading(true)
    try {
      const data = await paymentTypesApi.getAll(academy)
      setManagedTemplates(data.paymentTypes || [])
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' })
    } finally {
      setManagedTemplatesLoading(false)
    }
  }, [academy])

  useEffect(() => {
    if (activeTab === 1) {
      fetchManagedTemplates()
    }
  }, [activeTab, fetchManagedTemplates])

  useEffect(() => {
    if (activeTab === 2) {
      fetchExpenses()
    }
  }, [activeTab, fetchExpenses])

  useEffect(() => {
    if (activeTab === 3) {
      fetchSalaries()
      fetchCoaches()
    }
  }, [activeTab, fetchSalaries, fetchCoaches])

  const handleTemplateDialogOpen = (template = null) => {
    if (template) {
      setEditingTemplateId(template.id)
      setTemplateForm({ name: template.name, defaultAmount: String(template.defaultAmount), description: template.description || '' })
    } else {
      setEditingTemplateId(null)
      setTemplateForm({ name: '', defaultAmount: '', description: '' })
    }
    setTemplateDialogOpen(true)
  }

  const handleTemplateSave = async () => {
    if (!templateForm.name || !templateForm.defaultAmount) return
    setTemplateSaving(true)
    try {
      const payload = {
        name: templateForm.name,
        defaultAmount: Number(templateForm.defaultAmount),
        description: templateForm.description || undefined,
        academy,
      }
      if (editingTemplateId) {
        await paymentTypesApi.update(editingTemplateId, payload)
        setSnackbar({ open: true, message: 'Tipo de pago actualizado', severity: 'success' })
      } else {
        await paymentTypesApi.create(payload)
        setSnackbar({ open: true, message: 'Tipo de pago creado', severity: 'success' })
      }
      setTemplateDialogOpen(false)
      await fetchManagedTemplates()
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' })
    } finally {
      setTemplateSaving(false)
    }
  }

  const handleDeleteConfirm = (template) => {
    setDeleteTarget(template)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteTemplate = async () => {
    if (!deleteTarget) return
    try {
      await paymentTypesApi.delete(deleteTarget.id)
      setSnackbar({ open: true, message: 'Tipo de pago eliminado', severity: 'success' })
      setDeleteConfirmOpen(false)
      setDeleteTarget(null)
      await fetchManagedTemplates()
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' })
    }
  }

  // --- Expense filtering & metrics ---
  const expenseStatusFilterKey = expenseStatusFilter === 'Todos' ? 'Todos'
    : expenseStatusFilter === 'Pagado' ? 'paid'
    : expenseStatusFilter === 'Pendiente' ? 'pending'
    : expenseStatusFilter === 'Vencido' ? 'overdue'
    : expenseStatusFilter === 'Cancelado' ? 'cancelled'
    : expenseStatusFilter

  const filteredExpenses = useMemo(() => {
    let filtered = filterExpenses(expenses, expenseSearchTerm, expenseStatusFilterKey, now)
    filtered = filterExpensesByCategory(filtered, expenseCategoryFilter)
    filtered = filterExpensesByDateRange(filtered, expenseDateFrom || null, expenseDateTo || null)
    return filtered
  }, [expenses, expenseSearchTerm, expenseStatusFilterKey, expenseCategoryFilter, expenseDateFrom, expenseDateTo])

  const expenseMetrics = useMemo(() => {
    return computeExpenseMetrics(filteredExpenses, now)
  }, [filteredExpenses])

  // --- Salary filtering & metrics ---
  const salaryStatusFilterKey = salaryStatusFilter === 'Todos' ? 'Todos'
    : salaryStatusFilter === 'Pagado' ? 'paid'
    : salaryStatusFilter === 'Pendiente' ? 'pending'
    : salaryStatusFilter === 'Vencido' ? 'overdue'
    : salaryStatusFilter === 'Cancelado' ? 'cancelled'
    : salaryStatusFilter

  const filteredSalaries = useMemo(() => {
    let filtered = filterSalaries(salaries, salarySearchTerm, salaryStatusFilterKey, now)
    filtered = filterSalariesByCoach(filtered, salaryCoachFilter)
    filtered = filterSalariesByTeam(filtered, salaryTeamFilter)
    filtered = filterSalariesByDateRange(filtered, salaryDateFrom || null, salaryDateTo || null)
    return filtered
  }, [salaries, salarySearchTerm, salaryStatusFilterKey, salaryCoachFilter, salaryTeamFilter, salaryDateFrom, salaryDateTo])

  const salaryMetrics = useMemo(() => {
    return computeSalaryMetrics(filteredSalaries, now)
  }, [filteredSalaries])

  // --- Expense CRUD handlers ---
  const handleExpenseCreateOpen = () => {
    setExpenseCreateForm({ description: '', amount: '', category: 'Otros', dueDate: '', status: 'pending' })
    setExpenseCreateOpen(true)
  }

  const handleExpenseCreateSubmit = async () => {
    const validation = validateExpense({ description: expenseCreateForm.description, amount: Number(expenseCreateForm.amount) })
    if (!validation.valid) {
      setSnackbar({ open: true, message: validation.error, severity: 'error' })
      return
    }
    if (!expenseCreateForm.dueDate) return
    setExpenseCreateLoading(true)
    try {
      await expensesApi.create({
        description: expenseCreateForm.description,
        amount: Number(expenseCreateForm.amount),
        category: expenseCreateForm.category,
        dueDate: expenseCreateForm.dueDate,
        month: expenseCreateForm.dueDate.substring(0, 7),
        status: 'pending',
        academy,
      })
      setExpenseCreateOpen(false)
      setSnackbar({ open: true, message: 'Gasto registrado correctamente', severity: 'success' })
      await fetchExpenses()
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' })
    } finally {
      setExpenseCreateLoading(false)
    }
  }

  const handleExpenseEditOpen = (expense) => {
    setExpenseEditId(expense.id)
    setExpenseEditForm({
      description: expense.description || '',
      amount: String(Number(expense.amount)),
      category: expense.category || 'Otros',
      dueDate: expense.dueDate || '',
      status: expense.status || 'pending',
    })
    setExpenseEditOpen(true)
  }

  const handleExpenseEditSubmit = async () => {
    if (!expenseEditId || !expenseEditForm.amount || !expenseEditForm.dueDate) return
    setExpenseEditLoading(true)
    try {
      await expensesApi.update(expenseEditId, {
        description: expenseEditForm.description,
        amount: Number(expenseEditForm.amount),
        category: expenseEditForm.category,
        dueDate: expenseEditForm.dueDate,
        month: expenseEditForm.dueDate.substring(0, 7),
        status: expenseEditForm.status,
      })
      setExpenseEditOpen(false)
      setSnackbar({ open: true, message: 'Gasto actualizado correctamente', severity: 'success' })
      await fetchExpenses()
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' })
    } finally {
      setExpenseEditLoading(false)
    }
  }

  const handleExpensePayOpen = (expense) => {
    setExpensePayTarget(expense)
    setExpensePayMethod('cash')
    const remaining = Number(expense.amount) - Number(expense.paidAmount || 0)
    setExpensePayAmount(String(remaining))
    setExpensePayOpen(true)
  }

  const handleExpensePaySubmit = async () => {
    if (!expensePayTarget || !expensePayAmount || Number(expensePayAmount) <= 0) return
    setExpensePayLoading(true)
    try {
      await expensesApi.markPaid(expensePayTarget.id, {
        paidDate: new Date().toISOString().split('T')[0],
        method: expensePayMethod,
        paidAmount: Number(expensePayAmount),
      })
      setExpensePayOpen(false)
      const remaining = Number(expensePayTarget.amount) - Number(expensePayTarget.paidAmount || 0)
      const msg = Number(expensePayAmount) >= remaining
        ? 'Gasto completado'
        : `Abono de ${expensePayAmount} registrado`
      setSnackbar({ open: true, message: msg, severity: 'success' })
      await fetchExpenses()
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' })
    } finally {
      setExpensePayLoading(false)
    }
  }

  const handleExpenseDeleteOpen = (expense) => {
    setExpenseDeleteTarget(expense)
    setExpenseDeleteOpen(true)
  }

  const handleExpenseDeleteSubmit = async () => {
    if (!expenseDeleteTarget) return
    try {
      await expensesApi.delete(expenseDeleteTarget.id)
      setExpenseDeleteOpen(false)
      setExpenseDeleteTarget(null)
      setSnackbar({ open: true, message: 'Gasto eliminado', severity: 'success' })
      await fetchExpenses()
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' })
    }
  }

  // --- Salary CRUD handlers ---
  const handleSalaryGenerate = async () => {
    if (!salaryGenerateMonth) return
    setSalaryGenerateLoading(true)
    try {
      const result = await salariesApi.generate({ month: salaryGenerateMonth, academy })
      setSnackbar({
        open: true,
        message: `Salarios generados: ${result.created || 0} creados, ${result.skipped || 0} omitidos`,
        severity: 'success',
      })
      await fetchSalaries()
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' })
    } finally {
      setSalaryGenerateLoading(false)
    }
  }

  const handleSalaryEditOpen = (salary) => {
    setSalaryEditId(salary.id)
    setSalaryEditOriginalAmount(salary.originalAmount || salary.amount)
    setSalaryEditForm({
      amount: String(Number(salary.amount)),
      dueDate: salary.dueDate || '',
      status: salary.status || 'pending',
    })
    setSalaryEditOpen(true)
  }

  const handleSalaryEditSubmit = async () => {
    if (!salaryEditId || !salaryEditForm.amount || !salaryEditForm.dueDate) return
    setSalaryEditLoading(true)
    try {
      await salariesApi.update(salaryEditId, {
        amount: Number(salaryEditForm.amount),
        dueDate: salaryEditForm.dueDate,
        status: salaryEditForm.status,
      })
      setSalaryEditOpen(false)
      setSnackbar({ open: true, message: 'Salario actualizado correctamente', severity: 'success' })
      await fetchSalaries()
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' })
    } finally {
      setSalaryEditLoading(false)
    }
  }

  const handleSalaryPayOpen = (salary) => {
    setSalaryPayTarget(salary)
    setSalaryPayMethod('cash')
    const remaining = Number(salary.amount) - Number(salary.paidAmount || 0)
    setSalaryPayAmount(String(remaining))
    setSalaryPayOpen(true)
  }

  const handleSalaryPaySubmit = async () => {
    if (!salaryPayTarget || !salaryPayAmount || Number(salaryPayAmount) <= 0) return
    setSalaryPayLoading(true)
    try {
      await salariesApi.markPaid(salaryPayTarget.id, {
        paidDate: new Date().toISOString().split('T')[0],
        method: salaryPayMethod,
        paidAmount: Number(salaryPayAmount),
      })
      setSalaryPayOpen(false)
      const remaining = Number(salaryPayTarget.amount) - Number(salaryPayTarget.paidAmount || 0)
      const msg = Number(salaryPayAmount) >= remaining
        ? 'Salario completado'
        : `Abono de ${salaryPayAmount} registrado`
      setSnackbar({ open: true, message: msg, severity: 'success' })
      await fetchSalaries()
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' })
    } finally {
      setSalaryPayLoading(false)
    }
  }

  const handleSalaryDeleteOpen = (salary) => {
    setSalaryDeleteTarget(salary)
    setSalaryDeleteOpen(true)
  }

  const handleSalaryDeleteSubmit = async () => {
    if (!salaryDeleteTarget) return
    try {
      await salariesApi.delete(salaryDeleteTarget.id)
      setSalaryDeleteOpen(false)
      setSalaryDeleteTarget(null)
      setSnackbar({ open: true, message: 'Salario eliminado', severity: 'success' })
      await fetchSalaries()
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' })
    }
  }

  // --- Salary coach lookup ---
  const coachNameMap = useMemo(() => {
    const map = {}
    coaches.forEach(c => {
      map[c.id] = c.name
    })
    return map
  }, [coaches])

  // --- Status helpers ---
  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid': return <CheckCircle fontSize="small" />
      case 'pending': return <Warning fontSize="small" />
      case 'overdue': return <ErrorIcon fontSize="small" />
      default: return null
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'success'
      case 'pending': return 'warning'
      case 'overdue': return 'error'
      default: return 'default'
    }
  }

  const formatMonth = (month) => {
    if (!month) return '-'
    const [y, m] = month.split('-')
    const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
    return `${months[parseInt(m, 10) - 1] || m} ${y}`
  }

  const handleExportPdf = () => {
    const doc = new jsPDF()

    doc.setFontSize(16)
    doc.text('Reporte de Pagos', 14, 20)

    doc.setFontSize(10)
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 14, 28)
    doc.text(`Total: ${filteredAndSortedPayments.length} pagos`, 14, 34)

    const summaryY = 42
    doc.setFontSize(9)
    doc.text(`Pendientes: $${paymentMetrics.pending}`, 14, summaryY)
    doc.text(`Vencidos: $${paymentMetrics.overdue}`, 70, summaryY)
    doc.text(`Cobrado: $${paymentMetrics.paid}`, 126, summaryY)

    const rows = filteredAndSortedPayments.map(p => {
      const ds = getDisplayStatus(p, now)
      const paid = Number(p.paidAmount || 0)
      const total = Number(p.amount)
      const remaining = total - paid
      let montoText = `$${total}`
      if ((p.paymentHistory || []).length > 0) {
        const abonos = (p.paymentHistory || []).map(e => `  Abono: $${Number(e.amount)} - ${e.date}`).join('\n')
        montoText += '\n' + abonos
        if (remaining > 0) {
          montoText += `\n  Pendiente: $${remaining}`
        }
      }
      return [
        p.studentName,
        formatMonth(p.month),
        montoText,
        PAYMENT_TYPE_LABELS[p.paymentType] || p.paymentType || 'Mensualidad',
        STATUS_LABELS[ds] || ds,
        p.paidDate || '-',
      ]
    })

    autoTable(doc, {
      startY: 48,
      head: [['Alumno', 'Período', 'Monto', 'Tipo', 'Estado', 'Fecha de Pago']],
      body: rows,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [46, 125, 50] },
      columnStyles: { 2: { cellWidth: 40 } },
    })

    doc.save('pagos.pdf')
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">Pagos</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {selectedPaymentIds.size > 0 && (
            <Button variant="outlined" color="error" startIcon={<DeleteSweep />} onClick={handleBulkDeletePayments}>
              Eliminar ({selectedPaymentIds.size})
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={generateLoading ? <CircularProgress size={18} /> : <PaymentIcon />}
            onClick={handleGenerate}
            disabled={generateLoading}
          >
            Generar Pagos del Mes
          </Button>
          <Button variant="contained" startIcon={<Receipt />} sx={{ bgcolor: '#2e7d32' }} onClick={handleCreateOpen}>
            Registrar Pago
          </Button>
          <Button variant="outlined" startIcon={<PictureAsPdf />} onClick={handleExportPdf}>
            Exportar PDF
          </Button>
        </Box>
      </Box>

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
        <Tab label="Pagos" />
        <Tab label="Tipos de Pago" />
        <Tab label="Gastos" />
        <Tab label="Salarios" />
      </Tabs>

      {activeTab === 0 && (<>
      {/* Summary cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{ p: 2, bgcolor: statusFilter === 'Pendiente' ? '#ffe0b2' : '#fff3e0', borderLeft: '4px solid #ff9800', cursor: 'pointer', transition: 'all 0.2s', '&:hover': { bgcolor: '#ffe0b2', transform: 'translateY(-2px)', boxShadow: 2 } }}
            onClick={() => setStatusFilter(statusFilter === 'Pendiente' ? 'Todos' : 'Pendiente')}
          >
            <Typography variant="body2" color="text.secondary" gutterBottom>Pendientes</Typography>
            <Typography variant="h4" fontWeight="bold" color="#ed6c02">${paymentMetrics.pending}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{ p: 2, bgcolor: statusFilter === 'Vencido' ? '#ffcdd2' : '#ffebee', borderLeft: '4px solid #f44336', cursor: 'pointer', transition: 'all 0.2s', '&:hover': { bgcolor: '#ffcdd2', transform: 'translateY(-2px)', boxShadow: 2 } }}
            onClick={() => setStatusFilter(statusFilter === 'Vencido' ? 'Todos' : 'Vencido')}
          >
            <Typography variant="body2" color="text.secondary" gutterBottom>Vencidos</Typography>
            <Typography variant="h4" fontWeight="bold" color="#d32f2f">${paymentMetrics.overdue}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, bgcolor: '#fce4ec', borderLeft: '4px solid #e91e63', opacity: 0.7 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>Total por Cobrar</Typography>
            <Typography variant="h4" fontWeight="bold" color="#c2185b">${paymentMetrics.total}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{ p: 2, bgcolor: statusFilter === 'Pagado' ? '#c8e6c9' : '#e8f5e9', borderLeft: '4px solid #4caf50', cursor: 'pointer', transition: 'all 0.2s', '&:hover': { bgcolor: '#c8e6c9', transform: 'translateY(-2px)', boxShadow: 2 } }}
            onClick={() => setStatusFilter(statusFilter === 'Pagado' ? 'Todos' : 'Pagado')}
          >
            <Typography variant="body2" color="text.secondary" gutterBottom>Cobrado</Typography>
            <Typography variant="h4" fontWeight="bold" color="#2e7d32">${paymentMetrics.paid}</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Search & filter */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              placeholder="Buscar por alumno..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search /></InputAdornment> } }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Filtrar por Estado</InputLabel>
              <Select
                value={statusFilter}
                label="Filtrar por Estado"
                onChange={(e) => setStatusFilter(e.target.value)}
                startAdornment={<InputAdornment position="start"><FilterList /></InputAdornment>}
              >
                <MenuItem value="Todos">Todos</MenuItem>
                <MenuItem value="Pagado">Pagado</MenuItem>
                <MenuItem value="Pendiente">Pendiente</MenuItem>
                <MenuItem value="Vencido">Vencido</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Tipo de Pago</InputLabel>
              <Select
                value={typeFilter}
                label="Tipo de Pago"
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <MenuItem value="Todos">Todos</MenuItem>
                <MenuItem value="mensualidad">Mensualidad</MenuItem>
                <MenuItem value="inscripcion">Inscripción</MenuItem>
                <MenuItem value="custom">Personalizado</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField
              fullWidth
              label="Período Desde"
              type="month"
              value={monthFrom}
              onChange={(e) => setMonthFrom(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField
              fullWidth
              label="Período Hasta"
              type="month"
              value={monthTo}
              onChange={(e) => setMonthTo(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Equipo</InputLabel>
              <Select
                value={teamFilter}
                label="Equipo"
                onChange={(e) => setTeamFilter(e.target.value)}
              >
                <MenuItem value="Todos">Todos</MenuItem>
                {teams.map(t => (
                  <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                ))}
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

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selectedPaymentIds.size > 0 && selectedPaymentIds.size < filteredAndSortedPayments.length}
                  checked={filteredAndSortedPayments.length > 0 && selectedPaymentIds.size === filteredAndSortedPayments.length}
                  onChange={handleSelectAllPayments}
                />
              </TableCell>
              <TableCell>
                <TableSortLabel active={orderBy === 'studentName'} direction={orderBy === 'studentName' ? order : 'asc'} onClick={() => handleSort('studentName')}>
                  Alumno
                </TableSortLabel>
              </TableCell>
              <TableCell>Equipo</TableCell>
              <TableCell>
                <TableSortLabel active={orderBy === 'month'} direction={orderBy === 'month' ? order : 'asc'} onClick={() => handleSort('month')}>
                  Período
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel active={orderBy === 'amount'} direction={orderBy === 'amount' ? order : 'asc'} onClick={() => handleSort('amount')}>
                  Monto
                </TableSortLabel>
              </TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>
                <TableSortLabel active={orderBy === 'displayStatus'} direction={orderBy === 'displayStatus' ? order : 'asc'} onClick={() => handleSort('displayStatus')}>
                  Estado
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel active={orderBy === 'paidDate'} direction={orderBy === 'paidDate' ? order : 'asc'} onClick={() => handleSort('paidDate')}>
                  Fecha de Pago
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAndSortedPayments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">No se encontraron pagos</Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedPayments.map((payment) => {
                const ds = getDisplayStatus(payment, now)
                return (
                  <TableRow key={payment.id} hover>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedPaymentIds.has(payment.id)}
                        onChange={() => handleTogglePaymentSelect(payment.id)}
                      />
                    </TableCell>
                    <TableCell>{payment.studentName}</TableCell>
                    <TableCell>
                      {(studentTeamMap[payment.studentId] || [])
                        .map(tid => teamNameMap[tid])
                        .filter(Boolean)
                        .join(', ') || '-'}
                    </TableCell>
                    <TableCell>{formatMonth(payment.month)}</TableCell>
                    <TableCell>
                      ${Number(payment.amount)}
                      {(payment.paymentHistory || []).length > 0 && (
                        <>
                          {(payment.paymentHistory || []).map((entry, i) => (
                            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Typography variant="caption" color="success.main">
                                Abono: ${Number(entry.amount)} — {entry.date}
                              </Typography>
                              <IconButton size="small" sx={{ p: 0 }} onClick={() => handleEditAbonoOpen(payment.id, i, entry)} aria-label="editar abono">
                                <Edit sx={{ fontSize: 12 }} />
                              </IconButton>
                              <IconButton size="small" sx={{ p: 0 }} color="error" onClick={() => handleDeleteAbonoOpen(payment.id, i, entry)} aria-label="eliminar abono">
                                <Delete sx={{ fontSize: 12 }} />
                              </IconButton>
                            </Box>
                          ))}
                          {Number(payment.paidAmount || 0) < Number(payment.amount) && (
                            <Typography variant="caption" display="block" color="error.main" fontWeight="bold">
                              Pendiente: ${Number(payment.amount) - Number(payment.paidAmount || 0)}
                            </Typography>
                          )}
                        </>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={PAYMENT_TYPE_LABELS[payment.paymentType] || payment.paymentType || 'Mensualidad'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip icon={getStatusIcon(ds)} label={STATUS_LABELS[ds] || ds} color={getStatusColor(ds)} size="small" />
                    </TableCell>
                    <TableCell>{payment.paidDate || '-'}</TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                        {(ds === 'pending' || ds === 'overdue') && (
                          <Button size="small" variant="outlined" color="success" onClick={() => handlePayOpen(payment)}>
                            Marcar Pagado
                          </Button>
                        )}
                        <IconButton size="small" onClick={() => handleEditPaymentOpen(payment)} aria-label="editar pago">
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeletePaymentOpen(payment)} aria-label="eliminar pago">
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
      </>)}

      {activeTab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Tipos de Pago</Typography>
            <Button variant="contained" startIcon={<Add />} onClick={() => handleTemplateDialogOpen()}>
              Crear Tipo de Pago
            </Button>
          </Box>

          {managedTemplatesLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : managedTemplates.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">
                No hay tipos de pago definidos. Crea tu primer tipo de pago para agilizar el registro de cobros.
              </Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nombre</TableCell>
                    <TableCell>Monto por Defecto</TableCell>
                    <TableCell>Descripción</TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {managedTemplates.map(t => (
                    <TableRow key={t.id} hover>
                      <TableCell>{t.name}</TableCell>
                      <TableCell>${Number(t.defaultAmount)}</TableCell>
                      <TableCell>{t.description || '-'}</TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => handleTemplateDialogOpen(t)} aria-label="editar">
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeleteConfirm(t)} aria-label="eliminar">
                          <Delete fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {activeTab === 2 && (
        <Box>
          {/* Gastos header */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button variant="contained" startIcon={<Add />} sx={{ bgcolor: '#2e7d32' }} onClick={handleExpenseCreateOpen}>
              Registrar Gasto
            </Button>
          </Box>

          {expensesLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* Expense summary cards */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper
                    sx={{ p: 2, bgcolor: expenseStatusFilter === 'Pendiente' ? '#ffe0b2' : '#fff3e0', borderLeft: '4px solid #ff9800', cursor: 'pointer', transition: 'all 0.2s', '&:hover': { bgcolor: '#ffe0b2', transform: 'translateY(-2px)', boxShadow: 2 } }}
                    onClick={() => setExpenseStatusFilter(expenseStatusFilter === 'Pendiente' ? 'Todos' : 'Pendiente')}
                  >
                    <Typography variant="body2" color="text.secondary" gutterBottom>Pendientes</Typography>
                    <Typography variant="h4" fontWeight="bold" color="#ed6c02">${expenseMetrics.pending}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper
                    sx={{ p: 2, bgcolor: expenseStatusFilter === 'Vencido' ? '#ffcdd2' : '#ffebee', borderLeft: '4px solid #f44336', cursor: 'pointer', transition: 'all 0.2s', '&:hover': { bgcolor: '#ffcdd2', transform: 'translateY(-2px)', boxShadow: 2 } }}
                    onClick={() => setExpenseStatusFilter(expenseStatusFilter === 'Vencido' ? 'Todos' : 'Vencido')}
                  >
                    <Typography variant="body2" color="text.secondary" gutterBottom>Vencidos</Typography>
                    <Typography variant="h4" fontWeight="bold" color="#d32f2f">${expenseMetrics.overdue}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, bgcolor: '#fce4ec', borderLeft: '4px solid #e91e63', opacity: 0.7 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>Total por Cobrar</Typography>
                    <Typography variant="h4" fontWeight="bold" color="#c2185b">${expenseMetrics.totalPorCobrar}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper
                    sx={{ p: 2, bgcolor: expenseStatusFilter === 'Pagado' ? '#c8e6c9' : '#e8f5e9', borderLeft: '4px solid #4caf50', cursor: 'pointer', transition: 'all 0.2s', '&:hover': { bgcolor: '#c8e6c9', transform: 'translateY(-2px)', boxShadow: 2 } }}
                    onClick={() => setExpenseStatusFilter(expenseStatusFilter === 'Pagado' ? 'Todos' : 'Pagado')}
                  >
                    <Typography variant="body2" color="text.secondary" gutterBottom>Cobrado</Typography>
                    <Typography variant="h4" fontWeight="bold" color="#2e7d32">${expenseMetrics.paid}</Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Expense filter bar */}
              <Paper sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={2}>
                    <TextField
                      fullWidth
                      placeholder="Buscar por descripción..."
                      value={expenseSearchTerm}
                      onChange={(e) => setExpenseSearchTerm(e.target.value)}
                      slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search /></InputAdornment> } }}
                    />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <FormControl fullWidth>
                      <InputLabel>Estado</InputLabel>
                      <Select
                        value={expenseStatusFilter}
                        label="Estado"
                        onChange={(e) => setExpenseStatusFilter(e.target.value)}
                        startAdornment={<InputAdornment position="start"><FilterList /></InputAdornment>}
                      >
                        <MenuItem value="Todos">Todos</MenuItem>
                        <MenuItem value="Pagado">Pagado</MenuItem>
                        <MenuItem value="Pendiente">Pendiente</MenuItem>
                        <MenuItem value="Vencido">Vencido</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <FormControl fullWidth>
                      <InputLabel>Categoría</InputLabel>
                      <Select
                        value={expenseCategoryFilter}
                        label="Categoría"
                        onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                      >
                        <MenuItem value="Todos">Todas</MenuItem>
                        {EXPENSE_CATEGORIES.map(c => (
                          <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <TextField
                      fullWidth
                      label="Fecha Desde"
                      type="date"
                      value={expenseDateFrom}
                      onChange={(e) => setExpenseDateFrom(e.target.value)}
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <TextField
                      fullWidth
                      label="Fecha Hasta"
                      type="date"
                      value={expenseDateTo}
                      onChange={(e) => setExpenseDateTo(e.target.value)}
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Grid>
                </Grid>
              </Paper>

              <Paper sx={{ mb: 2, p: 2, bgcolor: '#f5f5f5' }}>
                <Typography variant="body2" color="text.secondary">
                  Mostrando {filteredExpenses.length} de {expenses.length} gastos
                </Typography>
              </Paper>

              {/* Expense table */}
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Descripción</TableCell>
                      <TableCell>Categoría</TableCell>
                      <TableCell>Monto</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell>Fecha de Vencimiento</TableCell>
                      <TableCell>Fecha de Pago</TableCell>
                      <TableCell align="right">Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredExpenses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary">No se encontraron gastos</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredExpenses.map((expense) => {
                        const ds = getExpenseDisplayStatus(expense, now)
                        return (
                          <TableRow key={expense.id} hover>
                            <TableCell>{expense.description}</TableCell>
                            <TableCell>
                              <Chip label={expense.category || 'Otros'} size="small" variant="outlined" />
                            </TableCell>
                            <TableCell>
                              ${Number(expense.amount)}
                              {(expense.paymentHistory || []).length > 0 && (
                                <>
                                  {(expense.paymentHistory || []).map((entry, i) => (
                                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <Typography variant="caption" color="success.main">
                                        Abono: ${Number(entry.amount)} — {entry.date}
                                      </Typography>
                                    </Box>
                                  ))}
                                  {Number(expense.paidAmount || 0) < Number(expense.amount) && (
                                    <Typography variant="caption" display="block" color="error.main" fontWeight="bold">
                                      Pendiente: ${Number(expense.amount) - Number(expense.paidAmount || 0)}
                                    </Typography>
                                  )}
                                </>
                              )}
                            </TableCell>
                            <TableCell>
                              <Chip icon={getStatusIcon(ds)} label={STATUS_LABELS[ds] || ds} color={getStatusColor(ds)} size="small" />
                            </TableCell>
                            <TableCell>{expense.dueDate || '-'}</TableCell>
                            <TableCell>{expense.paidDate || '-'}</TableCell>
                            <TableCell align="right">
                              <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                                {(ds === 'pending' || ds === 'overdue') && (
                                  <Button size="small" variant="outlined" color="success" onClick={() => handleExpensePayOpen(expense)}>
                                    Marcar Pagado
                                  </Button>
                                )}
                                <IconButton size="small" onClick={() => handleExpenseEditOpen(expense)} aria-label="editar gasto">
                                  <Edit fontSize="small" />
                                </IconButton>
                                <IconButton size="small" color="error" onClick={() => handleExpenseDeleteOpen(expense)} aria-label="eliminar gasto">
                                  <Delete fontSize="small" />
                                </IconButton>
                              </Box>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </Box>
      )}

      {activeTab === 3 && (
        <Box>
          {/* Salarios header */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mb: 2, alignItems: 'center' }}>
            <TextField
              label="Mes"
              type="month"
              value={salaryGenerateMonth}
              onChange={(e) => setSalaryGenerateMonth(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              size="small"
            />
            <Button
              variant="outlined"
              startIcon={salaryGenerateLoading ? <CircularProgress size={18} /> : <PaymentIcon />}
              onClick={handleSalaryGenerate}
              disabled={salaryGenerateLoading || !salaryGenerateMonth}
            >
              Generar Salarios
            </Button>
          </Box>

          {salariesLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* Salary summary cards */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper
                    sx={{ p: 2, bgcolor: salaryStatusFilter === 'Pendiente' ? '#ffe0b2' : '#fff3e0', borderLeft: '4px solid #ff9800', cursor: 'pointer', transition: 'all 0.2s', '&:hover': { bgcolor: '#ffe0b2', transform: 'translateY(-2px)', boxShadow: 2 } }}
                    onClick={() => setSalaryStatusFilter(salaryStatusFilter === 'Pendiente' ? 'Todos' : 'Pendiente')}
                  >
                    <Typography variant="body2" color="text.secondary" gutterBottom>Pendientes</Typography>
                    <Typography variant="h4" fontWeight="bold" color="#ed6c02">${salaryMetrics.pending}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper
                    sx={{ p: 2, bgcolor: salaryStatusFilter === 'Vencido' ? '#ffcdd2' : '#ffebee', borderLeft: '4px solid #f44336', cursor: 'pointer', transition: 'all 0.2s', '&:hover': { bgcolor: '#ffcdd2', transform: 'translateY(-2px)', boxShadow: 2 } }}
                    onClick={() => setSalaryStatusFilter(salaryStatusFilter === 'Vencido' ? 'Todos' : 'Vencido')}
                  >
                    <Typography variant="body2" color="text.secondary" gutterBottom>Vencidos</Typography>
                    <Typography variant="h4" fontWeight="bold" color="#d32f2f">${salaryMetrics.overdue}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, bgcolor: '#fce4ec', borderLeft: '4px solid #e91e63', opacity: 0.7 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>Total por Cobrar</Typography>
                    <Typography variant="h4" fontWeight="bold" color="#c2185b">${salaryMetrics.totalPorCobrar}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper
                    sx={{ p: 2, bgcolor: salaryStatusFilter === 'Pagado' ? '#c8e6c9' : '#e8f5e9', borderLeft: '4px solid #4caf50', cursor: 'pointer', transition: 'all 0.2s', '&:hover': { bgcolor: '#c8e6c9', transform: 'translateY(-2px)', boxShadow: 2 } }}
                    onClick={() => setSalaryStatusFilter(salaryStatusFilter === 'Pagado' ? 'Todos' : 'Pagado')}
                  >
                    <Typography variant="body2" color="text.secondary" gutterBottom>Cobrado</Typography>
                    <Typography variant="h4" fontWeight="bold" color="#2e7d32">${salaryMetrics.paid}</Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Salary filter bar */}
              <Paper sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={2}>
                    <TextField
                      fullWidth
                      placeholder="Buscar por entrenador..."
                      value={salarySearchTerm}
                      onChange={(e) => setSalarySearchTerm(e.target.value)}
                      slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search /></InputAdornment> } }}
                    />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <FormControl fullWidth>
                      <InputLabel>Estado</InputLabel>
                      <Select
                        value={salaryStatusFilter}
                        label="Estado"
                        onChange={(e) => setSalaryStatusFilter(e.target.value)}
                        startAdornment={<InputAdornment position="start"><FilterList /></InputAdornment>}
                      >
                        <MenuItem value="Todos">Todos</MenuItem>
                        <MenuItem value="Pagado">Pagado</MenuItem>
                        <MenuItem value="Pendiente">Pendiente</MenuItem>
                        <MenuItem value="Vencido">Vencido</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <FormControl fullWidth>
                      <InputLabel>Entrenador</InputLabel>
                      <Select
                        value={salaryCoachFilter}
                        label="Entrenador"
                        onChange={(e) => setSalaryCoachFilter(e.target.value)}
                      >
                        <MenuItem value="Todos">Todos</MenuItem>
                        {coaches.map(c => (
                          <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <FormControl fullWidth>
                      <InputLabel>Equipo</InputLabel>
                      <Select
                        value={salaryTeamFilter}
                        label="Equipo"
                        onChange={(e) => setSalaryTeamFilter(e.target.value)}
                      >
                        <MenuItem value="Todos">Todos</MenuItem>
                        {teams.map(t => (
                          <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6} md={2}>
                    <TextField
                      fullWidth
                      label="Fecha Desde"
                      type="date"
                      value={salaryDateFrom}
                      onChange={(e) => setSalaryDateFrom(e.target.value)}
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Grid>
                  <Grid item xs={6} md={2}>
                    <TextField
                      fullWidth
                      label="Fecha Hasta"
                      type="date"
                      value={salaryDateTo}
                      onChange={(e) => setSalaryDateTo(e.target.value)}
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Grid>
                </Grid>
              </Paper>

              <Paper sx={{ mb: 2, p: 2, bgcolor: '#f5f5f5' }}>
                <Typography variant="body2" color="text.secondary">
                  Mostrando {filteredSalaries.length} de {salaries.length} salarios
                </Typography>
              </Paper>

              {/* Salary table */}
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Entrenador</TableCell>
                      <TableCell>Equipo</TableCell>
                      <TableCell>Fecha Entrenamiento</TableCell>
                      <TableCell>Monto</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell>Fecha de Pago</TableCell>
                      <TableCell align="right">Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredSalaries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary">No se encontraron salarios</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSalaries.map((salary) => {
                        const ds = getSalaryDisplayStatus(salary, now)
                        const hasOverride = salary.originalAmount != null && Number(salary.originalAmount) !== Number(salary.amount)
                        return (
                          <TableRow key={salary.id} hover>
                            <TableCell>{salary.coachName}</TableCell>
                            <TableCell>{salary.teamName}</TableCell>
                            <TableCell>{salary.trainingDate || '-'}</TableCell>
                            <TableCell>
                              ${Number(salary.amount)}
                              {hasOverride && (
                                <Typography variant="caption" display="block" color="text.secondary">
                                  Original: ${Number(salary.originalAmount)}
                                </Typography>
                              )}
                              {(salary.paymentHistory || []).length > 0 && (
                                <>
                                  {(salary.paymentHistory || []).map((entry, i) => (
                                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <Typography variant="caption" color="success.main">
                                        Abono: ${Number(entry.amount)} — {entry.date}
                                      </Typography>
                                    </Box>
                                  ))}
                                  {Number(salary.paidAmount || 0) < Number(salary.amount) && (
                                    <Typography variant="caption" display="block" color="error.main" fontWeight="bold">
                                      Pendiente: ${Number(salary.amount) - Number(salary.paidAmount || 0)}
                                    </Typography>
                                  )}
                                </>
                              )}
                            </TableCell>
                            <TableCell>
                              <Chip icon={getStatusIcon(ds)} label={STATUS_LABELS[ds] || ds} color={getStatusColor(ds)} size="small" />
                            </TableCell>
                            <TableCell>{salary.paidDate || '-'}</TableCell>
                            <TableCell align="right">
                              <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                                {(ds === 'pending' || ds === 'overdue') && (
                                  <Button size="small" variant="outlined" color="success" onClick={() => handleSalaryPayOpen(salary)}>
                                    Marcar Pagado
                                  </Button>
                                )}
                                <IconButton size="small" onClick={() => handleSalaryEditOpen(salary)} aria-label="editar salario">
                                  <Edit fontSize="small" />
                                </IconButton>
                                <IconButton size="small" color="error" onClick={() => handleSalaryDeleteOpen(salary)} aria-label="eliminar salario">
                                  <Delete fontSize="small" />
                                </IconButton>
                              </Box>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </Box>
      )}

      {/* Create expense dialog */}
      <Dialog open={expenseCreateOpen} onClose={() => setExpenseCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Registrar Gasto</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField
            label="Descripción"
            value={expenseCreateForm.description}
            onChange={(e) => setExpenseCreateForm(f => ({ ...f, description: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Monto"
            type="number"
            value={expenseCreateForm.amount}
            onChange={(e) => setExpenseCreateForm(f => ({ ...f, amount: e.target.value }))}
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel>Categoría</InputLabel>
            <Select
              value={expenseCreateForm.category}
              label="Categoría"
              onChange={(e) => setExpenseCreateForm(f => ({ ...f, category: e.target.value }))}
            >
              {EXPENSE_CATEGORIES.map(c => (
                <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Fecha de Vencimiento"
            type="date"
            value={expenseCreateForm.dueDate}
            onChange={(e) => setExpenseCreateForm(f => ({ ...f, dueDate: e.target.value }))}
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExpenseCreateOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleExpenseCreateSubmit}
            disabled={expenseCreateLoading || !expenseCreateForm.description || !expenseCreateForm.amount || !expenseCreateForm.dueDate}
          >
            {expenseCreateLoading ? <CircularProgress size={20} /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit expense dialog */}
      <Dialog open={expenseEditOpen} onClose={() => setExpenseEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Gasto</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField
            label="Descripción"
            value={expenseEditForm.description}
            onChange={(e) => setExpenseEditForm(f => ({ ...f, description: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Monto"
            type="number"
            value={expenseEditForm.amount}
            onChange={(e) => setExpenseEditForm(f => ({ ...f, amount: e.target.value }))}
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel>Categoría</InputLabel>
            <Select
              value={expenseEditForm.category}
              label="Categoría"
              onChange={(e) => setExpenseEditForm(f => ({ ...f, category: e.target.value }))}
            >
              {EXPENSE_CATEGORIES.map(c => (
                <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Fecha de Vencimiento"
            type="date"
            value={expenseEditForm.dueDate}
            onChange={(e) => setExpenseEditForm(f => ({ ...f, dueDate: e.target.value }))}
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel>Estado</InputLabel>
            <Select
              value={expenseEditForm.status}
              label="Estado"
              onChange={(e) => setExpenseEditForm(f => ({ ...f, status: e.target.value }))}
            >
              <MenuItem value="pending">Pendiente</MenuItem>
              <MenuItem value="paid">Pagado</MenuItem>
              <MenuItem value="cancelled">Cancelado</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExpenseEditOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleExpenseEditSubmit}
            disabled={expenseEditLoading || !expenseEditForm.amount || !expenseEditForm.dueDate}
          >
            {expenseEditLoading ? <CircularProgress size={20} /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Mark expense as paid dialog */}
      <Dialog open={expensePayOpen} onClose={() => setExpensePayOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Registrar Pago de Gasto</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <Typography variant="body2">
            {expensePayTarget?.description} — Total: ${Number(expensePayTarget?.amount || 0)}
          </Typography>
          {Number(expensePayTarget?.paidAmount || 0) > 0 && (
            <Box>
              <Typography variant="body2" color="success.main">
                Ya pagado: ${Number(expensePayTarget?.paidAmount || 0)} — Restante: ${Number(expensePayTarget?.amount || 0) - Number(expensePayTarget?.paidAmount || 0)}
              </Typography>
              {(expensePayTarget?.paymentHistory || []).length > 0 && (
                <Box sx={{ mt: 1, pl: 1 }}>
                  {(expensePayTarget.paymentHistory).map((entry, i) => (
                    <Typography key={i} variant="caption" display="block" color="text.secondary">
                      • ${Number(entry.amount)} — {entry.date} ({PAYMENT_METHODS.find(m => m.value === entry.method)?.label || entry.method})
                    </Typography>
                  ))}
                </Box>
              )}
            </Box>
          )}
          <TextField
            label="Monto a pagar"
            type="number"
            value={expensePayAmount}
            onChange={(e) => setExpensePayAmount(e.target.value)}
            fullWidth
            helperText="Ingresa el monto total o un abono parcial"
          />
          <FormControl fullWidth>
            <InputLabel>Método de Pago</InputLabel>
            <Select value={expensePayMethod} label="Método de Pago" onChange={(e) => setExpensePayMethod(e.target.value)}>
              {PAYMENT_METHODS.map(m => (
                <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExpensePayOpen(false)}>Cancelar</Button>
          <Button variant="contained" color="success" onClick={handleExpensePaySubmit} disabled={expensePayLoading || !expensePayAmount || Number(expensePayAmount) <= 0}>
            {expensePayLoading ? <CircularProgress size={20} /> : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete expense confirmation dialog */}
      <Dialog open={expenseDeleteOpen} onClose={() => setExpenseDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Eliminar el gasto "{expenseDeleteTarget?.description}" por ${Number(expenseDeleteTarget?.amount || 0)}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExpenseDeleteOpen(false)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleExpenseDeleteSubmit}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create payment dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Registrar Pago</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <FormControl fullWidth>
            <InputLabel>Asignar a</InputLabel>
            <Select
              value={createMode}
              label="Asignar a"
              onChange={(e) => {
                setCreateMode(e.target.value)
                setCreateForm(f => ({ ...f, studentId: '', teamId: '' }))
              }}
            >
              <MenuItem value="individual">Alumno individual</MenuItem>
              <MenuItem value="team">Equipo completo</MenuItem>
            </Select>
          </FormControl>
          {createMode === 'individual' ? (
            <FormControl fullWidth>
              <InputLabel>Alumno</InputLabel>
              <Select
                value={createForm.studentId}
                label="Alumno"
                onChange={(e) => setCreateForm(f => ({ ...f, studentId: e.target.value }))}
              >
                {students.filter(s => s.status === 'active').map(s => (
                  <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <FormControl fullWidth>
              <InputLabel>Equipo</InputLabel>
              <Select
                value={createForm.teamId}
                label="Equipo"
                onChange={(e) => setCreateForm(f => ({ ...f, teamId: e.target.value }))}
              >
                {teams.map(t => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.name} ({students.filter(s => s.status === 'active' && (s.teamIds || []).includes(t.id)).length} alumnos)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <FormControl fullWidth>
            <InputLabel>Tipo de Pago (Plantilla)</InputLabel>
            <Select
              value={createForm.templateId}
              label="Tipo de Pago (Plantilla)"
              onChange={(e) => handleTemplateChange(e.target.value)}
              disabled={templatesLoading}
            >
              <MenuItem value="">Sin plantilla (entrada libre)</MenuItem>
              {templates.map(t => (
                <MenuItem key={t.id} value={t.id}>{t.name} — ${Number(t.defaultAmount)}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Monto"
            type="number"
            value={createForm.amount}
            onChange={(e) => setCreateForm(f => ({ ...f, amount: e.target.value }))}
          />
          <TextField
            label="Fecha de Vencimiento"
            type="date"
            value={createForm.dueDate}
            onChange={(e) => setCreateForm(f => ({ ...f, dueDate: e.target.value }))}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Descripción"
            value={createForm.description}
            onChange={(e) => setCreateForm(f => ({ ...f, description: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleCreateSubmit}
            disabled={createLoading || !createForm.amount || !createForm.dueDate || (createMode === 'individual' ? !createForm.studentId : !createForm.teamId)}
          >
            {createLoading ? <CircularProgress size={20} /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Mark-as-paid dialog */}
      <Dialog open={payDialogOpen} onClose={() => setPayDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Registrar Pago</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <Typography variant="body2">
            {payTarget?.studentName} — Total: ${Number(payTarget?.amount || 0)}
          </Typography>
          {Number(payTarget?.paidAmount || 0) > 0 && (
            <Box>
              <Typography variant="body2" color="success.main">
                Ya pagado: ${Number(payTarget?.paidAmount || 0)} — Restante: ${Number(payTarget?.amount || 0) - Number(payTarget?.paidAmount || 0)}
              </Typography>
              {(payTarget?.paymentHistory || []).length > 0 && (
                <Box sx={{ mt: 1, pl: 1 }}>
                  {(payTarget.paymentHistory).map((entry, i) => (
                    <Typography key={i} variant="caption" display="block" color="text.secondary">
                      • ${Number(entry.amount)} — {entry.date} ({PAYMENT_METHODS.find(m => m.value === entry.method)?.label || entry.method})
                    </Typography>
                  ))}
                </Box>
              )}
            </Box>
          )}
          <TextField
            label="Monto a pagar"
            type="number"
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
            fullWidth
            helperText="Ingresa el monto total o un abono parcial"
          />
          <FormControl fullWidth>
            <InputLabel>Método de Pago</InputLabel>
            <Select value={payMethod} label="Método de Pago" onChange={(e) => setPayMethod(e.target.value)}>
              {PAYMENT_METHODS.map(m => (
                <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPayDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" color="success" onClick={handlePaySubmit} disabled={payLoading || !payAmount || Number(payAmount) <= 0}>
            {payLoading ? <CircularProgress size={20} /> : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Template create/edit dialog */}
      <Dialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingTemplateId ? 'Editar Tipo de Pago' : 'Crear Tipo de Pago'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField
            label="Nombre"
            value={templateForm.name}
            onChange={(e) => setTemplateForm(f => ({ ...f, name: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Monto por Defecto"
            type="number"
            value={templateForm.defaultAmount}
            onChange={(e) => setTemplateForm(f => ({ ...f, defaultAmount: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Descripción"
            value={templateForm.description}
            onChange={(e) => setTemplateForm(f => ({ ...f, description: e.target.value }))}
            fullWidth
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleTemplateSave}
            disabled={templateSaving || !templateForm.name || !templateForm.defaultAmount}
          >
            {templateSaving ? <CircularProgress size={20} /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que deseas eliminar el tipo de pago "{deleteTarget?.name}"?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleDeleteTemplate}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit payment dialog */}
      <Dialog open={editPaymentOpen} onClose={() => setEditPaymentOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Pago</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField
            label="Monto"
            type="number"
            value={editPaymentForm.amount}
            onChange={(e) => setEditPaymentForm(f => ({ ...f, amount: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Fecha de Vencimiento"
            type="date"
            value={editPaymentForm.dueDate}
            onChange={(e) => setEditPaymentForm(f => ({ ...f, dueDate: e.target.value }))}
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel>Estado</InputLabel>
            <Select
              value={editPaymentForm.status}
              label="Estado"
              onChange={(e) => setEditPaymentForm(f => ({ ...f, status: e.target.value }))}
            >
              <MenuItem value="pending">Pendiente</MenuItem>
              <MenuItem value="paid">Pagado</MenuItem>
              <MenuItem value="cancelled">Cancelado</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Descripción"
            value={editPaymentForm.description}
            onChange={(e) => setEditPaymentForm(f => ({ ...f, description: e.target.value }))}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditPaymentOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleEditPaymentSubmit}
            disabled={editPaymentLoading || !editPaymentForm.amount || !editPaymentForm.dueDate}
          >
            {editPaymentLoading ? <CircularProgress size={20} /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete payment confirmation dialog */}
      <Dialog open={deletePaymentOpen} onClose={() => setDeletePaymentOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Eliminar el pago de {deletePaymentTarget?.studentName} por ${Number(deletePaymentTarget?.amount || 0)}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeletePaymentOpen(false)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleDeletePaymentSubmit}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit abono dialog */}
      <Dialog open={editAbonoOpen} onClose={() => setEditAbonoOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Editar Abono</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField
            label="Monto"
            type="number"
            value={editAbonoForm.amount}
            onChange={(e) => setEditAbonoForm(f => ({ ...f, amount: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Fecha"
            type="date"
            value={editAbonoForm.date}
            onChange={(e) => setEditAbonoForm(f => ({ ...f, date: e.target.value }))}
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel>Método de Pago</InputLabel>
            <Select value={editAbonoForm.method} label="Método de Pago" onChange={(e) => setEditAbonoForm(f => ({ ...f, method: e.target.value }))}>
              {PAYMENT_METHODS.map(m => (
                <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditAbonoOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleEditAbonoSubmit} disabled={editAbonoLoading || !editAbonoForm.amount || !editAbonoForm.date}>
            {editAbonoLoading ? <CircularProgress size={20} /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete abono confirmation dialog */}
      <Dialog open={deleteAbonoOpen} onClose={() => setDeleteAbonoOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Eliminar Abono</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Eliminar el abono de ${Number(deleteAbonoEntry?.amount || 0)} del {deleteAbonoEntry?.date}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteAbonoOpen(false)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleDeleteAbonoSubmit}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit salary dialog */}
      <Dialog open={salaryEditOpen} onClose={() => setSalaryEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Salario</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          {salaryEditOriginalAmount != null && (
            <Typography variant="body2" color="text.secondary">
              Monto original generado: ${Number(salaryEditOriginalAmount)}
            </Typography>
          )}
          <TextField
            label="Monto"
            type="number"
            value={salaryEditForm.amount}
            onChange={(e) => setSalaryEditForm(f => ({ ...f, amount: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Fecha de Vencimiento"
            type="date"
            value={salaryEditForm.dueDate}
            onChange={(e) => setSalaryEditForm(f => ({ ...f, dueDate: e.target.value }))}
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel>Estado</InputLabel>
            <Select
              value={salaryEditForm.status}
              label="Estado"
              onChange={(e) => setSalaryEditForm(f => ({ ...f, status: e.target.value }))}
            >
              <MenuItem value="pending">Pendiente</MenuItem>
              <MenuItem value="paid">Pagado</MenuItem>
              <MenuItem value="cancelled">Cancelado</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSalaryEditOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSalaryEditSubmit}
            disabled={salaryEditLoading || !salaryEditForm.amount || !salaryEditForm.dueDate}
          >
            {salaryEditLoading ? <CircularProgress size={20} /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Mark salary as paid dialog */}
      <Dialog open={salaryPayOpen} onClose={() => setSalaryPayOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Registrar Pago de Salario</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <Typography variant="body2">
            {salaryPayTarget?.coachName} — {salaryPayTarget?.teamName} — Total: ${Number(salaryPayTarget?.amount || 0)}
          </Typography>
          {Number(salaryPayTarget?.paidAmount || 0) > 0 && (
            <Box>
              <Typography variant="body2" color="success.main">
                Ya pagado: ${Number(salaryPayTarget?.paidAmount || 0)} — Restante: ${Number(salaryPayTarget?.amount || 0) - Number(salaryPayTarget?.paidAmount || 0)}
              </Typography>
              {(salaryPayTarget?.paymentHistory || []).length > 0 && (
                <Box sx={{ mt: 1, pl: 1 }}>
                  {(salaryPayTarget.paymentHistory).map((entry, i) => (
                    <Typography key={i} variant="caption" display="block" color="text.secondary">
                      • ${Number(entry.amount)} — {entry.date} ({PAYMENT_METHODS.find(m => m.value === entry.method)?.label || entry.method})
                    </Typography>
                  ))}
                </Box>
              )}
            </Box>
          )}
          <TextField
            label="Monto a pagar"
            type="number"
            value={salaryPayAmount}
            onChange={(e) => setSalaryPayAmount(e.target.value)}
            fullWidth
            helperText="Ingresa el monto total o un abono parcial"
          />
          <FormControl fullWidth>
            <InputLabel>Método de Pago</InputLabel>
            <Select value={salaryPayMethod} label="Método de Pago" onChange={(e) => setSalaryPayMethod(e.target.value)}>
              {PAYMENT_METHODS.map(m => (
                <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSalaryPayOpen(false)}>Cancelar</Button>
          <Button variant="contained" color="success" onClick={handleSalaryPaySubmit} disabled={salaryPayLoading || !salaryPayAmount || Number(salaryPayAmount) <= 0}>
            {salaryPayLoading ? <CircularProgress size={20} /> : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete salary confirmation dialog */}
      <Dialog open={salaryDeleteOpen} onClose={() => setSalaryDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Eliminar el salario de {salaryDeleteTarget?.coachName} ({salaryDeleteTarget?.teamName}) por ${Number(salaryDeleteTarget?.amount || 0)}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSalaryDeleteOpen(false)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleSalaryDeleteSubmit}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}
