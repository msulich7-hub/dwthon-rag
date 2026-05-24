import type { EntityManager } from '@mikro-orm/postgresql'
import {
  ProductionPlanningOperation,
  ProductionPlanningOrder,
  type ProductionOrderStatus,
} from '../data/entities'
import type { OrgScope } from './production-order'
import { stableUuidFromString } from './stable-uuid'

export type FactorySeedPreset = 'small' | 'medium' | 'benchmark'

export const FACTORY_ORDER_CODE_PREFIX = 'FACTORY-'

const DEPARTMENTS = ['CUT', 'PAINT', 'EXTRUDE', 'WELD', 'ASM', 'QC', 'PACK', 'SHIP'] as const

const OPERATION_NAMES: Record<(typeof DEPARTMENTS)[number], string> = {
  CUT: 'Cut stock',
  PAINT: 'Paint / coat',
  EXTRUDE: 'Extrude profile',
  WELD: 'Weld assembly',
  ASM: 'Final assembly',
  QC: 'Quality check',
  PACK: 'Pack & label',
  SHIP: 'Stage for ship',
}

export type FactorySeedPresetConfig = {
  orderCount: number
  workCenterCount: number
  minOpsPerOrder: number
  maxOpsPerOrder: number
  peggedOrderFraction: number
  poolOrderFraction: number
}

export const FACTORY_SEED_PRESETS: Record<FactorySeedPreset, FactorySeedPresetConfig> = {
  small: {
    orderCount: 20,
    workCenterCount: 12,
    minOpsPerOrder: 3,
    maxOpsPerOrder: 5,
    peggedOrderFraction: 0.3,
    poolOrderFraction: 0.1,
  },
  medium: {
    orderCount: 100,
    workCenterCount: 40,
    minOpsPerOrder: 3,
    maxOpsPerOrder: 5,
    peggedOrderFraction: 0.3,
    poolOrderFraction: 0.1,
  },
  benchmark: {
    orderCount: 100,
    workCenterCount: 150,
    minOpsPerOrder: 22,
    maxOpsPerOrder: 28,
    peggedOrderFraction: 0.3,
    poolOrderFraction: 0.1,
  },
}

export type FactorySeedPlanOrder = {
  id: string
  code: string
  title: string
  salesOrderId: string | null
  productSku: string
  quantity: number
  status: ProductionOrderStatus
  workCenterCode: string
  dueAt: Date
  operations: Array<{
    id: string
    sequenceNo: number
    name: string
    workCenterCode: string
    durationMinutes: number
  }>
}

export type FactorySeedPlan = {
  preset: FactorySeedPreset
  workCenterCodes: string[]
  orders: FactorySeedPlanOrder[]
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function seedToInt(preset: FactorySeedPreset, tenantId: string, organizationId: string): number {
  const hex = stableUuidFromString(`factory:rng:${preset}:${tenantId}:${organizationId}`).replace(/-/g, '')
  return parseInt(hex.slice(0, 8), 16)
}

function pickInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1))
}

export function buildWorkCenterCodes(count: number): string[] {
  const codes: string[] = []
  let deptIdx = 0
  let seq = 1
  while (codes.length < count) {
    const dept = DEPARTMENTS[deptIdx % DEPARTMENTS.length]!
    codes.push(`WC-${dept}-${String(seq).padStart(2, '0')}`)
    deptIdx += 1
    if (deptIdx % DEPARTMENTS.length === 0) seq += 1
  }
  return codes
}

export function buildFactorySeedPlan(
  scope: OrgScope,
  preset: FactorySeedPreset,
): FactorySeedPlan {
  const config = FACTORY_SEED_PRESETS[preset]
  const rng = mulberry32(seedToInt(preset, scope.tenantId, scope.organizationId))
  const workCenterCodes = buildWorkCenterCodes(config.workCenterCount)

  const peggedCount = Math.round(config.orderCount * config.peggedOrderFraction)
  const poolCount = Math.round(config.orderCount * config.poolOrderFraction)
  const pegGroupSize = 3
  const pegGroupCount = Math.max(1, Math.ceil(peggedCount / pegGroupSize))

  const salesOrderIds = Array.from({ length: pegGroupCount }, (_, g) =>
    stableUuidFromString(
      `factory:sales:${scope.tenantId}:${scope.organizationId}:${preset}:${g}`,
    ),
  )

  const orders: FactorySeedPlanOrder[] = []
  let pegAssigned = 0

  for (let i = 0; i < config.orderCount; i++) {
    const orderIndex = i + 1
    const isPool = i < poolCount
    const code = isPool
      ? `${FACTORY_ORDER_CODE_PREFIX}POOL-${String(orderIndex).padStart(5, '0')}`
      : `${FACTORY_ORDER_CODE_PREFIX}MO-${String(orderIndex).padStart(5, '0')}`

    const id = stableUuidFromString(
      `factory:mo:${scope.tenantId}:${scope.organizationId}:${preset}:${orderIndex}`,
    )

    let salesOrderId: string | null = null
    if (pegAssigned < peggedCount) {
      const groupIdx = Math.floor(pegAssigned / pegGroupSize) % salesOrderIds.length
      salesOrderId = salesOrderIds[groupIdx]!
      pegAssigned += 1
    }

    const opCount = pickInt(rng, config.minOpsPerOrder, config.maxOpsPerOrder)
    const operations: FactorySeedPlanOrder['operations'] = []
    let totalMinutes = 0

    for (let seq = 1; seq <= opCount; seq++) {
      const dept = DEPARTMENTS[(i + seq) % DEPARTMENTS.length]!
      const wcPool = workCenterCodes.filter((wc) => wc.includes(`-${dept}-`))
      const workCenterCode =
        wcPool.length > 0
          ? wcPool[Math.floor(rng() * wcPool.length)]!
          : workCenterCodes[Math.floor(rng() * workCenterCodes.length)]!
      const durationMinutes = 15 + pickInt(rng, 0, 11) * 5
      totalMinutes += durationMinutes
      operations.push({
        id: stableUuidFromString(`factory:op:${id}:${seq}`),
        sequenceNo: seq,
        name: OPERATION_NAMES[dept] ?? `Operation ${seq}`,
        workCenterCode,
        durationMinutes,
      })
    }

    const dueDays = 3 + pickInt(rng, 0, 21)
    const dueAt = new Date()
    dueAt.setUTCDate(dueAt.getUTCDate() + dueDays)
    dueAt.setUTCHours(17, 0, 0, 0)

    const statusRoll = rng()
    const status: ProductionOrderStatus =
      statusRoll < 0.08 ? 'in_progress' : statusRoll < 0.12 ? 'draft' : 'planned'

    orders.push({
      id,
      code,
      title: isPool
        ? `Pool MO — component buffer ${orderIndex}`
        : `Factory MO ${orderIndex} — ${operations[operations.length - 1]?.name ?? 'production'}`,
      salesOrderId,
      productSku: `SKU-FACT-${String((i % 24) + 1).padStart(3, '0')}`,
      quantity: 1 + (i % 5),
      status,
      workCenterCode: operations[operations.length - 1]!.workCenterCode,
      dueAt,
      operations,
    })
  }

  return { preset, workCenterCodes, orders }
}

