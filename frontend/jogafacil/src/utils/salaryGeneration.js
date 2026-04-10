/**
 * Pure salary generation logic — mirrors backend/src/services/salary_generation.py
 * for frontend testability.
 */

/**
 * Returns the last day of a month given a YYYY-MM string.
 *
 * @param {string} month - format YYYY-MM
 * @returns {number} last day of the month
 */
function getLastDayOfMonth(month) {
  const [year, mon] = month.split('-').map(Number)
  return new Date(year, mon, 0).getDate()
}

/**
 * Generates salary records from training events for a given month.
 *
 * @param {Array<{ id: string, coachId: string, teamId?: string, teamName?: string, date: string }>} trainingEvents
 * @param {Array<{ id: string, name: string, salaryPerTraining?: number }>} coaches
 * @param {Array<{ scheduleEventId: string, coachId: string }>} existingSalaries
 * @param {string} month - target month in YYYY-MM format
 * @returns {{ newSalaries: Array, skippedCount: number }}
 */
export function generateSalaryRecords(trainingEvents, coaches, existingSalaries, month) {
  // Build coach lookup by id
  const coachesById = {}
  for (const coach of coaches) {
    coachesById[coach.id] = coach
  }

  // Build set of existing (scheduleEventId, coachId) keys
  const existingKeys = new Set(
    existingSalaries.map(s => `${s.scheduleEventId}|${s.coachId}`)
  )

  // Compute default due date (last day of month)
  const lastDay = getLastDayOfMonth(month)
  const defaultDueDate = `${month}-${String(lastDay).padStart(2, '0')}`

  const now = new Date().toISOString()
  const newSalaries = []
  let skippedCount = 0

  for (const event of trainingEvents) {
    const eventId = event.id
    const coachId = event.coachId || ''
    const key = `${eventId}|${coachId}`

    if (existingKeys.has(key)) {
      skippedCount++
      continue
    }

    const coach = coachesById[coachId] || {}
    const salaryRate = Number(coach.salaryPerTraining) || 0

    newSalaries.push({
      id: crypto.randomUUID(),
      coachId,
      coachName: coach.name || '',
      teamId: event.teamId || '',
      teamName: event.teamName || '',
      scheduleEventId: eventId,
      trainingDate: event.date || '',
      month,
      amount: salaryRate,
      originalAmount: salaryRate,
      status: 'pending',
      dueDate: defaultDueDate,
      paidAmount: 0,
      createdAt: now,
      updatedAt: now,
    })
  }

  return { newSalaries, skippedCount }
}
