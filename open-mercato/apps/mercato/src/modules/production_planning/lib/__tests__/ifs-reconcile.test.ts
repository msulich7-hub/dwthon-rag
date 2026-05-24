function compareCounts(
  liveCount: number,
  silverCount: number,
  tolerancePct: number,
): { ok: boolean; deltaPct: number } {
  const base = Math.max(liveCount, 1)
  const deltaPct = Math.abs(liveCount - silverCount) / base * 100
  return {
    deltaPct: Math.round(deltaPct * 1000) / 1000,
    ok: deltaPct <= tolerancePct || (liveCount === 0 && silverCount === 0),
  }
}

describe('IFS silver reconcile tolerance', () => {
  it('passes when counts match within 0.1%', () => {
    expect(compareCounts(1000, 1000, 0.1).ok).toBe(true)
    expect(compareCounts(1000, 999, 0.1).ok).toBe(true)
  })

  it('fails when drift exceeds tolerance', () => {
    expect(compareCounts(1000, 990, 0.1).ok).toBe(false)
  })
})
