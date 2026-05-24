import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { resolveCrm2027RequestContext } from '../../lib/request-context'
import workflowsConfig from '../../workflows'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['crm_2027.view'] },
}

export const openApi = {
  GET: {
    summary: 'List CRM 2027 code-defined workflows (workflow builder recipes)',
    tags: ['crm_2027'],
  },
}

export async function GET(request: Request) {
  try {
    await resolveCrm2027RequestContext(request)

    const workflows = workflowsConfig.workflows.map((w) => ({
      workflowId: w.workflowId,
      workflowName: w.workflowName,
      description: w.description,
      enabled: w.enabled !== false,
      triggers: w.triggers?.map((t) => ({
        triggerId: t.triggerId,
        eventPattern: t.eventPattern,
        enabled: t.enabled,
      })),
    }))

    return NextResponse.json({ workflows, total: workflows.length })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
