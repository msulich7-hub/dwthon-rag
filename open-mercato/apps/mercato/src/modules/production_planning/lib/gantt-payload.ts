import type { EntityManager } from '@mikro-orm/postgresql'
import {
  ProductionPlanningOperation,
  ProductionPlanningOrder,
} from '../data/entities'
import { getPlanScenario } from './plan-scenario-service'
import type { CpsatScheduleEntry } from './ortools-bridge'
import type { OrgScope } from './production-order'
import { isOrderLate } from './capacity-snapshot'

export type GanttOperationBar = {
  operationId: string
  productionOrderId: string
  orderCode: string
  productSku: string | null
  workCenterCode: string
  plannedStartAt: string
  plannedEndAt: string
  durationMinutes: number
  isLate: boolean
  status: string
}

export type GanttWorkCenterRow = {
  workCenterCode: string
  department: string | null
  utilizationPct: number
  operations: GanttOperationBar[]
}

export type GanttPayload = {
  horizonHours: number
  planningStartAt: string
  planningEndAt: string
  workCenterCount: number
  operationCount: number
  rows: GanttWorkCenterRow[]
  source: 'live' | 'scenario'
  scenarioId?: string
}

function departmentFromWc(code: string): string | null {
  const m = code.match(/^WC-([A-Z]+)-/)
  return m?.[1] ?? null
}

function barsFromSchedule(
  schedule: CpsatScheduleEntry[],
  orderById: Map<string, ProductionPlanningOrder>,
): GanttOperationBar[] {
  return schedule.map((row) => {
    const order = row.productionOrderId ? orderById.get(row.productionOrderId) : undefined
    return {
      operationId: row.operationId,
      productionOrderId: row.productionOrderId ?? '',
      orderCode: order?.code ?? '—',
      productSku: order?.productSku ?? null,
      workCenterCode: row.workCenterCode,
      plannedStartAt: row.plannedStartAt,
      plannedEndAt: row.plannedEndAt,
      durationMinutes: Math.max(
        1,
        Math.round(
          (Date.parse(row.plannedEndAt) - Date.parse(row.plannedStartAt)) / 60_000,
        ),
      ),
      isLate: order ? isOrderLate(order) : false,
      status: 'scheduled',
    }
  })
}

function parsePlanningStartAt(value?: string | Date | null): Date {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Date.parse(value)
    if (Number.isFinite(parsed)) return new Date(parsed)
  }
  return new Date()
}

export async function buildGanttPayload(
  em: EntityManager,
  scope: OrgScope,
  options?: {
    horizonHours?: number
    scenarioId?: string
    maxWorkCenters?: number
    planningStartAt?: string | Date
  },
): Promise<GanttPayload> {
  const horizonHours = options?.horizonHours ?? 168
  const planningStartAt = parsePlanningStartAt(options?.planningStartAt)
  const planningEndAt = new Date(planningStartAt.getTime() + horizonHours * 60 * 60 * 1000)
  const maxWc = options?.maxWorkCenters ?? 150

  if (options?.scenarioId) {
    const scenario = await getPlanScenario(em, scope, options.scenarioId)
    const schedule = scenario?.schedulePreview ?? []
    const orderIds = [
      ...new Set(schedule.map((s) => s.productionOrderId).filter((id): id is string => Boolean(id))),
    ]
    const orders =
      orderIds.length > 0
        ? await em.find(ProductionPlanningOrder, {
            id: { $in: orderIds },
            tenantId: scope.tenantId,
            organizationId: scope.organizationId,
          })
        : []
    const orderById = new Map(orders.map((o) => [o.id, o]))
    const bars = barsFromSchedule(schedule, orderById)
    return buildRowsFromBars(bars, {
      horizonHours,
      planningStartAt,
      planningEndAt,
      maxWc,
      source: 'scenario',
      scenarioId: options.scenarioId,
    })
  }

  const operations = await em.find(
    ProductionPlanningOperation,
    {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      status: { $nin: ['completed', 'cancelled'] },
      $or: [
        { plannedStartAt: { $lte: planningEndAt } },
        { plannedStartAt: null },
      ],
    },
    { orderBy: { plannedStartAt: 'ASC' }, limit: 5000 },
  )

  const orderIds = [...new Set(operations.map((o) => o.productionOrderId))]
  const orders = await em.find(ProductionPlanningOrder, {
    id: { $in: orderIds },
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })
  const orderById = new Map(orders.map((o) => [o.id, o]))

  const bars: GanttOperationBar[] = []
  for (const op of operations) {
    const order = orderById.get(op.productionOrderId)
    const start = op.plannedStartAt ?? planningStartAt
    const end =
      op.plannedEndAt ??
      new Date(start.getTime() + op.durationMinutes * 60_000)
    bars.push({
      operationId: op.id,
      productionOrderId: op.productionOrderId,
      orderCode: order?.code ?? '—',
      productSku: order?.productSku ?? null,
      workCenterCode: op.workCenterCode,
      plannedStartAt: start.toISOString(),
      plannedEndAt: end.toISOString(),
      durationMinutes: op.durationMinutes,
      isLate: order ? isOrderLate(order) : false,
      status: op.status,
    })
  }

  return buildRowsFromBars(bars, {
    horizonHours,
    planningStartAt,
    planningEndAt,
    maxWc,
    source: 'live',
  })
}

function buildRowsFromBars(
  bars: GanttOperationBar[],
  ctx: {
    horizonHours: number
    planningStartAt: Date
    planningEndAt: Date
    maxWc: number
    source: 'live' | 'scenario'
    scenarioId?: string
  },
): GanttPayload {
  const byWc = new Map<string, GanttOperationBar[]>()
  for (const bar of bars) {
    const list = byWc.get(bar.workCenterCode) ?? []
    list.push(bar)
    byWc.set(bar.workCenterCode, list)
  }

  const horizonMs = ctx.horizonHours * 60 * 60 * 1000
  const rows: GanttWorkCenterRow[] = [...byWc.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, ctx.maxWc)
    .map(([workCenterCode, operations]) => {
      const scheduledMinutes = operations.reduce((s, o) => s + o.durationMinutes, 0)
      const utilizationPct = Math.min(
        100,
        Math.round((scheduledMinutes / (ctx.horizonHours * 60)) * 100),
      )
      return {
        workCenterCode,
        department: departmentFromWc(workCenterCode),
        utilizationPct,
        operations: operations.sort(
          (a, b) => Date.parse(a.plannedStartAt) - Date.parse(b.plannedStartAt),
        ),
      }
    })

  return {
    horizonHours: ctx.horizonHours,
    planningStartAt: ctx.planningStartAt.toISOString(),
    planningEndAt: ctx.planningEndAt.toISOString(),
    workCenterCount: rows.length,
    operationCount: bars.length,
    rows,
    source: ctx.source,
    scenarioId: ctx.scenarioId,
  }
}
