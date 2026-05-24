import { randomUUID } from 'node:crypto'
import type { CpsatAssemblyLink, CpsatScheduleEntry, CpsatScheduleRequest } from './ortools-bridge'
import { filterAssemblyLinksForOperationIds } from './pegging-to-assembly-links'

export const DEFAULT_ASYNC_ORDER_THRESHOLD = 20
export const DEFAULT_ORDER_CHUNK_SIZE = 25

export type ProductionOrderChunk = {
  index: number
  productionOrderIds: string[]
}

export type WorkCenterFloor = {
  workCenterCode: string
  earliestStartAt: string
}

export const DEFAULT_MAX_OPERATIONS_PER_SOLVE = 500

export type CpsatScheduleBatch = {
  batchId: string
  totalOperations: number
  chunkCount: number
  maxOperationsPerSolve: number
  chunks: CpsatScheduleRequest[]
}

export type PayloadOrder = CpsatScheduleRequest['orders'][number]

function countSchedulableOps(orders: PayloadOrder[]): number {
  return orders.reduce((sum, o) => sum + o.operations.length, 0)
}

export function partitionOrdersByOperationCap(
  orders: PayloadOrder[],
  maxOps: number,
): PayloadOrder[][] {
  const sorted = [...orders].sort((a, b) => {
    const da = a.dueAt ? Date.parse(a.dueAt) : Number.MAX_SAFE_INTEGER
    const db = b.dueAt ? Date.parse(b.dueAt) : Number.MAX_SAFE_INTEGER
    if (da !== db) return da - db
    return a.code.localeCompare(b.code)
  })

  const chunks: PayloadOrder[][] = []
  let current: PayloadOrder[] = []
  let currentOps = 0

  for (const order of sorted) {
    const opCount = order.operations.length
    if (opCount === 0) continue
    if (opCount > maxOps) {
      throw new Error('ORDER_EXCEEDS_MAX_OPERATIONS_PER_SOLVE')
    }
    if (currentOps + opCount > maxOps && current.length > 0) {
      chunks.push(current)
      current = []
      currentOps = 0
    }
    current.push(order)
    currentOps += opCount
  }
  if (current.length > 0) chunks.push(current)
  return chunks
}

function operationIdToOrderId(orders: PayloadOrder[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const order of orders) {
    for (const op of order.operations) map.set(op.id, order.id)
  }
  return map
}

/** Union-find order ids linked by cross-order assemblyLinks. */
export function partitionOrdersPegAware(
  orders: PayloadOrder[],
  assemblyLinks: CpsatAssemblyLink[],
  maxOps: number,
): PayloadOrder[][] {
  if (assemblyLinks.length === 0) {
    return partitionOrdersByOperationCap(orders, maxOps)
  }

  let partitions = partitionOrdersByOperationCap(orders, maxOps)
  const opToOrder = operationIdToOrderId(orders)

  const orderChunkIndex = (orderId: string): number =>
    partitions.findIndex((chunk) => chunk.some((o) => o.id === orderId))

  let guard = 0
  let changed = true
  while (changed && guard < partitions.length * assemblyLinks.length + 1) {
    guard += 1
    changed = false
    for (const link of assemblyLinks) {
      const orderA = opToOrder.get(link.predecessorOperationId)
      const orderB = opToOrder.get(link.successorOperationId)
      if (!orderA || !orderB || orderA === orderB) continue
      const idxA = orderChunkIndex(orderA)
      const idxB = orderChunkIndex(orderB)
      if (idxA < 0 || idxB < 0 || idxA === idxB) continue

      const keep = Math.min(idxA, idxB)
      const drop = Math.max(idxA, idxB)
      const merged = [...partitions[keep]!, ...partitions[drop]!]
      const mergedOps = countSchedulableOps(merged)
      if (mergedOps > maxOps) {
        throw new Error('PEG_CLUSTER_EXCEEDS_MAX_OPERATIONS')
      }
      partitions[keep] = merged
      partitions.splice(drop, 1)
      changed = true
      break
    }
  }

  return partitions
}

