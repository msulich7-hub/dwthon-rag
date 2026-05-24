import {
  analyzeFactoryFixturePipeline,
  buildFactorySeedPlan,
  factoryPlanToPayloadOrders,
} from '../seed-factory-fixture'
import {
  buildScheduleBatch,
  DEFAULT_MAX_OPERATIONS_PER_SOLVE,
  partitionOrdersPegAware,
  shouldRunCpsatAsync,
} from '../cpsat-chunking'
import {
  buildCrossOrderAssemblyLinks,
  filterAssemblyLinksForOperationIds,
} from '../pegging-to-assembly-links'

const SCOPE = {
  tenantId: '00000000-0000-4000-8000-000000000001',
  organizationId: '00000000-0000-4000-8000-000000000002',
}

const BASE_REQUEST = {
  tenantId: SCOPE.tenantId,
  organizationId: SCOPE.organizationId,
  horizonHours: 168,
  objective: 'minimize_lateness' as const,
  planningStartAt: '2026-05-24T08:00:00.000Z',
}

describe('factory fixture → CP-SAT pipeline', () => {
  it('small: single chunk, peg links present, sync in auto mode', () => {
    const metrics = analyzeFactoryFixturePipeline(SCOPE, 'small')
    expect(metrics.orderCount).toBe(20)
    expect(metrics.operationCount).toBeGreaterThanOrEqual(60)
    expect(metrics.crossOrderAssemblyLinks).toBeGreaterThan(0)
    expect(metrics.chunkCount).toBe(1)
    expect(metrics.maxOpsPerChunk).toBeLessThanOrEqual(DEFAULT_MAX_OPERATIONS_PER_SOLVE)
    expect(metrics.asyncAutoMode).toBe(true)
  })

  it('medium: multiple chunks, peg clusters stay in one partition', () => {
    const plan = buildFactorySeedPlan(SCOPE, 'medium')
    const orders = factoryPlanToPayloadOrders(plan)
    const links = buildCrossOrderAssemblyLinks(orders)
    expect(links.length).toBeGreaterThan(5)

    const partitions = partitionOrdersPegAware(orders, links, DEFAULT_MAX_OPERATIONS_PER_SOLVE)
    for (const link of links) {
      let chunkIdx: number | null = null
      for (let i = 0; i < partitions.length; i++) {
        const ids = new Set(
          partitions[i]!.flatMap((o) => o.operations.map((op) => op.id)),
        )
        const hasPred = ids.has(link.predecessorOperationId)
        const hasSucc = ids.has(link.successorOperationId)
        if (hasPred || hasSucc) {
          if (chunkIdx === null) chunkIdx = i
          else expect(chunkIdx).toBe(i)
        }
        if (hasPred && hasSucc) expect(chunkIdx).toBe(i)
      }
    }

    const metrics = analyzeFactoryFixturePipeline(SCOPE, 'medium')
    expect(metrics.chunkCount).toBeGreaterThanOrEqual(1)
    expect(metrics.asyncAutoMode).toBe(true)
  })

  it('benchmark: ~2.5k ops split into 500-op chunks with valid assembly links per chunk', () => {
    const plan = buildFactorySeedPlan(SCOPE, 'benchmark')
    const orders = factoryPlanToPayloadOrders(plan)
    const links = buildCrossOrderAssemblyLinks(orders)
    const batch = buildScheduleBatch(BASE_REQUEST, orders, { assemblyLinks: links })

    expect(batch.totalOperations).toBeGreaterThanOrEqual(2200)
    expect(batch.chunkCount).toBeGreaterThanOrEqual(5)

    for (const chunk of batch.chunks) {
      const opCount = chunk.orders.reduce((s, o) => s + o.operations.length, 0)
      expect(opCount).toBeGreaterThan(0)
      expect(opCount).toBeLessThanOrEqual(DEFAULT_MAX_OPERATIONS_PER_SOLVE)

      const opIds = new Set(chunk.orders.flatMap((o) => o.operations.map((op) => op.id)))
      const chunkLinks = filterAssemblyLinksForOperationIds(links, opIds)
      for (const link of chunkLinks) {
        expect(opIds.has(link.predecessorOperationId)).toBe(true)
        expect(opIds.has(link.successorOperationId)).toBe(true)
      }
      expect(chunk.assemblyLinks).toEqual(chunkLinks)
    }

    const metrics = analyzeFactoryFixturePipeline(SCOPE, 'benchmark')
    expect(metrics.workCenterCount).toBe(150)
    expect(metrics.uniqueWorkCentersUsed).toBeGreaterThan(50)
    expect(metrics.asyncAutoMode).toBe(true)
  })

  it('research metrics snapshot (documented invariants)', () => {
    const presets = ['small', 'medium', 'benchmark'] as const
    const table = presets.map((p) => analyzeFactoryFixturePipeline(SCOPE, p))

    for (const row of table) {
      expect(row.maxOpsPerChunk).toBeLessThanOrEqual(500)
      expect(row.peggedOrderCount).toBe(Math.round(row.orderCount * 0.3))
      expect(shouldRunCpsatAsync(row.orderCount, 'auto')).toBe(row.asyncAutoMode)
    }

    const bench = table.find((r) => r.preset === 'benchmark')!
    expect(bench.chunkCount).toBe(Math.ceil(bench.operationCount / 500))
  })

  it('benchmark batch exceeds 600 ops (rolling-horizon eligible scale)', () => {
    const plan = buildFactorySeedPlan(SCOPE, 'benchmark')
    const orders = factoryPlanToPayloadOrders(plan)
    const links = buildCrossOrderAssemblyLinks(orders)
    const batch = buildScheduleBatch({ ...BASE_REQUEST, horizonHours: 336 }, orders, {
      assemblyLinks: links,
    })
    expect(batch.totalOperations).toBeGreaterThan(600)
    expect(batch.chunkCount).toBeGreaterThanOrEqual(2)
  })
})
