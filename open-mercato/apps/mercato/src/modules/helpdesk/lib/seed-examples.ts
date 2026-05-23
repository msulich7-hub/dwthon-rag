import type { EntityManager } from '@mikro-orm/postgresql'
import { HelpdeskTicket } from '../data/entities'
import { createTicket } from './tickets'

export async function seedHelpdeskExamples(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
): Promise<void> {
  const count = await em.count(HelpdeskTicket, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })
  if (count > 0) return

  await createTicket(
    em,
    scope,
    {
      subject: 'Demo: VPN connection fails after password change',
      body: 'Staff member cannot connect to corporate VPN since yesterday. Error: authentication failed.',
      source: 'manual',
      teamQueue: 'it',
      priority: 'high',
    },
    { visibility: 'internal', requesterType: 'staff' },
  )

  await createTicket(
    em,
    scope,
    {
      subject: 'Demo: Invoice PDF download error',
      body: 'Customer reports 500 error when downloading invoice from the portal.',
      source: 'email',
      teamQueue: 'billing',
      priority: 'medium',
      reporterEmail: 'demo.customer@example.com',
      reporterName: 'Demo Customer',
      visibility: 'customer',
      requesterType: 'customer',
    },
    { visibility: 'customer', requesterType: 'customer' },
  )

  await createTicket(
    em,
    scope,
    {
      subject: 'Demo: Request new laptop for new hire',
      body: 'Operations needs a standard laptop bundle for employee starting next Monday.',
      source: 'manual',
      teamQueue: 'ops',
      priority: 'low',
    },
    { visibility: 'internal', requesterType: 'staff', initialStatus: 'in_progress' },
  )
}
