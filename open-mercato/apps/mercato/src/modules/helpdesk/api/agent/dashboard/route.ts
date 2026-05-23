import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { listTickets } from '../../../lib/tickets'
import { computeWorkspaceStats } from '../../../lib/workspace-stats'
import { countAgentQueues } from '../../../lib/queues'
import { resolveHelpdeskRequestContext } from '../../../lib/request-context'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['helpdesk.agent', 'helpdesk.view', 'helpdesk.submit'] },
}

export const openApi = {
  GET: { summary: 'Service desk KPIs for hub and dashboard widget', tags: ['helpdesk'] },
}

export async function GET(request: Request) {
  try {
    const { tenantId, organizationId, em, userId } = await resolveHelpdeskRequestContext(request)
    const tickets = await listTickets(em, { tenantId, organizationId }, { limit: 500 })
    const stats = computeWorkspaceStats(tickets)
    const queueCounts = await countAgentQueues(em, { tenantId, organizationId }, userId)

    const recent = tickets
      .filter((t) => t.status !== 'closed')
      .slice(0, 8)
      .map((t) => ({
        id: t.id,
        ticketKey: t.ticketKey,
        subject: t.subject,
        status: t.status,
        priority: t.priority,
        visibility: t.visibility,
      }))

    return NextResponse.json({
      stats,
      queueCounts,
      recent,
    })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
