import type { EntityManager } from '@mikro-orm/postgresql'
import { randomUUID } from 'node:crypto'
import {
  ProductionPlanningGenesisNode,
  ProductionPlanningGenesisRoot,
  ProductionPlanningOrder,
  ProductionPlanningPeggingLink,
  ProductionPlanningNettingRun,
  type NettingRunStatus,
} from '../../data/entities'
import { isPoolNettingOrderCode } from '../ifs/extract-pilot'
import { FACTORY_ORDER_CODE_PREFIX } from '../seed-factory-fixture'
import { recordIfsStagingBatch } from '../ifs/staging-batch'
import type { OrgScope } from '../production-order'
import { explodeBom, explodeContentHash, maxExplodedLevel } from './explode'
import { bootstrapGenesisFromSilver } from './netting-from-silver'
import { resolveVariantTree } from './resolve-variant-tree'
import { poolGroupKey, weekBucketKey } from './time-buckets'
import { emitProductionPlanningEvent } from '../events'
import { stableUuidFromString } from '../stable-uuid'

export type NettingRunResult = {
  runId: string
  status: NettingRunStatus
  rootsProcessed: number
  poolMoCreated: number
  peggingLinksCreated: number
  naiveMoCount: number
  consolidatedMoCount: number
  consolidationPct: number
  wallMs: number
  message: string | null
}

type PoolGroup = {
  key: string
  productSku: string
  bucketKey: string
  orders: ProductionPlanningOrder[]
}

