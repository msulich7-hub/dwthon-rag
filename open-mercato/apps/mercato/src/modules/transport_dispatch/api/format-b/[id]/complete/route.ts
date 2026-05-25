import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import type { CommandBus } from '@open-mercato/shared/lib/commands'
import { formatBCompleteSchema } from '../../../../data/validators'
import { resolveTransportRequestContext } from '../../../../lib/request-context'
import { loadConsignmentDetail } from '../../../../lib/queue'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['transport_dispatch.format_b'] },
  POST: { requireAuth: true, requireFeatures: ['transport_dispatch.format_b'] },
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params
    const ctx = await resolveTransportRequestContext(request)
    const detail = await loadConsignmentDetail(ctx.em, {
      tenantId: ctx.tenantId,
      organizationId: ctx.organizationId,
    }, id)
    if (!detail) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json(detail)
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params
    const ctx = await resolveTransportRequestContext(request)
    const body = formatBCompleteSchema.parse(await request.json())
    const container = await createRequestContainer()
    const commandBus = container.resolve('commandBus') as CommandBus
    const { result } = await commandBus.execute('transport_dispatch.format_b.complete', {
      tenantId: ctx.tenantId,
      organizationId: ctx.organizationId,
      consignmentId: id,
      input: body,
    })
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
