import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { addWatcher, removeWatcher } from '../../../../lib/ticket-extras'
import { resolveHelpdeskRequestContext } from '../../../../lib/request-context'

export const metadata = {
  POST: { requireAuth: true, requireFeatures: ['helpdesk.agent'] },
  DELETE: { requireAuth: true, requireFeatures: ['helpdesk.agent'] },
}

const bodySchema = z.object({
  userId: z.string().uuid().optional(),
})

export async function POST(
  request: Request,
  ctx: { params: { ticketId: string } },
) {
  try {
    const { tenantId, organizationId, em, userId } = await resolveHelpdeskRequestContext(request)
    const ticketId = ctx.params?.ticketId?.trim()
    if (!ticketId) {
      return NextResponse.json({ error: 'Missing ticket id' }, { status: 400 })
    }
    const json = await request.json().catch(() => ({}))
    const body = bodySchema.parse(json)
    const targetUserId = body.userId ?? userId
    if (!targetUserId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }
    const watcher = await addWatcher(em, { tenantId, organizationId }, ticketId, targetUserId)
    return NextResponse.json({ watcher })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}

export async function DELETE(
  request: Request,
  ctx: { params: { ticketId: string } },
) {
  try {
    const { tenantId, organizationId, em, userId } = await resolveHelpdeskRequestContext(request)
    const ticketId = ctx.params?.ticketId?.trim()
    const url = new URL(request.url)
    const targetUserId = url.searchParams.get('userId') ?? userId
    if (!ticketId || !targetUserId) {
      return NextResponse.json({ error: 'Missing ticket or user id' }, { status: 400 })
    }
    await removeWatcher(em, { tenantId, organizationId }, ticketId, targetUserId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
