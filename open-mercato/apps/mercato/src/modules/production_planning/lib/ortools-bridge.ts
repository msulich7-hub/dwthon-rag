/**
 * Google OR-Tools CP-SAT via Python microservice (open-mercato/services/ortools-scheduler).
 * No solver binaries in Node — Apache 2.0 stack end-to-end when self-hosted.
 *
 * Env:
 * - ORTOOLS_BRIDGE_URL — e.g. http://ortools-scheduler:8080/schedule
 * - ORTOOLS_BRIDGE_API_KEY — optional bearer token
 * - ORTOOLS_BRIDGE_TIMEOUT_MS — default 120000
 */

export type CpsatObjective = 'minimize_lateness' | 'minimize_changeover' | 'balance_load'

export type CpsatScheduleEntry = {
  operationId: string
  productionOrderId?: string
  workCenterCode: string
  plannedStartAt: string
  plannedEndAt: string
}

export type OrtoolsOptimizeResult = {
  jobId: string
  status: 'queued' | 'completed' | 'failed'
  schedule?: CpsatScheduleEntry[]
  message?: string | null
  solverStatus?: string | null
  objectiveValue?: number | null
}

/** Payload for POST /schedule — mirrors ortools-scheduler ScheduleRequest */
export type CpsatScheduleRequest = {
  tenantId: string
  organizationId: string
  productionOrderIds?: string[]
  orders: Array<{
    id: string
    code: string
    title: string
    salesOrderId: string | null
    productSku: string | null
    quantity: number
    status: string
    workCenterCode: string | null
    plannedStartAt: string | null
    plannedEndAt: string | null
    dueAt: string | null
    isLate: boolean
    operations: Array<{
      id: string
      productionOrderId: string
      sequenceNo: number
      name: string
      workCenterCode: string
      durationMinutes: number
      status: string
      plannedStartAt: string | null
      plannedEndAt: string | null
    }>
  }>
  horizonHours: number
  objective: CpsatObjective
  planningStartAt: string
}

export function isOrtoolsBridgeConfigured(): boolean {
  return Boolean(process.env.ORTOOLS_BRIDGE_URL?.trim())
}

function resolveBridgeUrl(): string | null {
  const raw = process.env.ORTOOLS_BRIDGE_URL?.trim()
  if (!raw) return null
  return raw.replace(/\/$/, '')
}

export async function requestOrtoolsOptimization(
  payload: CpsatScheduleRequest,
): Promise<OrtoolsOptimizeResult> {
  const bridgeUrl = resolveBridgeUrl()
  if (!bridgeUrl) {
    return {
      jobId: 'local-heuristic',
      status: 'completed',
      message:
        'CP-SAT bridge not configured (ORTOOLS_BRIDGE_URL). Using in-app capacity snapshot only.',
    }
  }

  const timeoutMs =
    Number.parseInt(process.env.ORTOOLS_BRIDGE_TIMEOUT_MS ?? '120000', 10) || 120_000
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const apiKey = process.env.ORTOOLS_BRIDGE_API_KEY?.trim()
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`

    const response = await fetch(bridgeUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    const json = (await response.json().catch(() => ({}))) as OrtoolsOptimizeResult & {
      detail?: unknown
    }

    if (!response.ok) {
      const detail =
        typeof json.message === 'string'
          ? json.message
          : JSON.stringify(json.detail ?? json).slice(0, 500)
      return {
        jobId: json.jobId ?? 'ortools-error',
        status: 'failed',
        message: `CP-SAT bridge HTTP ${response.status}: ${detail}`,
        solverStatus: json.solverStatus ?? null,
      }
    }

    return {
      jobId: json.jobId ?? 'ortools',
      status: json.status ?? 'completed',
      schedule: json.schedule?.map((row) => ({
        operationId: row.operationId,
        workCenterCode: row.workCenterCode,
        plannedStartAt: row.plannedStartAt,
        plannedEndAt: row.plannedEndAt,
      })),
      message: json.message ?? null,
      solverStatus: json.solverStatus ?? null,
      objectiveValue: json.objectiveValue ?? null,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'CP-SAT bridge request failed'
    return { jobId: 'ortools-error', status: 'failed', message }
  } finally {
    clearTimeout(timer)
  }
}
