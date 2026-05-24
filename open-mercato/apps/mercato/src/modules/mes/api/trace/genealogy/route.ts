import { NextResponse } from 'next/server'
import { CrudHttpError, isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { genealogyQuerySchema } from '../../../data/validators'
import { resolveGenealogyRoot, traceGenealogy } from '../../../lib/genealogy-trace'
import { resolveMesRequestContext } from '../../../lib/request-context'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['mes.trace.view'] },
}

export const openApi = {
  GET: { summary: 'Trace lot or serial genealogy', tags: ['mes'] },
}

export async function GET(request: Request) {
  try {
    const { em, tenantId, organizationId } = await resolveMesRequestContext(request)
    const url = new URL(request.url)
    const query = genealogyQuerySchema.parse({
      lotNumber: url.searchParams.get('lotNumber') ?? undefined,
      serialNumber: url.searchParams.get('serialNumber') ?? undefined,
      direction: url.searchParams.get('direction') ?? undefined,
      depth: url.searchParams.get('depth') ?? undefined,
    })

    const root = await resolveGenealogyRoot(
      em,
      { tenantId, organizationId },
      { lotNumber: query.lotNumber, serialNumber: query.serialNumber },
    )
    if (!root) {
      throw new CrudHttpError(404, { error: 'Trace root not found' })
    }

    const trace = await traceGenealogy(
      em,
      { tenantId, organizationId },
      root,
      { direction: query.direction, depth: query.depth },
    )

    return NextResponse.json({ genealogy: trace })
  } catch (error) {
    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json({ error: 'lotNumber or serialNumber required' }, { status: 400 })
    }
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
