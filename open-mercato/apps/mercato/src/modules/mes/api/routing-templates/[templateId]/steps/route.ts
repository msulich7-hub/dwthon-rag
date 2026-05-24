import { NextResponse } from 'next/server'
import { CrudHttpError, isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { replaceRoutingTemplateStepsBodySchema } from '../../../../data/validators'
import { replaceRoutingTemplateSteps } from '../../../../lib/routing-templates'
import { resolveMesRequestContext } from '../../../../lib/request-context'

export const metadata = {
  PUT: { requireAuth: true, requireFeatures: ['mes.manage'] },
}

export const openApi = {
  PUT: { summary: 'Replace routing template steps', tags: ['mes'] },
}

export async function PUT(
  request: Request,
  ctx: { params: { templateId: string } },
) {
  try {
    const { em, tenantId, organizationId } = await resolveMesRequestContext(request)
    const templateId = ctx.params?.templateId?.trim()
    if (!templateId) {
      return NextResponse.json({ error: 'Missing template id' }, { status: 400 })
    }

    const json = await request.json().catch(() => null)
    const body = replaceRoutingTemplateStepsBodySchema.parse(json)
    const template = await replaceRoutingTemplateSteps(
      em,
      { tenantId, organizationId },
      templateId,
      body.steps,
    )
    return NextResponse.json({ template })
  } catch (error) {
    if (error instanceof Error && error.message === 'ROUTING_TEMPLATE_NOT_FOUND') {
      throw new CrudHttpError(404, { error: 'Routing template not found' })
    }
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