export function countFactorySeedOperations(plan: FactorySeedPlan): number {
  return plan.orders.reduce((sum, o) => sum + o.operations.length, 0)
}

export function countPeggedOrders(plan: FactorySeedPlan): number {
  return plan.orders.filter((o) => o.salesOrderId != null).length
}

export type SeedFactoryFixtureOptions = {
  preset?: FactorySeedPreset
  force?: boolean
  logger?: (message: string) => void
}

export type SeedFactoryFixtureResult = {
  created: boolean
  preset: FactorySeedPreset
  orderCount: number
  operationCount: number
  workCenterCount: number
  peggedOrderCount: number
}

async function deleteExistingFactoryFixture(
  em: EntityManager,
  scope: OrgScope,
): Promise<{ orders: number; operations: number }> {
  const orders = await em.find(ProductionPlanningOrder, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    code: { $like: `${FACTORY_ORDER_CODE_PREFIX}%` },
  })

  if (orders.length === 0) {
    return { orders: 0, operations: 0 }
  }

  const orderIds = orders.map((o) => o.id)
  const opDelete = await em.nativeDelete(ProductionPlanningOperation, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    productionOrderId: { $in: orderIds },
  })
  const orderDelete = await em.nativeDelete(ProductionPlanningOrder, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    id: { $in: orderIds },
  })

  return { orders: orderDelete, operations: opDelete }
}

export async function seedFactoryFixture(
  em: EntityManager,
  scope: OrgScope,
  options: SeedFactoryFixtureOptions = {},
): Promise<SeedFactoryFixtureResult> {
  const preset = options.preset ?? 'small'
  const logger = options.logger ?? (() => {})
  const plan = buildFactorySeedPlan(scope, preset)

  if (options.force) {
    const removed = await deleteExistingFactoryFixture(em, scope)
    if (removed.orders > 0) {
      logger(
        `Removed ${removed.orders} factory orders and ${removed.operations} operations (force)`,
      )
    }
  } else {
    const existing = await em.count(ProductionPlanningOrder, {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      code: { $like: `${FACTORY_ORDER_CODE_PREFIX}%` },
    })
    if (existing > 0) {
      logger(
        `Factory fixture already present (${existing} orders); use --force to replace`,
      )
      return {
        created: false,
        preset,
        orderCount: existing,
        operationCount: 0,
        workCenterCount: plan.workCenterCodes.length,
        peggedOrderCount: 0,
      }
    }
  }

  const now = new Date()
  for (const row of plan.orders) {
    const order = em.create(ProductionPlanningOrder, {
      id: row.id,
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      code: row.code,
      title: row.title,
      salesOrderId: row.salesOrderId,
      productSku: row.productSku,
      quantity: row.quantity,
      status: row.status,
      workCenterCode: row.workCenterCode,
      dueAt: row.dueAt,
      notesJson: JSON.stringify({
        seed: 'factory_fixture',
        preset: plan.preset,
        workCenters: plan.workCenterCodes.length,
      }),
      createdAt: now,
      updatedAt: now,
    })
    em.persist(order)

    for (const op of row.operations) {
      em.persist(
        em.create(ProductionPlanningOperation, {
          id: op.id,
          tenantId: scope.tenantId,
          organizationId: scope.organizationId,
          productionOrderId: row.id,
          sequenceNo: op.sequenceNo,
          name: op.name,
          workCenterCode: op.workCenterCode,
          durationMinutes: op.durationMinutes,
          status: 'pending',
          createdAt: now,
          updatedAt: now,
        }),
      )
    }
  }

  await em.flush()

  const operationCount = countFactorySeedOperations(plan)
  const peggedOrderCount = countPeggedOrders(plan)

  logger(
    `Seeded factory fixture preset=${preset}: ${plan.orders.length} MO, ${operationCount} operations, ${plan.workCenterCodes.length} work centers, ${peggedOrderCount} pegged`,
  )

  return {
    created: true,
    preset,
    orderCount: plan.orders.length,
    operationCount,
    workCenterCount: plan.workCenterCodes.length,
    peggedOrderCount,
  }
}
