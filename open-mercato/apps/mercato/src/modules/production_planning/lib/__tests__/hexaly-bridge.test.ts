import { isHexalyBridgeConfigured, requestHexalyOptimization } from '../hexaly-bridge'

describe('hexaly-bridge', () => {
  const originalUrl = process.env.HEXALY_BRIDGE_URL

  afterEach(() => {
    if (originalUrl === undefined) delete process.env.HEXALY_BRIDGE_URL
    else process.env.HEXALY_BRIDGE_URL = originalUrl
  })

  it('reports unconfigured when HEXALY_BRIDGE_URL is missing', () => {
    delete process.env.HEXALY_BRIDGE_URL
    expect(isHexalyBridgeConfigured()).toBe(false)
  })

  it('returns local fallback when bridge URL is not set', async () => {
    delete process.env.HEXALY_BRIDGE_URL
    const result = await requestHexalyOptimization({
      tenantId: 't1',
      organizationId: 'o1',
      productionOrderIds: ['order-1'],
    })
    expect(result.status).toBe('completed')
    expect(result.message).toMatch(/not configured/i)
  })
})
