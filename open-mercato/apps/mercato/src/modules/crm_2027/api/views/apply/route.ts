import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { Role } from '@open-mercato/core/modules/auth/data/entities'
import type { CacheStrategy } from '@open-mercato/cache'
import { applyCrmViewToCustomersList } from '../../../lib/apply-crm-view'
import { parseCrmPerspectiveEntity } from '../../../lib/perspective-bridge'
import { resolveCrm2027RequestContext } from '../../../lib/request-context'

const bodySchema = z.object({
  entity: z.enum(['people', 'companies', 'deals']),
  perspectiveId: z.string().uuid(),
})

export const metadata = {
  POST: { requireAuth: true, requireFeatures: ['crm_2027.view', 'perspectives.use'] },
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ctx = await resolveCrm2027RequestContext(request)
    const json = await request.json().catch(() => ({}))
    const parsed = bodySchema.parse(json)
    const entity = parseCrmPerspectiveEntity(parsed.entity)
    if (!entity) {
      return NextResponse.json({ error: 'Invalid entity' }, { status: 400 })
    }

    let cache: CacheStrategy | null = null
    try {
      cache = ctx.container.resolve('cache') as CacheStrategy
    } catch {
      cache = null
    }

    const assignedRoleNames = Array.isArray(auth.roles)
      ? auth.roles.filter((r): r is string => typeof r === 'string' && r.trim().length > 0)
      : []
    const assignedRoles = assignedRoleNames.length
      ? await ctx.em.find(Role, { name: { $in: assignedRoleNames as any }, deletedAt: null } as any)
      : []
    const roleIds = assignedRoles.map((r) => r.id)

    const result = await applyCrmViewToCustomersList(ctx.em, cache, {
      scope: {
        userId: auth.sub,
        tenantId: ctx.tenantId,
        organizationId: ctx.organizationId,
      },
      entity,
      perspectiveId: parsed.perspectiveId,
      roleIds,
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    if (error instanceof Error && (error as { code?: string }).code === 'NOT_FOUND') {
      return NextResponse.json({ error: 'CRM view not found' }, { status: 404 })
    }
    throw error
  }
}
