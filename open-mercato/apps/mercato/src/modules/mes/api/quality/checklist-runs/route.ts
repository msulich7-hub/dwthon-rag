import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { startChecklistRunBodySchema } from '../../../data/validators'
import { startChecklistRun } from '../../../lib/checklist-runs'
import { resolveMesRequestContext } from '../../../lib/request-context'

export const metadata = {
  POST: { requireAuth: true, requireFeatures: ['mes.quality.manage'] },
}

export const openApi = {
  POST: { summary: 'Start a checklist run', tags: ['mes'] },
}

export async function POST(request: Request) {
  try {
    const { em, tenantId, organizationId } = await resolveMesRequestContext(request)
    const json = await request.json().catch(() => null)
    const body = startChecklistRunBodySchema.parse(json)
    const run = await startChecklistRun(em, { tenantId, organizationId }, body)
    return NextResponse.json({ run }, { status: 201 })
  } catch (error) {
    if (error instanceof Error) {
      const statusByCode: Record<string, number> = {
        CHECKLIST_TEMPLATE_NOT_FOUND: 404,
        WORK_ORDER_NOT_FOUND: 404,
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
