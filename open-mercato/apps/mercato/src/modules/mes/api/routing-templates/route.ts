import { NextResponse } from 'next/server'
import { CrudHttpError, isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { createRoutingTemplateBodySchema } from '../../data/validators'
import { createRoutingTemplate, listRoutingTemplates } from '../../lib/routing-templates'
import { resolveMesRequestContext } from '../../lib/request-context'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['mes.view'] },
  POST: { requireAuth: true, requireFeatures: ['mes.manage'] },
}

export const openApi = {
  GET: { summary: 'List MES routing templates', tags: ['mes'] },
  POST: { summary: 'Create MES routing template', tags: ['mes'] },
}

export async function GET(request: Request) {
  try {
    const { em, tenantId, organizationId } = await resolveMesRequestContext(request)
    const url = new URL(request.url)
    const productCode = url.searchParams.get('productCode') ?? undefined
    const isActiveParam = url.searchParams.get('isActive')
    const isActive =
      isActiveParam === 'true' ? true : isActiveParam === 'false' ? false : undefined

    const templates = await listRoutingTemplates(em, { tenantId, organizationId }, {
      productCode,
      isActive,
    })
    return NextResponse.json({ templates })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}

export async function POST(request: Request) {
  try {
    const { em, tenantId, organizationId } = await resolveMesRequestContext(request)
    const json = await request.json().catch(() => null)
    const body = createRoutingTemplateBodySchema.parse(json)
    const template = await createRoutingTemplate(em, { tenantId, organizationId }, body)
    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'ROUTING_CODE_EXISTS') {
      throw new CrudHttpError(409, { error: 'Routing template code already exists' })
    }
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
