/**
 * Mercato-native work-center calendars (Opcenter / IBP parity lite, no IFS shift ETL).
 */

export type WorkCenterCalendarDef = {
  id: string
  workCenterPattern: string
  shiftsPerDay: number
  hoursPerShift: number
  /** 0=Sun … 6=Sat */
  workingDays: number[]
  description?: string
}

export const DEFAULT_WORK_CENTER_CALENDARS: WorkCenterCalendarDef[] = [
  {
    id: 'cal-2shift-asm',
    workCenterPattern: 'WC-ASM-*',
    shiftsPerDay: 2,
    hoursPerShift: 8,
    workingDays: [1, 2, 3, 4, 5],
    description: 'Assembly — 2×8h Mon–Fri',
  },
  {
    id: 'cal-3shift-cut',
    workCenterPattern: 'WC-CUT-*',
    shiftsPerDay: 3,
    hoursPerShift: 8,
    workingDays: [1, 2, 3, 4, 5, 6],
    description: 'Cutting — 3×8h Mon–Sat',
  },
  {
    id: 'cal-1shift-qc',
    workCenterPattern: 'WC-QC-*',
    shiftsPerDay: 1,
    hoursPerShift: 8,
    workingDays: [1, 2, 3, 4, 5],
    description: 'QC — 1×8h weekdays',
  },
  {
    id: 'cal-default',
    workCenterPattern: '*',
    shiftsPerDay: 1,
    hoursPerShift: 8,
    workingDays: [1, 2, 3, 4, 5],
    description: 'Default single shift',
  },
]

function matchesPattern(code: string, pattern: string): boolean {
  if (pattern === '*') return true
  if (pattern.endsWith('*')) return code.startsWith(pattern.slice(0, -1))
  return code === pattern
}

export function resolveWorkCenterCalendar(workCenterCode: string): WorkCenterCalendarDef {
  for (const cal of DEFAULT_WORK_CENTER_CALENDARS) {
    if (cal.workCenterPattern !== '*' && matchesPattern(workCenterCode, cal.workCenterPattern)) {
      return cal
    }
  }
  return DEFAULT_WORK_CENTER_CALENDARS.find((c) => c.workCenterPattern === '*')!
}

/** Finite capacity minutes for a WC within horizon (calendar-aware). */
export function effectiveCapacityMinutes(
  workCenterCode: string,
  horizonHours: number,
  planningStartAt: Date = new Date(),
): number {
  const cal = resolveWorkCenterCalendar(workCenterCode)
  const minutesPerWorkingDay = cal.shiftsPerDay * cal.hoursPerShift * 60
  const horizonEnd = planningStartAt.getTime() + horizonHours * 60 * 60 * 1000
  let total = 0
  const cursor = new Date(planningStartAt)
  cursor.setHours(0, 0, 0, 0)
  while (cursor.getTime() < horizonEnd) {
    if (cal.workingDays.includes(cursor.getDay())) {
      const dayEnd = new Date(cursor)
      dayEnd.setDate(dayEnd.getDate() + 1)
      const sliceStart = Math.max(cursor.getTime(), planningStartAt.getTime())
      const sliceEnd = Math.min(dayEnd.getTime(), horizonEnd)
      if (sliceEnd > sliceStart) {
        const dayFraction = (sliceEnd - sliceStart) / (dayEnd.getTime() - cursor.getTime())
        total += minutesPerWorkingDay * dayFraction
      }
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return Math.max(1, Math.round(total))
}

export function computeCalendarUtilizationPct(
  scheduledMinutes: number,
  workCenterCode: string,
  horizonHours: number,
  planningStartAt?: Date,
): number {
  const cap = effectiveCapacityMinutes(workCenterCode, horizonHours, planningStartAt)
  return Math.min(100, Math.round((scheduledMinutes / cap) * 100))
}
