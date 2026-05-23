import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import type { EntityManager } from '@mikro-orm/postgresql'
import { addCustomerPortalComment } from '../../../../lib/portal-public'

const paramsSchema = z.object({
  token: z.string().uuid(),
})

const bodySchema = z.object({
  body: z.string().min(1).max(10000),
  authorName: z.string().max(200).optional(),
})

export const metadata = {
  POST: { requireAuth: false },
}

export async function POST(request: Request, ctx: { params: { token: string } }) {
  const { token } = paramsSchema.parse(ctx.params ?? {})
  const json = await request.json().catch(() => null)
  const body = bodySchema.parse(json)

  const container = await createRequestContainer()
  const em = container.resolve<EntityManager>('em')

  const ticket = await addCustomerPortalComment(em, token, body.body, body.authorName)
  if (!ticket) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
  }

  return NextResponse.json({
    ticket: {
      ticketKey: ticket.ticketKey,
      status: ticket.status,
    },
  })
}