export function buildScheduleBatch(
  base: Omit<
    CpsatScheduleRequest,
    'orders' | 'chunk' | 'fixedOperations' | 'workCenterFloors' | 'assemblyLinks'
  >,
  orders: PayloadOrder[],
  options?: {
    maxOperationsPerSolve?: number
    batchId?: string
    assemblyLinks?: CpsatAssemblyLink[]
  },
): CpsatScheduleBatch {
  const maxOps = Math.min(options?.maxOperationsPerSolve ?? DEFAULT_MAX_OPERATIONS_PER_SOLVE, 500)
  const batchId = options?.batchId ?? randomUUID()
  const allLinks = options?.assemblyLinks ?? []
  const partitions =
    allLinks.length > 0
      ? partitionOrdersPegAware(orders, allLinks, maxOps)
      : partitionOrdersByOperationCap(orders, maxOps)
  const totalOperations = countSchedulableOps(orders)

  const chunks: CpsatScheduleRequest[] = partitions.map((partition, chunkIndex) => {
    const operationIds = partition.flatMap((o) => o.operations.map((op) => op.id))
    const opIdSet = new Set(operationIds)
    const chunkLinks = filterAssemblyLinksForOperationIds(allLinks, opIdSet)
    return {
      ...base,
      orders: partition,
      productionOrderIds: partition.map((o) => o.id),
      maxOperationsPerSolve: maxOps,
      fixedOperations: [],
      workCenterFloors: [],
      assemblyLinks: chunkLinks,
      chunk: {
        batchId,
        chunkIndex,
        chunkCount: partitions.length,
        totalOperations,
        operationIds,
      },
    }
  })

  return {
    batchId,
    totalOperations,
    chunkCount: chunks.length,
    maxOperationsPerSolve: maxOps,
    chunks,
  }
}

export function mergeCpsatSchedules(entries: CpsatScheduleEntry[]): CpsatScheduleEntry[] {
  const byId = new Map<string, CpsatScheduleEntry>()
  for (const e of entries) byId.set(e.operationId, e)
  return [...byId.values()].sort(
    (a, b) => Date.parse(a.plannedStartAt) - Date.parse(b.plannedStartAt),
  )
}

export function deriveWorkCenterFloorsFromSchedule(
  schedule: CpsatScheduleEntry[],
): Array<{ workCenterCode: string; earliestStartAt: string }> {
  const map = new Map<string, string>()
  for (const row of schedule) {
    const prev = map.get(row.workCenterCode)
    if (!prev || Date.parse(row.plannedEndAt) > Date.parse(prev)) {
      map.set(row.workCenterCode, row.plannedEndAt)
    }
  }
  return [...map.entries()].map(([workCenterCode, earliestStartAt]) => ({
    workCenterCode,
    earliestStartAt,
  }))
}

export function resolveCpsatChunkOrderLimit(): number {
  const raw = process.env.PRODUCTION_PLANNING_CPSAT_ORDER_CHUNK_SIZE
  const parsed = raw ? Number.parseInt(raw, 10) : NaN
  if (Number.isFinite(parsed) && parsed > 0) return Math.min(parsed, 100)
  return DEFAULT_ORDER_CHUNK_SIZE
}

export function partitionProductionOrderChunks(
  productionOrderIds: string[],
  chunkSize?: number,
): ProductionOrderChunk[] {
  const size = Math.max(1, Math.min(chunkSize ?? resolveCpsatChunkOrderLimit(), 100))
  const chunks: ProductionOrderChunk[] = []
  for (let i = 0; i < productionOrderIds.length; i += size) {
    chunks.push({
      index: chunks.length,
      productionOrderIds: productionOrderIds.slice(i, i + size),
    })
  }
  return chunks
}

export function shouldRunCpsatAsync(
  productionOrderCount: number,
  mode: 'sync' | 'async' | 'auto',
): boolean {
  if (mode === 'sync') return false
  if (mode === 'async') return true
  return productionOrderCount >= DEFAULT_ASYNC_ORDER_THRESHOLD
}

export function computeWorkCenterFloors(
  schedule: CpsatScheduleEntry[],
  _planningStart: Date,
): WorkCenterFloor[] {
  return deriveWorkCenterFloorsFromSchedule(schedule)
}

export function mergeChunkScheduleWithFloors(
  schedule: CpsatScheduleEntry[],
  planningStart: Date,
  floors: WorkCenterFloor[],
): CpsatScheduleEntry[] {
  const floorByWc = new Map(floors.map((f) => [f.workCenterCode, Date.parse(f.earliestStartAt)]))
  return schedule.map((row) => {
    const floorMs = floorByWc.get(row.workCenterCode)
    if (floorMs == null) return row
    const startMs = Date.parse(row.plannedStartAt)
    const endMs = Date.parse(row.plannedEndAt)
    const durationMs = endMs - startMs
    if (startMs >= floorMs) return row
    const shiftedStart = new Date(floorMs)
    const shiftedEnd = new Date(floorMs + durationMs)
    return {
      ...row,
      plannedStartAt: shiftedStart.toISOString(),
      plannedEndAt: shiftedEnd.toISOString(),
    }
  })
}

export function mergeChunkSchedules(
  chunkSchedules: CpsatScheduleEntry[][],
  planningStart: Date,
): CpsatScheduleEntry[] {
  const merged: CpsatScheduleEntry[] = []
  let floors: WorkCenterFloor[] = []

  for (const chunk of chunkSchedules) {
    const adjusted = mergeChunkScheduleWithFloors(chunk, planningStart, floors)
    merged.push(...adjusted)
    floors = computeWorkCenterFloors(merged, planningStart)
  }

  return mergeCpsatSchedules(merged)
}
