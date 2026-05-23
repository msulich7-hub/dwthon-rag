import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import type { EntityManager } from '@mikro-orm/postgresql'
import { getPublicTicketView } from '../../../lib/portal-public'

const paramsSchema = z.object({
  token: z.string().uuid(),
})

export const metadata = {
  GET: { requireAuth: false },
}

export async function GET(_req: Request, ctx: { params: { token: string } }) {
  const { token } = paramsSchema.parse(ctx.params ?? {})
  const container = await createRequestContainer()
  const em = container.resolve<EntityManager>('em')

  const ticket = await getPublicTicketView(em, token)
  if (!ticket) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
  }

  return NextResponse.json({ ticket })
}
