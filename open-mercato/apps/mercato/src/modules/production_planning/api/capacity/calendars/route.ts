import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { DEFAULT_WORK_CENTER_CALENDARS } from '../../../lib/capacity/work-center-calendar'
import { resolveProductionPlanningRequestContext } from '../../../lib/request-context'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['production_planning.view'] },
}

export async function GET(request: Request) {
  try {
    await resolveProductionPlanningRequestContext(request)
    return NextResponse.json({
      calendars: DEFAULT_WORK_CENTER_CALENDARS,
      source: 'mercato_config',
    })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
