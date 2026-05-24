"use client"

import Link from 'next/link'
import { CRM_ROUTES } from '../../../lib/crm-routes'

export default function DealQuickLinksWidget() {
  return (
    <div className="flex items-center gap-1" data-crm-2027-deal-quick-links="">
      <Link
        href={CRM_ROUTES.atRisk}
        className="text-xs rounded-md border border-amber-500/40 px-2 py-1 hover:bg-amber-500/10"
      >
        At-risk board
      </Link>
      <Link
        href={CRM_ROUTES.dashboard}
        className="text-xs rounded-md border px-2 py-1 hover:bg-muted/50"
      >
        Dashboard
      </Link>
    </div>
  )
}
