import type { CpsatObjective, CpsatObjectiveWeights } from './ortools-bridge'

export type { CpsatObjectiveWeights }

export function normalizeObjectiveWeights(
  raw: Record<string, number> | CpsatObjectiveWeights | null | undefined,
): CpsatObjectiveWeights | undefined {
  if (!raw) return undefined
  const tardinessWeight = Number(raw.tardinessWeight ?? 1)
  const changeoverWeight = Number(raw.changeoverWeight ?? 0)
  const wipWeight = Number(raw.wipWeight ?? 0)
  if (![tardinessWeight, changeoverWeight, wipWeight].every((n) => Number.isFinite(n) && n >= 0 && n <= 1)) {
    return undefined
  }
  if (tardinessWeight + changeoverWeight + wipWeight === 0) {
    return { tardinessWeight: 1, changeoverWeight: 0, wipWeight: 0 }
  }
  return { tardinessWeight, changeoverWeight, wipWeight }
}

export function objectiveWeightsForSolve(
  objective: CpsatObjective,
  weights: CpsatObjectiveWeights | undefined,
): CpsatObjectiveWeights | undefined {
  if (weights) return weights
  if (objective === 'minimize_changeover') {
    return { tardinessWeight: 0.2, changeoverWeight: 0.7, wipWeight: 0.1 }
  }
  if (objective === 'balance_load') {
    return { tardinessWeight: 0.3, changeoverWeight: 0.1, wipWeight: 0.6 }
  }
  return undefined
}
