import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { completeChecklistRunBodySchema } from '../../../../../data/validators'
import { completeChecklistRun } from '../../../../../lib/checklist-runs'
import { resolveMesRequestContext } from '../../../../../lib/request-context'

export const metadata = {
  POST: { requireAuth: true, requireFeatures: ['mes.quality.manage'] },
}

export const openApi = {
  POST: { summary: 'Complete a checklist run with answers', tags: ['mes'] },
}

export async function POST(
  request: Request,
  ctx: { params: { runId: string } },
) {
  try {
    const { em, tenantId, organizationId } = await resolveMesRequestContext(request)
    const runId = ctx.params?.runId?.trim()
    if (!runId) {
      return NextResponse.json({ error: 'Missing run id' }, { status: 400 })
    }
    const json = await request.json().catch(() => null)
    const body = completeChecklistRunBodySchema.parse(json)
    const run = await completeChecklistRun(em, { tenantId, organizationId }, runId, body)
    return NextResponse.json({ run })
  } catch (error) {
    if (error instanceof Error) {
      const statusByCode: Record<string, number> = {
        CHECKLIST_RUN_NOT_FOUND: 404,
        CHECKLIST_RUN_NOT_IN_PROGRESS: 409,
        INVALID_CHECKLIST_ITEM: 400,
      }
      const status = statusByCode[error.message]
      if (status) {
        return NextResponse.json({ error: error.message }, { status })
      }
    }
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
