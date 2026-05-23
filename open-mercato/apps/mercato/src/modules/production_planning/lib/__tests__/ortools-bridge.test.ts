import { isOrtoolsBridgeConfigured, requestOrtoolsOptimization } from '../ortools-bridge'

describe('ortools-bridge', () => {
  const originalUrl = process.env.ORTOOLS_BRIDGE_URL

  afterEach(() => {
    if (originalUrl === undefined) delete process.env.ORTOOLS_BRIDGE_URL
    else process.env.ORTOOLS_BRIDGE_URL = originalUrl
  })

  it('reports unconfigured when ORTOOLS_BRIDGE_URL is missing', () => {
    delete process.env.ORTOOLS_BRIDGE_URL
    expect(isOrtoolsBridgeConfigured()).toBe(false)
  })

  it('returns local fallback when bridge URL is not set', async () => {
    delete process.env.ORTOOLS_BRIDGE_URL
    const result = await requestOrtoolsOptimization({
      tenantId: 't1',
      organizationId: 'o1',
      orders: [],
      horizonHours: 168,
      objective: 'minimize_lateness',
      planningStartAt: new Date().toISOString(),
    })
    expect(result.status).toBe('completed')
    expect(result.message).toMatch(/not configured/i)
  })
})
