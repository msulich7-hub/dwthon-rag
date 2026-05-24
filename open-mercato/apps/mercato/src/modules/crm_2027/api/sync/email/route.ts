import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { emailSyncBodySchema } from '../../../data/validators'
import { syncEmailInteractions } from '../../../lib/email-sync'
import { resolveCrm2027RequestContext } from '../../../lib/request-context'
import { CRM_2027_EMAIL_SYNC_QUEUE, getCrm2027Queue } from '../../../lib/queue'
import {
  completeCrm2027MutationGuard,
  runCrm2027MutationGuard,
} from '../../../lib/crm-mutation-guard'

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

    const guard = await runCrm2027MutationGuard(request, {
      tenantId: ctx.tenantId,
      organizationId: ctx.organizationId,
      auth: ctx.commandContext.auth,
    })
    if (!guard.ok) {
      return NextResponse.json(guard.body, { status: guard.status })
    }

    const json = await request.json().catch(() => ({}))
    const body = emailSyncBodySchema
      .extend({ mode: z.enum(['sync', 'async']).optional() })
      .parse(json)

    if (body.mode === 'async') {
      const queue = getCrm2027Queue(CRM_2027_EMAIL_SYNC_QUEUE)
      await queue.add('sync', {
        tenantId: ctx.tenantId,
        organizationId: ctx.organizationId,
        days: body.days,
        limit: body.limit,
      })
      await completeCrm2027MutationGuard(request, {
        tenantId: ctx.tenantId,
        organizationId: ctx.organizationId,
        auth: ctx.commandContext.auth,
      })
      return NextResponse.json({ ok: true, mode: 'async', queue: CRM_2027_EMAIL_SYNC_QUEUE })
    }

    const result = await syncEmailInteractions(
      ctx.em,
      ctx.container,
      { tenantId: ctx.tenantId, organizationId: ctx.organizationId },
      body,
    )

    await completeCrm2027MutationGuard(request, {
      tenantId: ctx.tenantId,
      organizationId: ctx.organizationId,
      auth: ctx.commandContext.auth,
    })

    return NextResponse.json({ ok: true, mode: 'sync', ...result })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
