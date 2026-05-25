import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { listFormatAQueue } from '../../../lib/queue'
import { resolveTransportRequestContext } from '../../../lib/request-context'
import { PACKAGE_TYPES, PALLET_TYPES } from '../../../lib/catalog'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['transport_dispatch.format_a'] },
}

export async function GET(request: Request) {
  try {
    const ctx = await resolveTransportRequestContext(request)
    const cards = await listFormatAQueue(ctx.em, {
      tenantId: ctx.tenantId,
      organizationId: ctx.organizationId,
    })
    return NextResponse.json({
      count: cards.length,
      cards,
      catalog: { packages: PACKAGE_TYPES, pallets: PALLET_TYPES },
    })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
