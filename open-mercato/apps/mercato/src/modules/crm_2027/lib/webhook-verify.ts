import { createHmac, timingSafeEqual } from 'node:crypto'

export function verifyCrm2027WebhookSecret(request: Request): boolean {
  const expected = process.env.CRM_2027_WEBHOOK_SECRET?.trim()
  if (!expected) return true

  const header =
    request.headers.get('x-crm-2027-webhook-secret') ??
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
    ''

  if (!header || header.length !== expected.length) return false
  try {
    return timingSafeEqual(Buffer.from(header), Buffer.from(expected))
  } catch {
    return false
  }
}

export function verifyZoomSignature(request: Request, rawBody: string): boolean {
  const secret = process.env.CRM_2027_ZOOM_WEBHOOK_SECRET?.trim()
  if (!secret) return verifyCrm2027WebhookSecret(request)

  const signature = request.headers.get('x-zm-signature') ?? ''
  const timestamp = request.headers.get('x-zm-request-timestamp') ?? ''
  if (!signature || !timestamp) return false

  const message = `v0:${timestamp}:${rawBody}`
  const hash = createHmac('sha256', secret).update(message).digest('hex')
  const expected = `v0=${hash}`
  if (expected.length !== signature.length) return false
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch {
    return false
  }
}
