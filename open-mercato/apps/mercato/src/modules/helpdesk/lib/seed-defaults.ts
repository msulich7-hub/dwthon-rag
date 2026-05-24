import type { EntityManager } from '@mikro-orm/postgresql'
import { ensureDefaultCannedResponses } from './canned-responses'
import { createKbArticle, listKbArticles } from './kb'

const DEFAULT_KB: Array<{ title: string; body: string; category: string }> = [
  {
    title: 'Reset your password',
    category: 'access',
    body: 'Use the self-service portal link from your welcome email. If locked out, contact support with your work email.',
  },
  {
    title: 'VPN troubleshooting',
    category: 'it',
    body: '1. Check internet connectivity.\n2. Restart the VPN client.\n3. Try another network.\n4. If still failing, open a ticket with error codes.',
  },
  {
    title: 'Invoice and billing FAQ',
    category: 'billing',
    body: 'Invoices are issued on the 1st of each month. Payment terms are Net 30 unless your contract states otherwise.',
  },
]

export async function seedHelpdeskDefaults(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
): Promise<void> {
  await ensureDefaultCannedResponses(em, scope)

  const existing = await listKbArticles(em, scope, 1)
  if (existing.length > 0) return

  for (const article of DEFAULT_KB) {
    await createKbArticle(em, scope, {
      title: article.title,
      body: article.body,
      category: article.category,
      visibility: 'internal',
    })
  }
}
