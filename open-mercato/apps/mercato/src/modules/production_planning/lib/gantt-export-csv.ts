import type { GanttPayload } from './gantt-payload'
import type { GanttDualComparePayload } from './gantt-compare'

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function ganttPayloadToCsv(payload: GanttPayload): string {
  const header = [
    'work_center',
    'department',
    'operation_id',
    'order_code',
    'planned_start',
    'planned_end',
    'duration_minutes',
    'is_late',
    'status',
  ].join(',')
  const rows: string[] = [header]
  for (const row of payload.rows) {
    for (const op of row.operations) {
      rows.push(
        [
          row.workCenterCode,
          row.department ?? '',
          op.operationId,
          op.orderCode,
          op.plannedStartAt,
          op.plannedEndAt,
          String(op.durationMinutes),
          op.isLate ? 'true' : 'false',
          op.status ?? 'scheduled',
        ]
          .map(escapeCsv)
          .join(','),
      )
    }
  }
  return rows.join('\n')
}

export function ganttCompareToCsv(payload: GanttDualComparePayload): string {
  const header = [
    'work_center',
    'side',
    'operation_id',
    'order_code',
    'planned_start',
    'planned_end',
    'diff_kind',
    'is_late',
  ].join(',')
  const rows: string[] = [header]
  for (const row of payload.rows) {
    for (const op of row.baselineOperations) {
      rows.push(
        [
          row.workCenterCode,
          'baseline',
          op.operationId,
          op.orderCode,
          op.plannedStartAt,
          op.plannedEndAt,
          op.diffKind,
          op.isLate ? 'true' : 'false',
        ]
          .map(escapeCsv)
          .join(','),
      )
    }
    for (const op of row.scenarioOperations) {
      rows.push(
        [
          row.workCenterCode,
          'scenario',
          op.operationId,
          op.orderCode,
          op.plannedStartAt,
          op.plannedEndAt,
          op.diffKind,
          op.isLate ? 'true' : 'false',
        ]
          .map(escapeCsv)
          .join(','),
      )
    }
  }
  return rows.join('\n')
}

export function downloadCsvInBrowser(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
