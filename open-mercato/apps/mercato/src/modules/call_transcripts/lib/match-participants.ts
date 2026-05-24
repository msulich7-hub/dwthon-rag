import type { EntityManager } from '@mikro-orm/postgresql'
import { CustomerEntity } from '@open-mercato/core/modules/customers/data/entities'
import type { ParticipantMatch, TranscriptParticipant } from './provider-types'

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export async function matchParticipants(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
  participants: TranscriptParticipant[],
): Promise<ParticipantMatch[]> {
  const emails = participants
    .map((p) => p.email?.trim())
    .filter((e): e is string => Boolean(e))
    .map(normalizeEmail)

  const entities =
    emails.length > 0
      ? await em.find(CustomerEntity, {
          tenantId: scope.tenantId,
          organizationId: scope.organizationId,
          kind: 'person',
          deletedAt: null,
          primaryEmail: { $in: emails },
        })
      : []

  const byEmail = new Map<string, CustomerEntity>()
  for (const entity of entities) {
    const email = entity.primaryEmail?.trim().toLowerCase()
    if (email) byEmail.set(email, entity)
  }

  return participants.map((participant) => {
    const email = participant.email?.trim()
    if (!email) {
      return {
        email: participant.email,
        phone: participant.phone,
        displayName: participant.displayName,
        role: participant.role,
        customerEntityId: null,
        matchedVia: null,
      }
    }

    const match = byEmail.get(normalizeEmail(email))
    return {
      email: participant.email,
      phone: participant.phone,
      displayName: participant.displayName,
      role: participant.role,
      customerEntityId: match?.id ?? null,
      matchedVia: match ? 'primary_email' : null,
    }
  })
}

export function pickPrimaryEntityId(
  matches: ParticipantMatch[],
  dealId?: string | null,
): string | null {
  const matched = matches.filter((m) => m.customerEntityId)
  if (matched.length === 0) return null
  if (dealId) {
    return matched[0]?.customerEntityId ?? null
  }
  return matched[0]?.customerEntityId ?? null
}
