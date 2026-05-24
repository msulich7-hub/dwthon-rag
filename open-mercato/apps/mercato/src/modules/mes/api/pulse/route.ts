import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { maybeNotifyAndonCritical } from '../../lib/andon-notify'
import { buildPulseSnapshot } from '../../lib/pulse-snapshot'
import { resolveMesRequestContext } from '../../lib/request-context'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['mes.view'] },
}

export const openApi = {
  GET: { summary: 'MES pulse board snapshot (Andon + queue KPIs)', tags: ['mes'] },
}

export async function GET(request: Request) {
  try {
    const { em, tenantId, organizationId } = await resolveMesRequestContext(request)
    const scope = { tenantId, organizationId }
    const pulse = await buildPulseSnapshot(em, scope)
    const notified = await maybeNotifyAndonCritical(em, scope, {
      andon: pulse.andon,
      escalationLevel: pulse.escalationLevel,
      alerts: pulse.alerts,
    })
    return NextResponse.json({ pulse, notified })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
