import { verifyCrm2027WebhookSecret, verifyInboundWebhookAuth } from '../webhook-verify'

describe('webhook-verify', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv, NODE_ENV: 'test', CRM_2027_WEBHOOK_ALLOW_INSECURE: 'true' }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('rejects wrong secret when configured', () => {
    process.env.CRM_2027_WEBHOOK_ALLOW_INSECURE = 'false'
    process.env.NODE_ENV = 'production'
    process.env.CRM_2027_WEBHOOK_SECRET = 'top-secret'
    const request = new Request('http://localhost', {
      headers: { 'x-crm-2027-webhook-secret': 'wrong' },
    })
    expect(verifyCrm2027WebhookSecret(request)).toBe(false)
  })

  it('accepts matching secret and api key', () => {
    process.env.CRM_2027_WEBHOOK_ALLOW_INSECURE = 'false'
    process.env.NODE_ENV = 'production'
    process.env.CRM_2027_WEBHOOK_SECRET = 'top-secret'
    process.env.CRM_2027_WEBHOOK_API_KEY = 'api-key-1'
    const request = new Request('http://localhost', {
      headers: {
        'x-crm-2027-webhook-secret': 'top-secret',
        'x-crm-2027-api-key': 'api-key-1',
      },
    })
    expect(verifyInboundWebhookAuth(request)).toBe(true)
  })
})
