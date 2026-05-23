/**
 * Hexaly has no official Node.js SDK — integrate via HTTP bridge (Python/Java microservice)
 * or Hexaly Cloud. This module never imports proprietary Hexaly binaries into Mercato.
 *
 * Env:
 * - HEXALY_BRIDGE_URL — e.g. https://hexaly-bridge.internal/optimize
 * - HEXALY_BRIDGE_API_KEY — optional bearer token
 * - HEXALY_BRIDGE_TIMEOUT_MS — default 120000
 */

export type HexalyOptimizeRequest = {
  tenantId: string
  organizationId: string
  productionOrderIds: string[]
  horizonHours?: number
  objective?: 'minimize_lateness' | 'minimize_changeover' | 'balance_load'
}

export type HexalyOptimizeResult = {
  jobId: string
  status: 'queued' | 'completed' | 'failed'
  schedule?: Array<{
    operationId: string
    workCenterCode: string
    plannedStartAt: string
    plannedEndAt: string
  }>
  message?: string
}

export function isHexalyBridgeConfigured(): boolean {
  return Boolean(process.env.HEXALY_BRIDGE_URL?.trim())
}

export async function requestHexalyOptimization(
  payload: HexalyOptimizeRequest,
): Promise<HexalyOptimizeResult> {
  const baseUrl = process.env.HEXALY_BRIDGE_URL?.trim()
  if (!baseUrl) {
    return {
      jobId: 'local-heuristic',
      status: 'completed',
      message:
        'Hexaly bridge not configured (HEXALY_BRIDGE_URL). Using in-app capacity snapshot only.',
    }
  }

  const timeoutMs = Number.parseInt(process.env.HEXALY_BRIDGE_TIMEOUT_MS ?? '120000', 10) || 120_000
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const apiKey = process.env.HEXALY_BRIDGE_API_KEY?.trim()
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      return {
        jobId: 'hexaly-error',
        status: 'failed',
        message: `Hexaly bridge HTTP ${response.status}: ${text.slice(0, 500)}`,
      }
    }

    const json = (await response.json()) as HexalyOptimizeResult
    return {
      jobId: json.jobId ?? 'hexaly',
      status: json.status ?? 'completed',
      schedule: json.schedule,
      message: json.message,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Hexaly bridge request failed'
    return { jobId: 'hexaly-error', status: 'failed', message }
  } finally {
    clearTimeout(timer)
  }
}
