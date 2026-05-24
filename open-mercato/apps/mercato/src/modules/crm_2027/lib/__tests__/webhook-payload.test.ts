import { parseProviderWebhookPayload } from '../webhook-payload'

describe('parseProviderWebhookPayload', () => {
  it('accepts flat CRM payload', () => {
    const payload = parseProviderWebhookPayload(
      {
        dealId: '11111111-1111-4111-8111-111111111111',
        transcript: 'Customer is unhappy with delivery delays.',
        tenantId: '22222222-2222-4222-8222-222222222222',
        organizationId: '33333333-3333-4333-8333-333333333333',
      },
      'zoom',
    )
    expect(payload.dealId).toContain('11111111')
    expect(payload.transcript).toContain('unhappy')
  })

  it('maps Zoom nested payload with custom fields', () => {
    const payload = parseProviderWebhookPayload(
      {
        event: 'recording.transcript_completed',
        payload: {
          object: {
            uuid: 'zoom-rec-1',
            topic: 'QBR call',
            custom_fields: {
              dealId: '11111111-1111-4111-8111-111111111111',
              tenantId: '22222222-2222-4222-8222-222222222222',
              organizationId: '33333333-3333-4333-8333-333333333333',
            },
            transcript: 'We need a discount or we walk.',
          },
        },
      },
      'zoom',
    )
    expect(payload.externalId).toBe('zoom-rec-1')
    expect(payload.title).toBe('QBR call')
    expect(payload.transcript).toContain('discount')
  })
})
