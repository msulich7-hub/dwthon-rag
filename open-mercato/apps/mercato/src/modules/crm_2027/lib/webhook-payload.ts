import { providerMeetingWebhookSchema, type IngestDealMeetingBody } from '../data/validators'
import type { ProviderWebhookPayload } from './webhook-meeting-ingest'

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

function readCustomFields(source: unknown): Record<string, string> {
  if (!source || typeof source !== 'object') return {}
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(source as Record<string, unknown>)) {
    if (typeof value === 'string' && value.trim()) {
      out[key] = value.trim()
    }
  }
  return out
}

function mergeCustom(...sources: unknown[]): Record<string, string> {
  return sources.reduce<Record<string, string>>((acc, src) => ({ ...acc, ...readCustomFields(src) }), {})
}

export function parseProviderWebhookPayload(
  json: unknown,
  provider: 'zoom' | 'gong',
): ProviderWebhookPayload {
  const direct = providerMeetingWebhookSchema.safeParse(json)
  if (direct.success) {
    return direct.data
  }

  const root = json && typeof json === 'object' ? (json as Record<string, unknown>) : {}
  const payload =
    root.payload && typeof root.payload === 'object' ? (root.payload as Record<string, unknown>) : {}
  const object =
    payload.object && typeof payload.object === 'object'
      ? (payload.object as Record<string, unknown>)
      : {}
  const call =
    payload.call && typeof payload.call === 'object' ? (payload.call as Record<string, unknown>) : {}

  const custom = mergeCustom(
    root.custom_fields,
    root.tracking_fields,
    payload.custom_fields,
    object.custom_fields,
    object.tracking_fields,
    call.custom_fields,
  )

  const dealId =
    readString(root.dealId) ??
    readString(custom.dealId) ??
    readString(custom.deal_id) ??
    readString(payload.dealId)

  const tenantId =
    readString(root.tenantId) ?? readString(custom.tenantId) ?? readString(custom.tenant_id)

  const organizationId =
    readString(root.organizationId) ??
    readString(custom.organizationId) ??
    readString(custom.organization_id)

  const transcript =
    readString(root.transcript) ??
    readString(payload.transcript) ??
    readString(object.transcript) ??
    readString(call.transcript) ??
    readString(payload.transcript_content) ??
    readString(object.transcript_download)

  if (!dealId || !transcript) {
    throw new Error('WEBHOOK_PAYLOAD_UNMAPPED')
  }

  const title =
    readString(root.title) ??
    readString(object.topic) ??
    readString(call.title) ??
    readString(payload.title) ??
    `${provider} meeting`

  const externalId =
    readString(root.externalId) ??
    readString(object.uuid) ??
    readString(object.id) ??
    readString(call.id) ??
    readString(payload.recording_id)

  const occurredAt = readString(root.occurredAt) ?? readString(payload.occurred_at)

  return {
    dealId,
    transcript,
    title,
    externalId,
    occurredAt,
    tenantId,
    organizationId,
  }
}

export function toIngestBody(
  payload: ProviderWebhookPayload,
  source: 'zoom' | 'gong',
): IngestDealMeetingBody {
  return {
    transcript: payload.transcript,
    title: payload.title,
    source,
  }
}
