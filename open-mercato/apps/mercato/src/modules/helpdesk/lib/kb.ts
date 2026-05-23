import type { EntityManager } from '@mikro-orm/postgresql'
import { HelpdeskKbArticle } from '../data/entities'
import { getTicketDetail } from './tickets'

export type KbArticleItem = {
  id: string
  title: string
  slug: string
  body: string
  category: string | null
  visibility: string
  sourceTicketId: string | null
  createdAt: string
}

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
  return base || `article-${Date.now()}`
}

async function uniqueSlug(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
  title: string,
): Promise<string> {
  let slug = slugify(title)
  let n = 0
  while (
    await em.findOne(HelpdeskKbArticle, {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      slug,
    })
  ) {
    n += 1
    slug = `${slugify(title)}-${n}`
  }
  return slug
}

function mapArticle(row: HelpdeskKbArticle): KbArticleItem {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    body: row.body,
    category: row.category ?? null,
    visibility: row.visibility,
    sourceTicketId: row.sourceTicketId ?? null,
    createdAt: row.createdAt.toISOString(),
  }
}

export async function listKbArticles(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
  limit = 100,
): Promise<KbArticleItem[]> {
  const rows = await em.find(
    HelpdeskKbArticle,
    { tenantId: scope.tenantId, organizationId: scope.organizationId },
    { orderBy: { updatedAt: 'DESC' }, limit },
  )
  return rows.map(mapArticle)
}

export async function searchKbArticles(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
  query: string,
  limit = 10,
): Promise<KbArticleItem[]> {
  const q = query.trim().toLowerCase()
  if (!q) return listKbArticles(em, scope, limit)

  const rows = await em.find(
    HelpdeskKbArticle,
    { tenantId: scope.tenantId, organizationId: scope.organizationId },
    { orderBy: { updatedAt: 'DESC' }, limit: 200 },
  )

  return rows
    .filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.body.toLowerCase().includes(q) ||
        (r.category?.toLowerCase().includes(q) ?? false),
    )
    .slice(0, limit)
    .map(mapArticle)
}

export async function createKbArticle(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
  input: { title: string; body: string; category?: string; visibility?: string; sourceTicketId?: string },
): Promise<KbArticleItem> {
  const slug = await uniqueSlug(em, scope, input.title)
  const row = em.create(HelpdeskKbArticle, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    title: input.title.trim(),
    slug,
    body: input.body.trim(),
    category: input.category ?? null,
    visibility: input.visibility ?? 'internal',
    sourceTicketId: input.sourceTicketId ?? null,
  })
  em.persist(row)
  await em.flush()
  return mapArticle(row)
}

export async function createKbFromTicket(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
  ticketId: string,
): Promise<KbArticleItem | null> {
  const ticket = await getTicketDetail(em, scope, ticketId)
  if (!ticket) return null

  const resolutionParts = ticket.comments
    .filter((c) => !c.isInternal)
    .map((c) => c.body)
  const body = [
    `## Problem`,
    ticket.description,
    `## Resolution`,
    resolutionParts.length ? resolutionParts.join('\n\n') : '_No public replies yet._',
    `## Metadata`,
    `- Ticket: ${ticket.ticketKey}`,
    `- Category: ${ticket.category ?? 'general'}`,
    `- Queue: ${ticket.teamQueue}`,
  ].join('\n\n')

  return createKbArticle(em, scope, {
    title: `KB: ${ticket.subject}`,
    body,
    category: ticket.category ?? 'general',
    visibility: 'internal',
    sourceTicketId: ticketId,
  })
}
