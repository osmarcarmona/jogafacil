/**
 * Pure utility functions for payment display and filtering logic.
 */

/**
 * Returns the display status for a payment.
 * If the stored status is 'pending' and the dueDate is before currentDate,
 * returns 'overdue'. Otherwise returns the stored status.
 *
 * @param {{ status: string, dueDate: string }} payment
 * @param {Date|string} currentDate - Date object or ISO date string
 * @returns {string} display status
 */
export function getDisplayStatus(payment, currentDate) {
  const current = typeof currentDate === 'string' ? new Date(currentDate) : currentDate
  const due = new Date(payment.dueDate)

  if (payment.status === 'pending' && due < current) {
    return 'overdue'
  }
  return payment.status
}

/**
 * Filters payments by paymentType.
 *
 * @param {Array} payments - array of payment objects
 * @param {string} typeFilter - payment type to filter by, or 'Todos'/'all' for no filter
 * @returns {Array} filtered payments
 */
export function filterPaymentsByType(payments, typeFilter) {
  if (!typeFilter || typeFilter === 'Todos' || typeFilter === 'all') {
    return payments
  }
  return payments.filter(p => p.paymentType === typeFilter)
}

/**
 * Filters payments by search term (student name, case-insensitive)
 * and by display status. Uses getDisplayStatus to compute the effective status.
 *
 * @param {Array} payments - array of payment objects
 * @param {string} searchTerm - text to match against studentName
 * @param {string} statusFilter - status to filter by, or 'Todos'/'all' for no filter
 * @param {Date|string} [currentDate=new Date()] - date used for overdue calculation
 * @returns {Array} filtered payments
 */
export function filterPayments(payments, searchTerm, statusFilter, currentDate = new Date()) {
  return payments.filter(payment => {
    const name = (payment.studentName || '').toLowerCase()
    const matchesSearch = !searchTerm || name.includes(searchTerm.toLowerCase())

    if (!matchesSearch) return false

    if (statusFilter && statusFilter !== 'Todos' && statusFilter !== 'all') {
      const displayStatus = getDisplayStatus(payment, currentDate)
      return displayStatus === statusFilter
    }

    return true
  })
}
