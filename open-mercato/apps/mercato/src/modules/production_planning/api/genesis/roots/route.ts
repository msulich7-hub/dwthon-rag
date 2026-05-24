import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { listGenesisRoots } from '../../../lib/mrp/genesis-service'
import { resolveProductionPlanningRequestContext } from '../../../lib/request-context'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['production_planning.view'] },
}

export const openApi = {
  GET: { summary: 'List genesis demand roots', tags: ['production_planning'] },
}

export async function GET(request: Request) {
  try {
    const { tenantId, organizationId, em } = await resolveProductionPlanningRequestContext(request)
    const url = new URL(request.url)
    const limit = Number.parseInt(url.searchParams.get('limit') ?? '50', 10)
    const status = url.searchParams.get('status') ?? undefined

    const roots = await listGenesisRoots(
      em,
      { tenantId, organizationId },
      { limit: Number.isFinite(limit) ? limit : 50, status },
    )

    return NextResponse.json({ roots })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
