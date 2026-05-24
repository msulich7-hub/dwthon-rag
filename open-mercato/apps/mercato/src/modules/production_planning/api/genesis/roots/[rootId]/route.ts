import { NextResponse } from 'next/server'
import { CrudHttpError, isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { getGenesisTree } from '../../../../lib/mrp/genesis-service'
import { resolveProductionPlanningRequestContext } from '../../../../lib/request-context'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['production_planning.view'] },
}

export async function GET(
  request: Request,
  context: { params: Promise<{ rootId: string }> },
) {
  try {
    const { rootId } = await context.params
    const { tenantId, organizationId, em } =
      await resolveProductionPlanningRequestContext(request)

    const tree = await getGenesisTree(em, { tenantId, organizationId }, rootId)
    if (!tree) {
      throw new CrudHttpError(404, { error: 'Genesis root not found' })
    }
    return NextResponse.json(tree)
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
