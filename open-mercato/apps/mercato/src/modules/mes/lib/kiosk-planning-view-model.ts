import {
  cloneOperationsForNest,
  getNestMeta,
  getOperatorForNest,
  getPlannedOperationsForNest,
  type KioskMaterialLine,
  type KioskPlannedOperation,
  type KioskPlannedOperationStatus,
} from './kiosk-planning-mock'

export type KioskOperationDisplayStatus = KioskPlannedOperationStatus | 'blocked'

export type KioskBlockReasonKey = 'mes.kiosk.blockedPriorOp' | 'mes.kiosk.blockedNestBusy'

export type KioskOperationView = KioskPlannedOperation & {
  displayStatus: KioskOperationDisplayStatus
  canStart: boolean
  canComplete: boolean
  blockedReasonKey?: KioskBlockReasonKey
}

export type KioskRoutingHint = {
  nestCode: string
  nestName: string
  operationName: string
}

const PLAN_PUBLISHED_AT = '2026-05-25T06:00:00.000Z'

/** Next operation on another nest after this step (mock routing handoff). */
const ROUTING_HANDOFF: Record<string, KioskRoutingHint> = {
  'plan-op-101': { nestCode: 'WC-ASSY-01', nestName: 'Assembly A', operationName: 'Fit control module' },
  'plan-op-102': { nestCode: 'WC-PAINT-02', nestName: 'Paint cell', operationName: 'Primer coat' },
  'plan-op-103': { nestCode: 'WC-PAINT-02', nestName: 'Paint cell', operationName: 'Primer coat' },
  'plan-op-201': { nestCode: 'WC-PAINT-02', nestName: 'Paint cell', operationName: 'Top coat' },
  'plan-op-202': { nestCode: 'WC-PACK-03', nestName: 'Pack-out', operationName: 'Pack & label' },
  'plan-op-301': { nestCode: 'WC-PACK-03', nestName: 'Pack-out', operationName: 'Pack & label (WO-1062)' },
}

const NEST_STORAGE_KEY = 'mes_kiosk_nest_v1'
const OPS_STORAGE_PREFIX = 'mes_kiosk_ops_v1_'
const ONBOARDING_KEY = 'mes_kiosk_onboarding_v1'

export function formatMaterialQty(line: KioskMaterialLine): string {
  if (line.quantity != null && line.unit) return `${line.quantity} ${line.unit}`
  if (line.quantity != null) return String(line.quantity)
  return '—'
}

export function isKioskOnboardingDone(): boolean {
  if (typeof window === 'undefined') return true
  try {
    return window.localStorage.getItem(ONBOARDING_KEY) === '1'
  } catch {
    return true
  }
}

export function markKioskOnboardingDone(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(ONBOARDING_KEY, '1')
  } catch {
    /* ignore */
  }
}

function opsStorageKey(nestCode: string): string {
  return `${OPS_STORAGE_PREFIX}${nestCode}`
}

export function loadPersistedOps(nestCode: string): KioskPlannedOperation[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(opsStorageKey(nestCode))
    if (!raw) return null
    return JSON.parse(raw) as KioskPlannedOperation[]
  } catch {
    return null
  }
}

export function persistOps(nestCode: string, ops: KioskPlannedOperation[]): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(opsStorageKey(nestCode), JSON.stringify(ops))
  } catch {
    /* ignore */
  }
}

/** Planning module adapter — returns null until API is wired. */
export async function fetchKioskNestViewModelFromPlanning(
  _nestCode: string,
): Promise<KioskPlannedOperation[] | null> {
  return null
}

export function persistNestCode(code: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(NEST_STORAGE_KEY, code)
  } catch {
    /* ignore */
  }
}

export function readPersistedNestCode(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(NEST_STORAGE_KEY)
  } catch {
    return null
  }
}

function predecessorsFor(
  op: KioskPlannedOperation,
  ops: KioskPlannedOperation[],
): KioskPlannedOperation[] {
  return ops.filter((p) => p.workOrderId === op.workOrderId && p.sequence < op.sequence)
}

export function enrichOperations(ops: KioskPlannedOperation[]): KioskOperationView[] {
  const inProgress = ops.find((o) => o.status === 'in_progress')
  return ops.map((op) => {
    const preds = predecessorsFor(op, ops)
    const seqBlocked = preds.some((p) => p.status !== 'completed')
    const nestBusy = inProgress != null && inProgress.id !== op.id && op.status === 'ready'
    const blocked = seqBlocked || nestBusy
    let displayStatus: KioskOperationDisplayStatus = op.status
    if (blocked && (op.status === 'ready' || op.status === 'upcoming')) {
      displayStatus = 'blocked'
    }
    const canStart = op.status === 'ready' && !seqBlocked && !nestBusy
    const canComplete = op.status === 'in_progress'
    let blockedReasonKey: KioskBlockReasonKey | undefined
    if (seqBlocked) blockedReasonKey = 'mes.kiosk.blockedPriorOp'
    else if (nestBusy) blockedReasonKey = 'mes.kiosk.blockedNestBusy'
    return {
      ...op,
      displayStatus,
      canStart,
      canComplete,
      blockedReasonKey,
    }
  })
}

