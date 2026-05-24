import { z } from 'zod'
import { CrudHttpError, isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import {
  runCrudMutationGuardAfterSuccess,
  validateCrudMutationGuard,
} from '@open-mercato/shared/lib/crud/mutation-guard'
import { executeVoiceIntent, assertDealInScope } from '../../lib/voice-execute'
import { resolveCrm2027RequestContext } from '../../lib/request-context'

const bodySchema = z.object({
  transcript: z.string().min(1).max(4000),
  dealId: z.string().uuid().optional(),
  entityId: z.string().uuid().optional(),
  locale: z.enum(['pl', 'en']).optional(),
})

export const metadata = {
  POST: {
    requireAuth: true,
    requireFeatures: ['crm_2027.voice', 'customers.interactions.manage'],
  },
}

function resolveGuardUserId(auth: {
  sub?: string | null
  userId?: string | null
}): string {
  if (typeof auth.sub === 'string' && auth.sub.trim()) return auth.sub
  if (typeof auth.userId === 'string' && auth.userId.trim()) return auth.userId
  return 'system'
}

export async function POST(request: Request) {
  try {
    const ctx = await resolveCrm2027RequestContext(request)
    const json = await request.json().catch(() => null)
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return Response.json(
        { ok: false, error: 'invalid_body', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    if (parsed.data.dealId) {
      const inScope = await assertDealInScope(ctx.em, ctx, parsed.data.dealId)
      if (!inScope) {
        throw new CrudHttpError(404, { error: 'Deal not found' })
      }
    }

    const guardResult = await validateCrudMutationGuard({
      request,
      userId: resolveGuardUserId(ctx.commandContext.auth ?? {}),
      tenantId: ctx.tenantId,
      organizationId: ctx.organizationId,
    })
    if (guardResult && !guardResult.ok) {
      return Response.json(guardResult.body, { status: guardResult.status })
    }

    const result = await executeVoiceIntent(
      ctx.em,
      ctx.commandBus,
      ctx.commandContext,
      { tenantId: ctx.tenantId, organizationId: ctx.organizationId },
      parsed.data,
    )

    await runCrudMutationGuardAfterSuccess({
      request,
      userId: resolveGuardUserId(ctx.commandContext.auth ?? {}),
      tenantId: ctx.tenantId,
      organizationId: ctx.organizationId,
    })

    return Response.json({ ok: true, locale: parsed.data.locale ?? 'pl', ...result })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return Response.json(error.body, { status: error.status })
    }
    throw error
  }
}
