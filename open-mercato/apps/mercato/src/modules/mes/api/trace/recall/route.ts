import { NextResponse } from 'next/server'
import { CrudHttpError, isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { recallSearchQuerySchema } from '../../../data/validators'
import { searchRecallByLotNumber } from '../../../lib/recall-search'
import { resolveMesRequestContext } from '../../../lib/request-context'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['mes.recall'] },
}

export const openApi = {
  GET: { summary: 'Recall search by lot number', tags: ['mes'] },
}

export async function GET(request: Request) {
  try {
    const { em, tenantId, organizationId } = await resolveMesRequestContext(request)
    const url = new URL(request.url)
    const query = recallSearchQuerySchema.parse({
      lotNumber: url.searchParams.get('lotNumber') ?? undefined,
    })

    const result = await searchRecallByLotNumber(em, { tenantId, organizationId }, query.lotNumber)
    if (!result) {
      throw new CrudHttpError(404, { error: 'Lot not found' })
    }

    return NextResponse.json({ recall: result })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
