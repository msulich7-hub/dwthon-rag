import type { EntityManager } from '@mikro-orm/postgresql'
import { HelpdeskCannedResponse } from '../data/entities'

export type CannedResponseItem = {
  id: string
  title: string
  shortcut: string | null
  body: string
  category: string | null
  isInternal: boolean
}

const DEFAULT_CANNED: Array<Omit<CannedResponseItem, 'id'>> = [
  {
    title: 'Acknowledge receipt',
    shortcut: '/ack',
    body: 'Thank you for your request. We have logged ticket {{ticketKey}} and will respond within our SLA window.',
    category: 'general',
    isInternal: false,
  },
  {
    title: 'Need more information',
    shortcut: '/info',
    body: 'To proceed, please share screenshots, error messages, and the steps to reproduce the issue.',
    category: 'general',
    isInternal: false,
  },
  {
    title: 'Resolved — please confirm',
    shortcut: '/resolved',
    body: 'We believe this issue is resolved. Please confirm within 48h or reply to reopen the ticket.',
    category: 'general',
    isInternal: false,
  },
  {
    title: 'Internal — escalate to L2',
    shortcut: '/escalate',
    body: 'Escalating to L2. Initial triage complete; see internal notes for diagnostics.',
    category: 'internal',
    isInternal: true,
  },
]

export async function ensureDefaultCannedResponses(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
): Promise<void> {
  const count = await em.count(HelpdeskCannedResponse, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })
  if (count > 0) return

  for (const item of DEFAULT_CANNED) {
    em.persist(
      em.create(HelpdeskCannedResponse, {
        tenantId: scope.tenantId,
        organizationId: scope.organizationId,
        title: item.title,
        shortcut: item.shortcut,
        body: item.body,
        category: item.category,
        isInternal: item.isInternal,
      }),
    )
  }
  await em.flush()
}

export async function listCannedResponses(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
): Promise<CannedResponseItem[]> {
  await ensureDefaultCannedResponses(em, scope)
  const rows = await em.find(
    HelpdeskCannedResponse,
    { tenantId: scope.tenantId, organizationId: scope.organizationId },
    { orderBy: { category: 'ASC', title: 'ASC' } },
  )
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    shortcut: r.shortcut ?? null,
    body: r.body,
    category: r.category ?? null,
    isInternal: r.isInternal,
  }))
}

