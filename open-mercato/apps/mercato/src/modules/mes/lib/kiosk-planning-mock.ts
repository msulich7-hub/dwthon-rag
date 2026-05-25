/**
 * Planning-backed kiosk mock data.
 * Replace with planning-module API when orders/BOM/routing are finalized.
 */

export type KioskNest = {
  code: string
  name: string
  line: string
}

export type KioskOperator = {
  id: string
  displayName: string
  badge: string
}

export type KioskMaterialLine = {
  code: string
  name: string
  hint?: string
}

export type KioskPlannedOperationStatus = 'upcoming' | 'ready' | 'in_progress' | 'completed'

export type KioskPlannedOperation = {
  id: string
  sequence: number
  planBatchId: string
  routingReleased: true
  workOrderId: string
  orderNumber: string
  productCode: string
  operationCode: string
  operationName: string
  status: KioskPlannedOperationStatus
  scheduledStart: string
  scheduledEnd: string
  materials: KioskMaterialLine[]
}

export const KIOSK_MOCK_NESTS: KioskNest[] = [
  { code: 'WC-ASSY-01', name: 'Assembly A', line: 'Line 1' },
  { code: 'WC-PAINT-02', name: 'Paint cell', line: 'Line 1' },
  { code: 'WC-PACK-03', name: 'Pack-out', line: 'Line 2' },
]

const OPERATORS: Record<string, KioskOperator> = {
  'WC-ASSY-01': { id: 'op-anna', displayName: 'Anna Kowalska', badge: 'AFS9-1042' },
  'WC-PAINT-02': { id: 'op-marek', displayName: 'Marek Nowak', badge: 'AFS9-1088' },
  'WC-PACK-03': { id: 'op-ola', displayName: 'Ola Wiśniewska', badge: 'AFS9-1101' },
}

function hoursFromNow(h: number): string {
  return new Date(Date.now() + h * 3_600_000).toISOString()
}

const ALL_OPERATIONS: KioskPlannedOperation[] = [
  {
    id: 'plan-op-101',
    sequence: 10,
    planBatchId: 'PLAN-2026-W21-A',
    routingReleased: true,
    workOrderId: 'wo-mock-1001',
    orderNumber: 'WO-2026-1042',
    productCode: 'SKU-HOUSING-A',
    operationCode: 'ASSY-10',
    operationName: 'Sub-assembly housing',
    status: 'in_progress',
    scheduledStart: hoursFromNow(-1),
    scheduledEnd: hoursFromNow(2),
    materials: [
      { code: 'RM-HOUSING-01', name: 'Housing shell' },
      { code: 'RM-FAST-M4', name: 'M4 screw kit' },
    ],
  },
  {
    id: 'plan-op-102',
    sequence: 20,
    planBatchId: 'PLAN-2026-W21-A',
    routingReleased: true,
    workOrderId: 'wo-mock-1001',
    orderNumber: 'WO-2026-1042',
    productCode: 'SKU-HOUSING-A',
    operationCode: 'ASSY-20',
    operationName: 'Fit control module',
    status: 'upcoming',
    scheduledStart: hoursFromNow(2),
    scheduledEnd: hoursFromNow(5),
    materials: [
      { code: 'RM-CTRL-12', name: 'Control module v12' },
      { code: 'RM-CABLE-SET', name: 'Cable harness' },
    ],
  },
  {
    id: 'plan-op-103',
    sequence: 30,
    planBatchId: 'PLAN-2026-W21-A',
    routingReleased: true,
    workOrderId: 'wo-mock-1002',
    orderNumber: 'WO-2026-1048',
    productCode: 'SKU-HOUSING-B',
    operationCode: 'ASSY-10',
    operationName: 'Sub-assembly housing',
    status: 'upcoming',
    scheduledStart: hoursFromNow(6),
    scheduledEnd: hoursFromNow(10),
    materials: [{ code: 'RM-HOUSING-02', name: 'Housing shell B' }],
  },
  {
    id: 'plan-op-201',
    sequence: 10,
    planBatchId: 'PLAN-2026-W21-B',
    routingReleased: true,
    workOrderId: 'wo-mock-2001',
    orderNumber: 'WO-2026-1055',
    productCode: 'SKU-FINISH-X',
    operationCode: 'PNT-10',
    operationName: 'Primer coat',
    status: 'ready',
    scheduledStart: hoursFromNow(0),
    scheduledEnd: hoursFromNow(3),
    materials: [
      { code: 'RM-PRIMER-5L', name: 'Primer 5L', hint: 'Max 1 pallet / week (future rule)' },
      { code: 'RM-MASK-TAPE', name: 'Masking tape' },
    ],
  },
  {
    id: 'plan-op-202',
    sequence: 20,
    planBatchId: 'PLAN-2026-W21-B',
    routingReleased: true,
    workOrderId: 'wo-mock-2001',
    orderNumber: 'WO-2026-1055',
    productCode: 'SKU-FINISH-X',
    operationCode: 'PNT-20',
    operationName: 'Top coat',
    status: 'upcoming',
    scheduledStart: hoursFromNow(4),
    scheduledEnd: hoursFromNow(8),
    materials: [{ code: 'RM-TOPCOAT-5L', name: 'Top coat 5L' }],
  },
  {
    id: 'plan-op-301',
    sequence: 10,
    planBatchId: 'PLAN-2026-W21-C',
    routingReleased: true,
    workOrderId: 'wo-mock-3001',
    orderNumber: 'WO-2026-1060',
    productCode: 'SKU-BOX-STD',
    operationCode: 'PKG-10',
    operationName: 'Pack & label',
    status: 'ready',
    scheduledStart: hoursFromNow(1),
    scheduledEnd: hoursFromNow(4),
    materials: [
      { code: 'RM-BOX-STD', name: 'Standard carton' },
      { code: 'RM-LABEL-ROLL', name: 'Label roll' },
    ],
  },
  {
    id: 'plan-op-302',
    sequence: 20,
    planBatchId: 'PLAN-2026-W21-C',
    routingReleased: true,
    workOrderId: 'wo-mock-3002',
    orderNumber: 'WO-2026-1062',
    productCode: 'SKU-BOX-STD',
    operationCode: 'PKG-10',
    operationName: 'Pack & label',
    status: 'upcoming',
    scheduledStart: hoursFromNow(8),
    scheduledEnd: hoursFromNow(14),
    materials: [{ code: 'RM-BOX-STD', name: 'Standard carton' }],
  },
]

