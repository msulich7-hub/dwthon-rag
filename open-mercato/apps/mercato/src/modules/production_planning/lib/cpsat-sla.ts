/** Class A interactive what-if SLA (market parity maj 2026). */
export const INTERACTIVE_SLA_MS = 60_000
export const INTERACTIVE_SLA_MAX_OPERATIONS = 500
export const INTERACTIVE_SLA_HORIZON_HOURS = 168

export type InteractiveSlaEvaluation = {
  withinSla: boolean
  wallMs: number
  operationCount: number
  targetMs: number
  maxOperations: number
  message: string | null
}

export function evaluateInteractiveSla(
  wallMs: number,
  operationCount: number,
  options?: { targetMs?: number; maxOperations?: number },
): InteractiveSlaEvaluation {
  const targetMs = options?.targetMs ?? INTERACTIVE_SLA_MS
  const maxOperations = options?.maxOperations ?? INTERACTIVE_SLA_MAX_OPERATIONS
  const applies = operationCount > 0 && operationCount <= maxOperations
  const withinSla = !applies || wallMs <= targetMs
  const message =
    applies && !withinSla
      ? `Interactive SLA exceeded: ${wallMs}ms > ${targetMs}ms for ${operationCount} operations`
      : null

  return {
    withinSla,
    wallMs,
    operationCount,
    targetMs,
    maxOperations,
    message,
  }
}
