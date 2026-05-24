import { mergeGanttForCompare, resolveSharedPlanningStartAt } from '../gantt-compare'
import type { GanttPayload } from '../gantt-payload'

function samplePayload(
  overrides: Partial<GanttPayload> & { bars?: Array<{ opId: string; wc: string; start: string }> },
): GanttPayload {
  const planningStartAt = overrides.planningStartAt ?? '2026-05-24T08:00:00.000Z'
  const rows = (overrides.bars ?? []).reduce<
    Map<string, GanttPayload['rows'][number]>
  >((acc, b) => {
    const row = acc.get(b.wc) ?? {
      workCenterCode: b.wc,
      department: 'ASM',
      utilizationPct: 10,
      operations: [],
    }
    row.operations.push({
      operationId: b.opId,
      productionOrderId: 'po-1',
      orderCode: 'MO-1',
      productSku: 'SKU-1',
      workCenterCode: b.wc,
      plannedStartAt: b.start,
      plannedEndAt: new Date(Date.parse(b.start) + 60 * 60_000).toISOString(),
      durationMinutes: 60,
      isLate: false,
      status: 'scheduled',
    })
    acc.set(b.wc, row)
    return acc
  }, new Map())

  return {
    horizonHours: 72,
    planningStartAt,
    planningEndAt: '2026-05-27T08:00:00.000Z',
    workCenterCount: rows.size,
    operationCount: overrides.bars?.length ?? 0,
    rows: [...rows.values()],
    source: 'scenario',
    scenarioId: overrides.scenarioId,
  }
}

describe('resolveSharedPlanningStartAt', () => {
  it('prefers explicit ISO string', () => {
    const d = resolveSharedPlanningStartAt(null, null, '2026-01-15T12:00:00.000Z')
    expect(d.toISOString()).toBe('2026-01-15T12:00:00.000Z')
  })

  it('falls back to baseline payload', () => {
    const baseline = samplePayload({ planningStartAt: '2026-03-01T00:00:00.000Z', bars: [] })
    const d = resolveSharedPlanningStartAt(baseline, null)
    expect(d.toISOString()).toBe('2026-03-01T00:00:00.000Z')
  })
})

describe('mergeGanttForCompare', () => {
  it('marks moved operations when start shifts beyond threshold', () => {
    const baseline = samplePayload({
      scenarioId: 'base',
      bars: [{ opId: 'op-1', wc: 'WC-ASM-01', start: '2026-05-24T10:00:00.000Z' }],
    })
    const scenario = samplePayload({
      scenarioId: 'a',
      bars: [{ opId: 'op-1', wc: 'WC-ASM-01', start: '2026-05-24T14:00:00.000Z' }],
    })
    const merged = mergeGanttForCompare(baseline, scenario, 'base', 'a')
    expect(merged.rows[0]?.scenarioOperations[0]?.diffKind).toBe('moved')
  })

  it('unions work center rows from both payloads', () => {
    const baseline = samplePayload({
      bars: [{ opId: 'op-1', wc: 'WC-ASM-01', start: '2026-05-24T10:00:00.000Z' }],
    })
    const scenario = samplePayload({
      bars: [{ opId: 'op-2', wc: 'WC-CUT-02', start: '2026-05-24T11:00:00.000Z' }],
    })
    const merged = mergeGanttForCompare(baseline, scenario, 'b', 'a')
    expect(merged.workCenterCount).toBe(2)
    expect(merged.rows.map((r) => r.workCenterCode).sort()).toEqual(['WC-ASM-01', 'WC-CUT-02'])
  })
})