export async function executeNettingRun(
  em: EntityManager,
  scope: OrgScope,
  options?: { mode?: 'full' | 'incremental'; bootstrapFromSilver?: boolean },
): Promise<NettingRunResult> {
  const started = Date.now()
  const runId = randomUUID()
  const mode = options?.mode ?? 'full'

  const run = em.create(ProductionPlanningNettingRun, {
    id: runId,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    mode,
    status: 'running',
    startedAt: new Date(),
  })
  await em.persistAndFlush(run)

  if (options?.bootstrapFromSilver) {
    await bootstrapGenesisFromSilver(em, scope)
  }

  let orders = await em.find(ProductionPlanningOrder, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    status: { $in: ['draft', 'planned', 'in_progress'] },
  })
  orders = orders.filter((o) => !isPoolNettingOrderCode(o.code))

  if (mode === 'incremental') {
    const lastCompleted = await em.findOne(
      ProductionPlanningNettingRun,
      {
        tenantId: scope.tenantId,
        organizationId: scope.organizationId,
        status: 'completed',
        id: { $ne: runId },
      },
      { orderBy: { completedAt: 'DESC' } },
    )
    if (lastCompleted?.completedAt) {
      const since = lastCompleted.completedAt
      orders = orders.filter((o) => o.updatedAt >= since)
    }
  }

  const naiveMoCount = orders.length
  const poolGroups = new Map<string, PoolGroup>()

  for (const order of orders) {
    const sku = order.productSku?.trim() || 'UNKNOWN'
    const key = poolGroupKey(sku, order.dueAt)
    const group = poolGroups.get(key) ?? {
      key,
      productSku: sku,
      bucketKey: order.dueAt ? weekBucketKey(order.dueAt) : 'no-due',
      orders: [],
    }
    group.orders.push(order)
    poolGroups.set(key, group)
  }

  let rootsProcessed = 0
  let poolMoCreated = 0
  let peggingLinksCreated = 0

  for (const order of orders) {
    const demandSourceId = order.salesOrderId
      ? `so:${order.salesOrderId}:${order.id}`
      : `mo:${order.id}`
    const contentHash = explodeContentHash(order.productSku ?? 'UNKNOWN', Number(order.quantity))
    const rootId = stableUuidFromString(
      `genesis:root:${scope.tenantId}:${scope.organizationId}:${demandSourceId}`,
    )

    let root = await em.findOne(ProductionPlanningGenesisRoot, { id: rootId })
    if (!root) {
      root = em.create(ProductionPlanningGenesisRoot, {
        id: rootId,
        tenantId: scope.tenantId,
        organizationId: scope.organizationId,
        demandSourceType: order.salesOrderId ? 'sales_order_line' : 'production_order',
        demandSourceId,
        salesOrderId: order.salesOrderId ?? null,
        productSku: order.productSku ?? 'UNKNOWN',
        quantity: Number(order.quantity),
        dueAt: order.dueAt ?? null,
        variantCode: 'default',
        status: 'pending',
        contentHash,
        nettingRunId: runId,
      })
      em.persist(root)
    } else {
      root.nettingRunId = runId
      root.quantity = Number(order.quantity)
      root.dueAt = order.dueAt ?? null
      root.contentHash = contentHash
    }

    const variant = resolveVariantTree({
      productSku: order.productSku ?? 'UNKNOWN',
      quantity: Number(order.quantity),
      requestedDate: order.dueAt,
    })

    const exploded = explodeBom({
      rootSku: order.productSku ?? 'UNKNOWN',
      quantity: Number(order.quantity),
      requestedDate: order.dueAt,
      maxDepth: 6,
    })

    await em.nativeDelete(ProductionPlanningGenesisNode, { genesisRootId: rootId })

    const nodeIdByKey = new Map<string, string>()
    for (const line of exploded) {
      const nodeId = stableUuidFromString(`genesis:node:${rootId}:${line.nodeKey}`)
      nodeIdByKey.set(line.nodeKey, nodeId)
      const parentNodeId = line.parentNodeKey
        ? (nodeIdByKey.get(line.parentNodeKey) ?? null)
        : null
      em.persist(
        em.create(ProductionPlanningGenesisNode, {
          id: nodeId,
          tenantId: scope.tenantId,
          organizationId: scope.organizationId,
          genesisRootId: rootId,
          parentNodeId,
          nodeKey: line.nodeKey,
          level: line.level,
          nodeType: line.nodeType,
          productSku: line.productSku,
          extendedQty: line.extendedQty,
          timeBucketKey: order.dueAt ? weekBucketKey(order.dueAt) : null,
          grossReqQty: line.extendedQty,
          netReqQty: line.extendedQty,
        }),
      )
    }

    root.status = 'exploded'
    root.variantCode = variant.variantCode
    root.resolutionJson = JSON.stringify({
      variantCode: variant.variantCode,
      bomRevisionId: variant.bomRevisionId,
      explodedNodeCount: exploded.length,
      maxLevel: maxExplodedLevel(exploded),
      source: 'mercato_bom_catalog',
    })
    rootsProcessed += 1
  }

  for (const group of poolGroups.values()) {
    if (group.orders.length < 2) continue

    const poolCode = `${FACTORY_ORDER_CODE_PREFIX}POOL-NET-${group.productSku.replace(/[^A-Z0-9]/gi, '').slice(0, 12)}-${group.bucketKey}`
    let poolOrder = await em.findOne(ProductionPlanningOrder, {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      code: poolCode,
    })

    if (!poolOrder) {
      const totalQty = group.orders.reduce((s, o) => s + Number(o.quantity), 0)
      poolOrder = em.create(ProductionPlanningOrder, {
        id: stableUuidFromString(`pool:mo:${scope.tenantId}:${scope.organizationId}:${group.key}`),
        tenantId: scope.tenantId,
        organizationId: scope.organizationId,
        code: poolCode.slice(0, 80),
        title: `Pool MO ${group.productSku} · ${group.bucketKey}`,
        productSku: group.productSku,
        quantity: totalQty,
        status: 'planned',
        dueAt: group.orders[0]?.dueAt ?? null,
        notesJson: JSON.stringify({ pool: true, nettingRunId: runId, memberCount: group.orders.length }),
      })
      em.persist(poolOrder)
      poolMoCreated += 1
    }

    for (const member of group.orders) {
      const rootId = stableUuidFromString(
        `genesis:root:${scope.tenantId}:${scope.organizationId}:${
          member.salesOrderId ? `so:${member.salesOrderId}:${member.id}` : `mo:${member.id}`
        }`,
      )
      const pegId = stableUuidFromString(`peg:${runId}:${rootId}:${poolOrder.id}`)
      const existingPeg = await em.findOne(ProductionPlanningPeggingLink, { id: pegId })
      if (!existingPeg) {
        em.persist(
          em.create(ProductionPlanningPeggingLink, {
            id: pegId,
            tenantId: scope.tenantId,
            organizationId: scope.organizationId,
            genesisRootId: rootId,
            productionOrderId: poolOrder.id,
            nettingRunId: runId,
            quantity: Number(member.quantity),
            linkType: 'pool',
          }),
        )
        peggingLinksCreated += 1
      }
      member.salesOrderId = member.salesOrderId ?? null
      let priorNotes: Record<string, unknown> = {}
      if (member.notesJson) {
        try {
          priorNotes = JSON.parse(member.notesJson) as Record<string, unknown>
        } catch {
          priorNotes = {}
        }
      }
      if (!priorNotes.poolMember) {
        member.notesJson = JSON.stringify({
          ...priorNotes,
          poolMember: true,
          poolOrderId: poolOrder.id,
        })
      }
    }
  }

  await em.flush()

  const consolidatedMoCount = poolMoCreated + (naiveMoCount - groupOrdersInPools(poolGroups))
  const consolidationPct =
    naiveMoCount > 0
      ? Math.round(((naiveMoCount - consolidatedMoCount) / naiveMoCount) * 100)
      : 0

  await recordIfsStagingBatch(em, scope, {
    batchType: 'pilot_sync',
    rowCount: orders.length,
    stats: { nettingRunId: runId, mode },
  })

  const wallMs = Date.now() - started
  run.status = 'completed'
  run.rootsProcessed = rootsProcessed
  run.poolMoCreated = poolMoCreated
  run.peggingLinksCreated = peggingLinksCreated
  run.naiveMoCount = naiveMoCount
  run.consolidatedMoCount = Math.max(poolMoCreated, naiveMoCount - peggingLinksCreated)
  run.completedAt = new Date()
  run.statsJson = JSON.stringify({ consolidationPct, wallMs, poolGroupCount: poolGroups.size })
  run.message = `Netting completed: ${consolidationPct}% MO reduction vs naive`
  await em.flush()

  await emitProductionPlanningEvent(
    'production_planning.netting.completed',
    {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      runId,
      rootsProcessed,
      poolMoCreated,
      consolidationPct,
      wallMs,
    },
    { persistent: true },
  )

  return {
    runId,
    status: 'completed',
    rootsProcessed,
    poolMoCreated,
    peggingLinksCreated,
    naiveMoCount,
    consolidatedMoCount: run.consolidatedMoCount,
    consolidationPct,
    wallMs,
    message: run.message ?? null,
  }
}

function groupOrdersInPools(groups: Map<string, PoolGroup>): number {
  let count = 0
  for (const g of groups.values()) {
    if (g.orders.length >= 2) count += g.orders.length
  }
  return count
}

export async function getNettingRun(
  em: EntityManager,
  scope: OrgScope,
  runId: string,
): Promise<ProductionPlanningNettingRun | null> {
  return em.findOne(ProductionPlanningNettingRun, {
    id: runId,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })
}
