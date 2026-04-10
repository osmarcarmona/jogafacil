/**
 * Pure utility functions for expense display, filtering, and metrics.
 */

/**
 * Returns the display status for an expense.
 * If the stored status is 'pending' and the dueDate is before currentDate,
 * returns 'overdue'. Otherwise returns the stored status.
 *
 * @param {{ status: string, dueDate: string }} expense
 * @param {Date|string} currentDate
 * @returns {string} display status
 */
export function getExpenseDisplayStatus(expense, currentDate) {
  const current = typeof currentDate === 'string' ? new Date(currentDate) : currentDate
  const due = new Date(expense.dueDate)

  if (expense.status === 'pending' && due < current) {
    return 'overdue'
  }
  return expense.status
}

/**
 * Validates an expense object for required fields and constraints.
 *
 * @param {{ description: string, amount: number }} expense
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateExpense(expense) {
  if (!expense.description || !expense.description.trim()) {
    return { valid: false, error: 'Description is required' }
  }
  if (expense.amount === undefined || expense.amount === null || Number(expense.amount) <= 0) {
    return { valid: false, error: 'Amount must be greater than zero' }
  }
  return { valid: true }
}

/**
 * Filters expenses by search term (description, case-insensitive)
 * and by display status.
 *
 * @param {Array} expenses
 * @param {string} searchTerm
 * @param {string} statusFilter - status to filter by, or 'Todos'/'all' for no filter
 * @param {Date|string} [currentDate=new Date()]
 * @returns {Array} filtered expenses
 */
export function filterExpenses(expenses, searchTerm, statusFilter, currentDate = new Date()) {
  return expenses.filter(expense => {
    const desc = (expense.description || '').toLowerCase()
    const matchesSearch = !searchTerm || desc.includes(searchTerm.toLowerCase())

    if (!matchesSearch) return false

    if (statusFilter && statusFilter !== 'Todos' && statusFilter !== 'all') {
      const displayStatus = getExpenseDisplayStatus(expense, currentDate)
      return displayStatus === statusFilter
    }

    return true
  })
}

/**
 * Filters expenses by category.
 *
 * @param {Array} expenses
 * @param {string} categoryFilter - category to filter by, or 'Todos'/'all' for no filter
 * @returns {Array} filtered expenses
 */
export function filterExpensesByCategory(expenses, categoryFilter) {
  if (!categoryFilter || categoryFilter === 'Todos' || categoryFilter === 'all') {
    return expenses
  }
  return expenses.filter(e => e.category === categoryFilter)
}

/**
 * Filters expenses by date range on dueDate.
 *
 * @param {Array} expenses
 * @param {string|null} startDate - inclusive start (YYYY-MM-DD), or null for no lower bound
 * @param {string|null} endDate - inclusive end (YYYY-MM-DD), or null for no upper bound
 * @returns {Array} filtered expenses
 */
export function filterExpensesByDateRange(expenses, startDate, endDate) {
  if (!startDate && !endDate) return expenses
  return expenses.filter(e => {
    const due = e.dueDate || ''
    if (startDate && due < startDate) return false
    if (endDate && due > endDate) return false
    return true
  })
}

/**
 * Computes aggregated metrics from a list of expenses.
 *
 * @param {Array} expenses
 * @param {Date|string} [currentDate=new Date()]
 * @returns {{ pending: number, overdue: number, totalPorCobrar: number, paid: number }}
 */
export function computeExpenseMetrics(expenses, currentDate = new Date()) {
  let pending = 0
  let overdue = 0
  let paid = 0

  for (const expense of expenses) {
    const displayStatus = getExpenseDisplayStatus(expense, currentDate)
    const amount = Number(expense.amount) || 0

    if (displayStatus === 'paid') {
      paid += amount
    } else if (displayStatus === 'overdue') {
      overdue += amount
    } else if (displayStatus === 'pending') {
      pending += amount
    }
  }

  return {
    pending,
    overdue,
    totalPorCobrar: pending + overdue,
    paid,
  }
}
