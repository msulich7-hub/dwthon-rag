import { createHmac, timingSafeEqual } from 'node:crypto'
import { CrudHttpError } from '@open-mercato/shared/lib/crud/errors'

export function isWebhookSecurityStrict(): boolean {
  if (process.env.CRM_2027_WEBHOOK_ALLOW_INSECURE === 'true') return false
  return process.env.NODE_ENV === 'production'
}

export function assertWebhookSecretsConfigured(): void {
  if (!isWebhookSecurityStrict()) return
  const generic = process.env.CRM_2027_WEBHOOK_SECRET?.trim()
  const zoom = process.env.CRM_2027_ZOOM_WEBHOOK_SECRET?.trim()
  if (!generic && !zoom) {
    throw new CrudHttpError(503, { error: 'CRM_2027 webhook secrets are not configured' })
  }
}

function readBearerSecret(request: Request): string {
  return (
    request.headers.get('x-crm-2027-webhook-secret') ??
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
    ''
  )
}

export function verifyCrm2027WebhookSecret(request: Request): boolean {
  assertWebhookSecretsConfigured()

  const expected = process.env.CRM_2027_WEBHOOK_SECRET?.trim()
  if (!expected) {
    return !isWebhookSecurityStrict()
  }

  const header = readBearerSecret(request)
  if (!header || header.length !== expected.length) return false
  try {
    return timingSafeEqual(Buffer.from(header), Buffer.from(expected))
  } catch {
    return false
  }
}

export function verifyCrm2027WebhookApiKey(request: Request): boolean {
  const expected = process.env.CRM_2027_WEBHOOK_API_KEY?.trim()
  if (!expected) return true

  const header = request.headers.get('x-crm-2027-api-key') ?? ''
  if (!header || header.length !== expected.length) return false
  try {
    return timingSafeEqual(Buffer.from(header), Buffer.from(expected))
  } catch {
    return false
  }
}

export function verifyInboundWebhookAuth(request: Request): boolean {
  if (!verifyCrm2027WebhookApiKey(request)) return false
  return verifyCrm2027WebhookSecret(request)
}

export function verifyZoomSignature(request: Request, rawBody: string): boolean {
  assertWebhookSecretsConfigured()

  const secret = process.env.CRM_2027_ZOOM_WEBHOOK_SECRET?.trim()
  if (!secret) {
    return verifyCrm2027WebhookSecret(request)
  }

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