const NEST_FOR_OP: Record<string, string> = {
  'plan-op-101': 'WC-ASSY-01',
  'plan-op-102': 'WC-ASSY-01',
  'plan-op-103': 'WC-ASSY-01',
  'plan-op-201': 'WC-PAINT-02',
  'plan-op-202': 'WC-PAINT-02',
  'plan-op-301': 'WC-PACK-03',
  'plan-op-302': 'WC-PACK-03',
}

export function getDefaultNestCode(): string {
  return KIOSK_MOCK_NESTS[0]!.code
}

export function resolveNestCode(urlNest: string | null | undefined): string {
  if (urlNest && KIOSK_MOCK_NESTS.some((n) => n.code === urlNest)) return urlNest
  return getDefaultNestCode()
}

export function getNestMeta(code: string): KioskNest {
  return KIOSK_MOCK_NESTS.find((n) => n.code === code) ?? KIOSK_MOCK_NESTS[0]!
}

export function getOperatorForNest(nestCode: string): KioskOperator | null {
  return OPERATORS[nestCode] ?? null
}

export function getPlannedOperationsForNest(nestCode: string): KioskPlannedOperation[] {
  return ALL_OPERATIONS.filter((op) => NEST_FOR_OP[op.id] === nestCode).sort((a, b) => a.sequence - b.sequence)
}

/** @deprecated Use getNowOperationView from kiosk-planning-view-model */
export function getNowOperation(ops: KioskPlannedOperation[]): KioskPlannedOperation | null {
  const sorted = [...ops].sort((a, b) => a.sequence - b.sequence)
  const inProgress = sorted.find((o) => o.status === 'in_progress')
  if (inProgress) return inProgress
  return sorted.find((o) => o.status === 'ready') ?? null
}

export type KioskTimelineSlot = {
  operationId: string
  orderNumber: string
  operationName: string
  start: Date
  end: Date
  status: KioskPlannedOperationStatus
}

export function getTimelineForNest(
  nestCode: string,
  horizonHours: number,
): KioskTimelineSlot[] {
  const cutoff = Date.now() + horizonHours * 3_600_000
  return getPlannedOperationsForNest(nestCode)
    .map((op) => ({
      operationId: op.id,
      orderNumber: op.orderNumber,
      operationName: op.operationName,
      start: new Date(op.scheduledStart),
      end: new Date(op.scheduledEnd),
      status: op.status,
    }))
    .filter((slot) => slot.start.getTime() <= cutoff)
}

export function cloneOperationsForNest(nestCode: string): KioskPlannedOperation[] {
  return getPlannedOperationsForNest(nestCode).map((op) => ({ ...op, materials: [...op.materials] }))
}

export function applyMockConfirmation(
  ops: KioskPlannedOperation[],
  operationId: string,
  type: 'start' | 'complete',
): KioskPlannedOperation[] {
  return ops.map((op) => {
    if (op.id !== operationId) return op
    if (type === 'start' && op.status === 'ready') return { ...op, status: 'in_progress' }
    if (type === 'complete' && op.status === 'in_progress') return { ...op, status: 'completed' }
    return op
  })
}

export function findMockOperationByScan(ops: KioskPlannedOperation[], scan: string): KioskPlannedOperation | null {
  const u = scan.trim().toUpperCase()
  return (
    ops.find(
      (o) =>
        o.orderNumber.toUpperCase() === u ||
        o.productCode.toUpperCase() === u ||
        o.operationCode.toUpperCase() === u,
    ) ?? null
  )
}

export function uniqueMockWorkOrders(ops: KioskPlannedOperation[]): {
  workOrderId: string
  orderNumber: string
  productCode: string
}[] {
  const seen = new Set<string>()
  const out: { workOrderId: string; orderNumber: string; productCode: string }[] = []
  for (const op of ops) {
    if (seen.has(op.workOrderId)) continue
    seen.add(op.workOrderId)
    out.push({
      workOrderId: op.workOrderId,
      orderNumber: op.orderNumber,
      productCode: op.productCode,
    })
  }
  return out
}
