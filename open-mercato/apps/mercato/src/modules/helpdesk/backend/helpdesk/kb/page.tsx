"use client"

import * as React from 'react'
import { Page, PageBody, PageHeader } from '@open-mercato/ui/backend/Page'
import { apiCall } from '@open-mercato/ui/backend/utils/apiCall'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { Input } from '@open-mercato/ui/primitives/input'
import { Button } from '@open-mercato/ui/primitives/button'
import { HelpdeskShell } from '../../../components/HelpdeskShell'

type Article = { id: string; title: string; slug: string; body: string; category: string | null }

export default function HelpdeskKbPage() {
  const t = useT()
  const [query, setQuery] = React.useState('')
  const [articles, setArticles] = React.useState<Article[]>([])

  const load = React.useCallback(() => {
    const q = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''
    void apiCall<{ articles: Article[] }>(`/api/helpdesk/kb/articles${q}`).then(({ result }) =>
      setArticles(result?.articles ?? []),
    )
  }, [query])

  React.useEffect(() => {
    void load()
  }, [load])

  return (
    <Page>
      <PageHeader
        title={t('helpdesk.kb.title', 'Knowledge base')}
        description={t('helpdesk.kb.description', 'Internal runbooks and resolutions for agents.')}
      />
      <PageBody>
        <HelpdeskShell>
          <div className="flex gap-2 mb-4">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('helpdesk.kb.search', 'Search articles…')}
            />
            <Button type="button" onClick={() => void load()}>
              {t('helpdesk.agent.search', 'Search')}
            </Button>
          </div>
          <ul className="space-y-3">
            {articles.map((a) => (
              <li key={a.id} className="rounded-xl border p-4 bg-card">
                <div className="font-medium">{a.title}</div>
                <div className="text-xs text-muted-foreground mb-2">
                  {a.slug}
                  {a.category ? ` · ${a.category}` : ''}
                </div>
                <pre className="text-xs whitespace-pre-wrap text-muted-foreground max-h-48 overflow-y-auto">
                  {a.body}
                </pre>
              </li>
            ))}
          </ul>
        </HelpdeskShell>
      </PageBody>
    </Page>
  )
}
