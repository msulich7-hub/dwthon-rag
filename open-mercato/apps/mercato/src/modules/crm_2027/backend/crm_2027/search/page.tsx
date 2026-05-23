"use client"

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CrmShell } from '../../../components/CrmShell'
import { Page, PageBody, PageHeader } from '@open-mercato/ui/backend/Page'
import { Input } from '@open-mercato/ui/primitives/input'
import { apiCall } from '@open-mercato/ui/backend/utils/apiCall'
import type { CrmSearchResult } from '../../../lib/crm-search'

export default function Crm2027SearchPage() {
  const router = useRouter()
  const [query, setQuery] = React.useState('')
  const [items, setItems] = React.useState<CrmSearchResult[]>([])
  const [loading, setLoading] = React.useState(false)

  const runSearch = React.useCallback(async (q: string) => {
    const trimmed = q.trim()
    if (!trimmed) {
      setItems([])
      return
    }
    setLoading(true)
    try {
      const res = await apiCall<{ items: CrmSearchResult[] }>(
        `/api/crm_2027/search?q=${encodeURIComponent(trimmed)}`,
      )
      setItems(res.items ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    const handle = window.setTimeout(() => {
      void runSearch(query)
    }, 300)
    return () => window.clearTimeout(handle)
  }, [query, runSearch])

  return (
    <Page>
      <CrmShell>
        <PageHeader
          title="Search CRM"
          description="Twenty-style global search across people, companies, and deals."
        />
        <PageBody className="space-y-4">
          <Input
            autoFocus
            placeholder="Search by name or deal title… (press / to focus from hub)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && items[0]) {
                router.push(items[0].href)
              }
            }}
          />
          {loading ? <p className="text-sm text-muted-foreground">Searching…</p> : null}
          {!loading && query && items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No results.</p>
          ) : null}
          <ul className="divide-y rounded-lg border">
            {items.map((item) => (
              <li key={`${item.objectType}-${item.id}`}>
                <Link
                  href={item.href}
                  className="flex items-center justify-between px-4 py-3 hover:bg-muted/50"
                >
                  <div>
                    <div className="font-medium">{item.title}</div>
                    {item.subtitle ? (
                      <div className="text-xs text-muted-foreground">{item.subtitle}</div>
                    ) : null}
                  </div>
                  <span className="text-xs uppercase text-muted-foreground">{item.objectType}</span>
                </Link>
              </li>
            ))}
          </ul>
        </PageBody>
      </CrmShell>
    </Page>
  )
}
