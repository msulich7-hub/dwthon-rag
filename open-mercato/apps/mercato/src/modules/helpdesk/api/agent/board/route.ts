import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { helpdeskAgentQueueSchema } from '../../../data/validators'
import { KANBAN_COLUMNS, KANBAN_DONE_COLUMN, groupTicketsByStatus } from '../../../lib/status-board'
import { listTickets } from '../../../lib/tickets'
import { computeWorkspaceStats } from '../../../lib/workspace-stats'
import { resolveHelpdeskRequestContext } from '../../../lib/request-context'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['helpdesk.agent', 'helpdesk.view'] },
}

export const openApi = {
  GET: {
    summary: 'Kanban board payload grouped by status',
    tags: ['helpdesk'],
  },
}

export async function GET(request: Request) {
  try {
    const { tenantId, organizationId, em, userId } = await resolveHelpdeskRequestContext(request)
    const url = new URL(request.url)
    const queueRaw = url.searchParams.get('queue') ?? 'all'
    const search = url.searchParams.get('search') ?? undefined
    const includeClosed = url.searchParams.get('includeClosed') === 'true'
    const queue = helpdeskAgentQueueSchema.parse(queueRaw)

    const tickets = await listTickets(em, { tenantId, organizationId }, {
      queue,
      currentUserId: userId,
      limit: 500,
      search,
    })

    const filtered = includeClosed
      ? tickets
      : tickets.filter((t) => t.status !== 'closed')

    const grouped = groupTicketsByStatus(filtered, includeClosed)
    const columnDefs = includeClosed ? [...KANBAN_COLUMNS, KANBAN_DONE_COLUMN] : KANBAN_COLUMNS

    const columns = columnDefs.map((def) => ({
      status: def.status,
      labelKey: def.labelKey,
      accentClass: def.accentClass,
      tickets: grouped.get(def.status) ?? [],
    }))

    return NextResponse.json({
      queue,
      includeClosed,
      columns,
      stats: computeWorkspaceStats(tickets),
    })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
