import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { z } from 'zod'
import { createChecklistTemplateBodySchema } from '../../../data/validators'
import { createChecklistTemplate, listChecklistTemplates } from '../../../lib/checklist-templates'
import { resolveMesRequestContext } from '../../../lib/request-context'

const listQuerySchema = z.object({
  productCode: z.string().trim().max(120).optional(),
})

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['mes.quality.view'] },
  POST: { requireAuth: true, requireFeatures: ['mes.quality.manage'] },
}

export const openApi = {
  GET: { summary: 'List checklist templates', tags: ['mes'] },
  POST: { summary: 'Create checklist template', tags: ['mes'] },
}

export async function GET(request: Request) {
  try {
    const { em, tenantId, organizationId } = await resolveMesRequestContext(request)
    const url = new URL(request.url)
    const query = listQuerySchema.parse({
      productCode: url.searchParams.get('productCode') ?? undefined,
    })
    const templates = await listChecklistTemplates(em, { tenantId, organizationId }, query)
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
    const body = createChecklistTemplateBodySchema.parse(json)
    const template = await createChecklistTemplate(em, { tenantId, organizationId }, body)
    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'CHECKLIST_CODE_EXISTS') {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
