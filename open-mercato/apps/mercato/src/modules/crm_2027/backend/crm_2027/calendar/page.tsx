"use client"

import * as React from 'react'
import { readApiResultOrThrow } from '@open-mercato/ui/backend/utils/apiCall'
import { CrmShell } from '../../../components/CrmShell'
import { CRM_ROUTES } from '../../../lib/crm-routes'

type CalendarItem = {
  id: string
  dealId: string | null
  interactionType: string
  title: string | null
  scheduledAt: string
  status: string
}

export default function Crm2027CalendarPage() {
  const [items, setItems] = React.useState<CalendarItem[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    void readApiResultOrThrow<{ items: CalendarItem[] }>('/api/crm_2027/calendar/upcoming?days=30')
      .then((data) => setItems(data.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <CrmShell title="Upcoming meetings" subtitle="Planned calls and meetings from Customers interactions">
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading calendar…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No upcoming meetings in the next 30 days.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="rounded-lg border p-3 text-sm">
              <div className="font-medium">{item.title ?? item.interactionType}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(item.scheduledAt).toLocaleString()} · {item.interactionType}
                {item.dealId ? (
                  <>
                    {' '}
                    ·{' '}
                    <a className="underline" href={CRM_ROUTES.dealDetail(item.dealId)}>
                      Deal
                    </a>
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </CrmShell>
  )
}
