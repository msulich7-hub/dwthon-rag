import { createHmac, timingSafeEqual } from 'node:crypto'
import { CrudHttpError } from '@open-mercato/shared/lib/crud/errors'

function readEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key]?.trim()
    if (value) return value
  }
  return undefined
}

export function isWebhookSecurityStrict(): boolean {
  if (
    process.env.CALL_TRANSCRIPTS_WEBHOOK_ALLOW_INSECURE === 'true' ||
    process.env.CRM_2027_WEBHOOK_ALLOW_INSECURE === 'true'
  ) {
    return false
  }
  return process.env.NODE_ENV === 'production'
}

export function assertWebhookSecretsConfigured(): void {
  if (!isWebhookSecurityStrict()) return
  const generic = readEnv('CALL_TRANSCRIPTS_WEBHOOK_SECRET', 'CRM_2027_WEBHOOK_SECRET')
  const zoom = readEnv('CALL_TRANSCRIPTS_ZOOM_WEBHOOK_SECRET', 'CRM_2027_ZOOM_WEBHOOK_SECRET')
  if (!generic && !zoom) {
    throw new CrudHttpError(503, { error: 'Call transcript webhook secrets are not configured' })
  }
}

function readBearerSecret(request: Request): string {
  return (
    request.headers.get('x-call-transcripts-webhook-secret') ??
    request.headers.get('x-crm-2027-webhook-secret') ??
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
    ''
  )
}

export function verifyWebhookSecret(request: Request): boolean {
  assertWebhookSecretsConfigured()

  const expected = readEnv('CALL_TRANSCRIPTS_WEBHOOK_SECRET', 'CRM_2027_WEBHOOK_SECRET')
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

export function verifyWebhookApiKey(request: Request): boolean {
  const expected = readEnv('CALL_TRANSCRIPTS_WEBHOOK_API_KEY', 'CRM_2027_WEBHOOK_API_KEY')
  if (!expected) return true

  const header =
    request.headers.get('x-call-transcripts-api-key') ??
    request.headers.get('x-crm-2027-api-key') ??
    ''
  if (!header || header.length !== expected.length) return false
  try {
    return timingSafeEqual(Buffer.from(header), Buffer.from(expected))
  } catch {
    return false
  }
}

export function verifyInboundWebhookAuth(request: Request): boolean {
  if (!verifyWebhookApiKey(request)) return false
  return verifyWebhookSecret(request)
}

export function verifyZoomSignature(request: Request, rawBody: string): boolean {
  assertWebhookSecretsConfigured()

  const secret = readEnv('CALL_TRANSCRIPTS_ZOOM_WEBHOOK_SECRET', 'CRM_2027_ZOOM_WEBHOOK_SECRET')
  if (!secret) {
    return verifyWebhookSecret(request)
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
