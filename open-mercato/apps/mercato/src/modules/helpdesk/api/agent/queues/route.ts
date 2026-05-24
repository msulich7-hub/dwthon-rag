import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { AGENT_QUEUES, countAgentQueues } from '../../../lib/queues'
import { resolveHelpdeskRequestContext } from '../../../lib/request-context'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['helpdesk.agent', 'helpdesk.view'] },
}

export const openApi = {
  GET: {
    summary: 'Agent workspace queue definitions and open ticket counts',
    tags: ['helpdesk'],
  },
}

export async function GET(request: Request) {
  try {
    const { tenantId, organizationId, em, userId } = await resolveHelpdeskRequestContext(request)
    const counts = await countAgentQueues(em, { tenantId, organizationId }, userId)

    return NextResponse.json({
      queues: AGENT_QUEUES.map((q) => ({
        id: q.id,
        labelKey: q.labelKey,
        descriptionKey: q.descriptionKey,
        count: counts[q.id],
      })),
    })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
