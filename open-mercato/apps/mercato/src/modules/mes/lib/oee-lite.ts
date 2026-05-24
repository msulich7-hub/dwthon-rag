export type OeeLiteInput = {
  queueReady: number
  queueInProgress: number
  activeDowntimeCount: number
  workCenterCount: number
  checklistFailed: number
  checklistTotal: number
  scrapQtyToday: number
  goodQtyToday: number
}

export type OeeLiteSnapshot = {
  availabilityPct: number
  performancePct: number
  qualityPct: number
  oeePct: number
}

function clampPct(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value * 10) / 10))
}

export function computeOeeLite(input: OeeLiteInput): OeeLiteSnapshot {
  const wcCount = Math.max(input.workCenterCount, 1)
  const downtimePenalty = Math.min(input.activeDowntimeCount / wcCount, 1)
  const availabilityPct = clampPct((1 - downtimePenalty) * 100)

  const queueTotal = input.queueReady + input.queueInProgress
  const performancePct =
    queueTotal === 0
      ? 100
      : clampPct((input.queueInProgress / queueTotal) * 100)

  const produced = input.goodQtyToday + input.scrapQtyToday
  const checklistPenalty =
    input.checklistTotal > 0 ? input.checklistFailed / input.checklistTotal : 0
  const scrapPenalty = produced > 0 ? input.scrapQtyToday / produced : 0
  const qualityPct = clampPct((1 - Math.max(checklistPenalty, scrapPenalty)) * 100)

  const oeePct = clampPct((availabilityPct * performancePct * qualityPct) / 10_000)

  return { availabilityPct, performancePct, qualityPct, oeePct }
}