/** Lowest sequence in_progress, else lowest sequence ready that may start. */
export function getNowOperationView(views: KioskOperationView[]): KioskOperationView | null {
  const sorted = [...views].sort((a, b) => a.sequence - b.sequence)
  const inProgress = sorted.find((o) => o.status === 'in_progress')
  if (inProgress) return inProgress
  return sorted.find((o) => o.canStart) ?? null
}

export function promoteNextAfterComplete(
  ops: KioskPlannedOperation[],
  completedId: string,
): KioskPlannedOperation[] {
  const completed = ops.find((o) => o.id === completedId)
  if (!completed) return ops
  const next = ops
    .filter((o) => o.workOrderId === completed.workOrderId && o.sequence > completed.sequence)
    .sort((a, b) => a.sequence - b.sequence)[0]
  if (!next || next.status !== 'upcoming') return ops
  return ops.map((o) => (o.id === next.id ? { ...o, status: 'ready' as const } : o))
}

export function applyMockConfirmationWithGates(
  ops: KioskPlannedOperation[],
  operationId: string,
  type: 'start' | 'complete',
): KioskPlannedOperation[] {
  const views = enrichOperations(ops)
  const target = views.find((o) => o.id === operationId)
  if (!target) return ops
  if (type === 'start' && !target.canStart) return ops
  if (type === 'complete' && !target.canComplete) return ops

  let next = ops.map((op) => {
    if (op.id !== operationId) return op
    if (type === 'start' && op.status === 'ready') return { ...op, status: 'in_progress' as const }
    if (type === 'complete' && op.status === 'in_progress') return { ...op, status: 'completed' as const }
    return op
  })
  if (type === 'complete') {
    next = promoteNextAfterComplete(next, operationId)
  }
  return next
}

export function getRoutingHintAfter(operationId: string): KioskRoutingHint | null {
  return ROUTING_HANDOFF[operationId] ?? null
}

export function getPlanPublishedAt(): string {
  return PLAN_PUBLISHED_AT
}

export type KioskNestViewModel = {
  nestCode: string
  nestName: string
  line: string
  planBatchId: string
  planPublishedAt: string
  operator: ReturnType<typeof getOperatorForNest>
  operations: KioskOperationView[]
  now: KioskOperationView | null
}

export function buildKioskNestViewModel(nestCode: string, rawOps?: KioskPlannedOperation[]): KioskNestViewModel {
  const ops = rawOps ?? cloneOperationsForNest(nestCode)
  const views = enrichOperations(ops)
  const nest = getNestMeta(nestCode)
  return {
    nestCode,
    nestName: nest.name,
    line: nest.line,
    planBatchId: ops[0]?.planBatchId ?? '—',
    planPublishedAt: PLAN_PUBLISHED_AT,
    operator: getOperatorForNest(nestCode),
    operations: views,
    now: getNowOperationView(views),
  }
}

export function materialsForWorkOrder(
  ops: KioskPlannedOperation[],
  workOrderId: string,
): KioskMaterialLine[] {
  const lines = ops.filter((o) => o.workOrderId === workOrderId).flatMap((o) => o.materials)
  const seen = new Set<string>()
  return lines.filter((m) => {
    if (seen.has(m.code)) return false
    seen.add(m.code)
    return true
  })
}

export function initialMockOperationsForNest(nestCode: string): KioskPlannedOperation[] {
  const persisted = loadPersistedOps(nestCode)
  if (persisted?.length) return persisted.map((op) => ({ ...op, materials: [...op.materials] }))
  const ops = cloneOperationsForNest(nestCode)
  return ops.map((op) => {
    if (op.id === 'plan-op-102' && op.status === 'ready') {
      return { ...op, status: 'upcoming' as const }
    }
    return op
  })
}

export function getNextOperationIdAfterComplete(
  ops: KioskPlannedOperation[],
  completedId: string,
): string | null {
  const promoted = promoteNextAfterComplete(ops, completedId)
  const views = enrichOperations(promoted)
  return getNowOperationView(views)?.id ?? null
}

export { getPlannedOperationsForNest }
