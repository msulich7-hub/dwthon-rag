import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import type { CommandBus } from '@open-mercato/shared/lib/commands'
import { formatACompleteSchema } from '../../../../data/validators'
import { resolveTransportRequestContext } from '../../../../lib/request-context'

export const metadata = {
  POST: { requireAuth: true, requireFeatures: ['transport_dispatch.format_a'] },
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params
    const ctx = await resolveTransportRequestContext(request)
    const body = formatACompleteSchema.parse(await request.json())
    const container = await createRequestContainer()
    const commandBus = container.resolve('commandBus') as CommandBus
    const { result } = await commandBus.execute('transport_dispatch.format_a.complete', {
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
