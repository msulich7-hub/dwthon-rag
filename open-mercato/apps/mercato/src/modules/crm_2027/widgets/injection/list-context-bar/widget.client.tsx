"use client"

import Link from 'next/link'
import { CRM_ROUTES } from '../../../lib/crm-routes'

export default function ListContextBarWidget() {
  return (
    <div className="flex items-center gap-1 mr-2" data-crm-2027-list-context="">
      <Link
        href={CRM_ROUTES.hub}
        className="text-xs rounded-md border px-2 py-1 hover:bg-muted/50 whitespace-nowrap"
      >
        CRM 2027
      </Link>
      <Link
        href={CRM_ROUTES.search}
        className="text-xs rounded-md border px-2 py-1 hover:bg-muted/50 whitespace-nowrap"
      >
        Search
      </Link>
      <Link
        href={CRM_ROUTES.atRisk}
        className="text-xs rounded-md border px-2 py-1 hover:bg-muted/50 whitespace-nowrap"
      >
        At risk
      </Link>
    </div>
  )
}
