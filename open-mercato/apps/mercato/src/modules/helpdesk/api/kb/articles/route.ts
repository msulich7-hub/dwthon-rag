import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { kbArticleBodySchema } from '../../../data/extras-validators'
import { createKbArticle, listKbArticles, searchKbArticles } from '../../../lib/kb'
import { resolveHelpdeskRequestContext } from '../../../lib/request-context'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['helpdesk.agent', 'helpdesk.view'] },
  POST: { requireAuth: true, requireFeatures: ['helpdesk.agent'] },
}

export async function GET(request: Request) {
  try {
    const { tenantId, organizationId, em } = await resolveHelpdeskRequestContext(request)
    const q = new URL(request.url).searchParams.get('q')
    const articles = q
      ? await searchKbArticles(em, { tenantId, organizationId }, q)
      : await listKbArticles(em, { tenantId, organizationId })
    return NextResponse.json({ articles })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}

export async function POST(request: Request) {
  try {
    const { tenantId, organizationId, em } = await resolveHelpdeskRequestContext(request)
    const json = await request.json().catch(() => null)
    const body = kbArticleBodySchema.parse(json)
    const article = await createKbArticle(em, { tenantId, organizationId }, body)
    return NextResponse.json({ article })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
