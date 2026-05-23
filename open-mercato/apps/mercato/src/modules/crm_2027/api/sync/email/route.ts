import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { emailSyncBodySchema } from '../../../data/validators'
import { syncEmailInteractions } from '../../../lib/email-sync'
import { resolveCrm2027RequestContext } from '../../../lib/request-context'

export const metadata = {
  POST: { requireAuth: true, requireFeatures: ['crm_2027.manage'] },
}

export const openApi = {
  POST: {
    summary: 'Scan recent email interactions and refresh CRM 2027 risk flags',
    tags: ['crm_2027'],
  },
}

export async function POST(request: Request) {
  try {
    const ctx = await resolveCrm2027RequestContext(request)
    const json = await request.json().catch(() => ({}))
    const body = emailSyncBodySchema.parse(json)

    const result = await syncEmailInteractions(
      ctx.em,
      ctx.container,
      { tenantId: ctx.tenantId, organizationId: ctx.organizationId },
      body,
    )

    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
