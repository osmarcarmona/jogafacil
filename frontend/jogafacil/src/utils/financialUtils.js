/**
 * Pure utility functions for financial dashboard aggregation.
 *
 * All functions are side-effect-free and operate on plain arrays of
 * payment, expense, and salary record objects.
 */

/**
 * Filters an array of records to those matching a given YYYY-MM month string.
 *
 * @param {Array<{ month: string }>} records
 * @param {string} month - YYYY-MM format
 * @returns {Array} records whose `month` field equals the given month
 */
export function filterByMonth(records, month) {
  if (!Array.isArray(records)) return []
  return records.filter(r => r && r.month === month)
}

/**
 * Returns an ordered array of YYYY-MM strings between monthFrom and monthTo inclusive.
 *
 * @param {string} monthFrom - YYYY-MM format
 * @param {string} monthTo - YYYY-MM format
 * @returns {string[]} ordered month strings
 */
export function getMonthsInRange(monthFrom, monthTo) {
  if (!monthFrom || !monthTo || monthFrom > monthTo) return []

  const months = []
  const [startYear, startMonth] = monthFrom.split('-').map(Number)
  const [endYear, endMonth] = monthTo.split('-').map(Number)

  let year = startYear
  let month = startMonth

  while (year < endYear || (year === endYear && month <= endMonth)) {
    months.push(`${year}-${String(month).padStart(2, '0')}`)
    month++
    if (month > 12) {
      month = 1
      year++
    }
  }

  return months
}


/**
 * Computes a MonthlySummary object from pre-filtered arrays of payments,
 * expenses, and salaries for a single month. Cancelled records are excluded
 * from all totals.
 *
 * @param {Array} payments - payment records for the month
 * @param {Array} expenses - expense records for the month
 * @param {Array} salaries - salary records for the month
 * @param {string} month - YYYY-MM format
 * @returns {import('../types').MonthlySummary}
 */
export function computeMonthlySummary(payments, expenses, salaries, month) {
  const safeAmount = (r) => Number(r.amount) || 0

  // Payments
  let grossIncome = 0
  let pendingIncome = 0
  let paidPaymentsCount = 0
  let pendingPaymentsCount = 0
  const incomeByPaymentType = {}

  for (const p of (payments || [])) {
    if (!p || p.status === 'cancelled') continue
    const amt = safeAmount(p)
    const abonado = Number(p.paidAmount || 0)
    const pType = p.paymentType || 'custom'
    if (p.status === 'paid') {
      grossIncome += amt
      paidPaymentsCount++
      incomeByPaymentType[pType] = (incomeByPaymentType[pType] || 0) + amt
    } else {
      // pending or overdue: abonos count as income received
      grossIncome += abonado
      pendingIncome += amt - abonado
      pendingPaymentsCount++
      if (abonado > 0) {
        incomeByPaymentType[pType] = (incomeByPaymentType[pType] || 0) + abonado
      }
    }
  }

  // Expenses
  let totalExpenses = 0
  let pendingExpenses = 0
  let paidExpensesCount = 0
  let pendingExpensesCount = 0
  const expensesByCategory = {}

  for (const e of (expenses || [])) {
    if (!e || e.status === 'cancelled') continue
    const amt = safeAmount(e)
    const cat = e.category || 'Otros'
    if (e.status === 'paid') {
      totalExpenses += amt
      paidExpensesCount++
    } else {
      pendingExpenses += amt
      pendingExpensesCount++
    }
    // Track all non-cancelled expenses by category
    if (!expensesByCategory[cat]) {
      expensesByCategory[cat] = { paid: 0, pending: 0 }
    }
    if (e.status === 'paid') {
      expensesByCategory[cat].paid += amt
    } else {
      expensesByCategory[cat].pending += amt
    }
  }

  // Salaries
  let totalSalaries = 0
  let pendingSalaries = 0
  let paidSalariesCount = 0
  let pendingSalariesCount = 0
  const salariesByCoach = {}

  for (const s of (salaries || [])) {
    if (!s || s.status === 'cancelled') continue
    const amt = safeAmount(s)
    const coach = s.coachName || 'Sin nombre'
    if (s.status === 'paid') {
      totalSalaries += amt
      paidSalariesCount++
      salariesByCoach[coach] = (salariesByCoach[coach] || 0) + amt
    } else {
      pendingSalaries += amt
      pendingSalariesCount++
    }
  }

  const totalOutflow = totalExpenses + totalSalaries
  const netProfit = grossIncome - totalOutflow
  const pendingOutflow = pendingExpenses + pendingSalaries

  return {
    month,
    grossIncome,
    pendingIncome,
    paidPaymentsCount,
    pendingPaymentsCount,
    incomeByPaymentType,
    totalExpenses,
    pendingExpenses,
    paidExpensesCount,
    pendingExpensesCount,
    expensesByCategory,
    totalSalaries,
    pendingSalaries,
    paidSalariesCount,
    pendingSalariesCount,
    salariesByCoach,
    totalOutflow,
    netProfit,
    pendingOutflow,
  }
}

/**
 * Returns an array of MonthlySummary objects, one per month in the given range.
 *
 * @param {Array} payments - all payment records
 * @param {Array} expenses - all expense records
 * @param {Array} salaries - all salary records
 * @param {string} monthFrom - YYYY-MM format
 * @param {string} monthTo - YYYY-MM format
 * @returns {Array} ordered MonthlySummary objects
 */
export function computeMultiMonthSummaries(payments, expenses, salaries, monthFrom, monthTo) {
  const months = getMonthsInRange(monthFrom, monthTo)
  return months.map(m =>
    computeMonthlySummary(
      filterByMonth(payments, m),
      filterByMonth(expenses, m),
      filterByMonth(salaries, m),
      m,
    )
  )
}

/**
 * Serializes a MonthlySummary object to a JSON string.
 *
 * @param {Object} summary - MonthlySummary object
 * @returns {string} JSON string
 */
export function serializeMonthlySummary(summary) {
  return JSON.stringify(summary)
}

/**
 * Deserializes a JSON string back into a MonthlySummary object.
 *
 * @param {string} json - JSON string
 * @returns {Object} MonthlySummary object
 */
export function deserializeMonthlySummary(json) {
  return JSON.parse(json)
}
