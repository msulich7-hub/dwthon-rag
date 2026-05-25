import { NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { importIfsRows, type IfsConsignmentRow } from '../../../lib/ifs-import'
import { resolveTransportRequestContext } from '../../../lib/request-context'
import { emitTransportDispatchEvent } from '../../../events'

export const metadata = {
  POST: { requireAuth: true, requireFeatures: ['transport_dispatch.manage'] },
}

export async function POST(request: Request) {
  try {
    const ctx = await resolveTransportRequestContext(request)
    let rows: IfsConsignmentRow[] = []

    const contentType = request.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      const body = await request.json()
      rows = Array.isArray(body) ? body : (body.rows ?? [])
    } else {
      const fixturePath = path.join(
        process.cwd(),
        'src/modules/transport_dispatch/fixtures/ifs-sample.json',
      )
      const raw = await readFile(fixturePath, 'utf8')
      rows = JSON.parse(raw) as IfsConsignmentRow[]
    }

    const result = await importIfsRows(ctx.em, {
      tenantId: ctx.tenantId,
      organizationId: ctx.organizationId,
    }, rows)

    await emitTransportDispatchEvent(
      'transport_dispatch.ifs.imported',
      { tenantId: ctx.tenantId, organizationId: ctx.organizationId, ...result },
      { persistent: true },
    )

    return NextResponse.json({ ok: true, source: 'ifs', ...result })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
