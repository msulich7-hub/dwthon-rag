import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import type { EntityManager } from '@mikro-orm/postgresql'
import { submitPortalCsat } from '../../../../lib/portal-public'

const paramsSchema = z.object({
  token: z.string().uuid(),
})

const bodySchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
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

  const ok = await submitPortalCsat(em, token, body.rating, body.comment ?? null)
  if (!ok) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
