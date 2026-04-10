/**
 * Pure utility functions for salary display, filtering, and metrics.
 */

/**
 * Returns the display status for a salary record.
 * If the stored status is 'pending' and the dueDate is before currentDate,
 * returns 'overdue'. Otherwise returns the stored status.
 *
 * @param {{ status: string, dueDate: string }} salary
 * @param {Date|string} currentDate
 * @returns {string} display status
 */
export function getSalaryDisplayStatus(salary, currentDate) {
  const current = typeof currentDate === 'string' ? new Date(currentDate) : currentDate
  const due = new Date(salary.dueDate)

  if (salary.status === 'pending' && due < current) {
    return 'overdue'
  }
  return salary.status
}

/**
 * Filters salaries by search term (coach name, case-insensitive)
 * and by display status.
 *
 * @param {Array} salaries
 * @param {string} searchTerm
 * @param {string} statusFilter - status to filter by, or 'Todos'/'all' for no filter
 * @param {Date|string} [currentDate=new Date()]
 * @returns {Array} filtered salaries
 */
export function filterSalaries(salaries, searchTerm, statusFilter, currentDate = new Date()) {
  return salaries.filter(salary => {
    const name = (salary.coachName || '').toLowerCase()
    const matchesSearch = !searchTerm || name.includes(searchTerm.toLowerCase())

    if (!matchesSearch) return false

    if (statusFilter && statusFilter !== 'Todos' && statusFilter !== 'all') {
      const displayStatus = getSalaryDisplayStatus(salary, currentDate)
      return displayStatus === statusFilter
    }

    return true
  })
}

/**
 * Filters salaries by coachId.
 *
 * @param {Array} salaries
 * @param {string} coachFilter - coachId to filter by, or 'Todos'/'all' for no filter
 * @returns {Array} filtered salaries
 */
export function filterSalariesByCoach(salaries, coachFilter) {
  if (!coachFilter || coachFilter === 'Todos' || coachFilter === 'all') {
    return salaries
  }
  return salaries.filter(s => s.coachId === coachFilter)
}

/**
 * Filters salaries by teamId.
 *
 * @param {Array} salaries
 * @param {string} teamFilter - teamId to filter by, or 'Todos'/'all' for no filter
 * @returns {Array} filtered salaries
 */
export function filterSalariesByTeam(salaries, teamFilter) {
  if (!teamFilter || teamFilter === 'Todos' || teamFilter === 'all') {
    return salaries
  }
  return salaries.filter(s => s.teamId === teamFilter)
}

/**
 * Filters salaries by date range on trainingDate.
 *
 * @param {Array} salaries
 * @param {string|null} startDate - inclusive start (YYYY-MM-DD), or null for no lower bound
 * @param {string|null} endDate - inclusive end (YYYY-MM-DD), or null for no upper bound
 * @returns {Array} filtered salaries
 */
export function filterSalariesByDateRange(salaries, startDate, endDate) {
  if (!startDate && !endDate) return salaries
  return salaries.filter(s => {
    const date = s.trainingDate || ''
    if (startDate && date < startDate) return false
    if (endDate && date > endDate) return false
    return true
  })
}

/**
 * Computes aggregated metrics from a list of salary records.
 *
 * @param {Array} salaries
 * @param {Date|string} [currentDate=new Date()]
 * @returns {{ pending: number, overdue: number, totalPorCobrar: number, paid: number }}
 */
export function computeSalaryMetrics(salaries, currentDate = new Date()) {
  let pending = 0
  let overdue = 0
  let paid = 0

  for (const salary of salaries) {
    const displayStatus = getSalaryDisplayStatus(salary, currentDate)
    const amount = Number(salary.amount) || 0

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
