import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { listFormatBQueue } from '../../../lib/queue'
import { resolveTransportRequestContext } from '../../../lib/request-context'
import { EXPEDITION_CODES, PACKAGE_TYPES, PALLET_TYPES } from '../../../lib/catalog'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['transport_dispatch.format_b'] },
}

export async function GET(request: Request) {
  try {
    const ctx = await resolveTransportRequestContext(request)
    const queue = await listFormatBQueue(ctx.em, {
      tenantId: ctx.tenantId,
      organizationId: ctx.organizationId,
    })
    return NextResponse.json({
      ...queue,
      catalog: {
        packages: PACKAGE_TYPES,
        pallets: PALLET_TYPES,
        expeditions: EXPEDITION_CODES,
      },
    })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
