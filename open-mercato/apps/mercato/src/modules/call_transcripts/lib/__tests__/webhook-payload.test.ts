import { parseProviderWebhookPayload, webhookPayloadToTranscript } from '../webhook-payload'

describe('call_transcripts webhook-payload', () => {
  it('parses flat zoom-style payload with custom dealId', () => {
    const payload = parseProviderWebhookPayload(
      {
        tenantId: '00000000-0000-4000-8000-000000000001',
        organizationId: '00000000-0000-4000-8000-000000000002',
        transcript: 'Hello from the call',
        custom_fields: { dealId: '00000000-0000-4000-8000-000000000099' },
        externalId: 'rec-1',
      },
      'zoom',
    )

    expect(payload.transcript).toBe('Hello from the call')
    expect(payload.dealId).toBe('00000000-0000-4000-8000-000000000099')

    const transcript = webhookPayloadToTranscript(payload, 'zoom')
    expect(transcript.dealId).toBe('00000000-0000-4000-8000-000000000099')
    expect(transcript.externalRecordingId).toBe('rec-1')
  })

  it('throws when transcript is missing', () => {
    expect(() => parseProviderWebhookPayload({ tenantId: 'x' }, 'gong')).toThrow(
      'WEBHOOK_PAYLOAD_UNMAPPED',
    )
  })
})
