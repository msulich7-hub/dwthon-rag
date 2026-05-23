"use client"

import * as React from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Page, PageBody, PageHeader } from '@open-mercato/ui/backend/Page'
import { apiCall } from '@open-mercato/ui/backend/utils/apiCall'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { Input } from '@open-mercato/ui/primitives/input'
import { Button } from '@open-mercato/ui/primitives/button'
import { HelpdeskShell } from '../../../components/HelpdeskShell'
import { TicketKanbanBoard } from '../../../components/TicketKanbanBoard'
import { WorkspaceStatsBar, type WorkspaceStatsPayload } from '../../../components/WorkspaceStatsBar'
import { TicketCard } from '../../../components/TicketCard'
import { HELPDESK_ROUTES } from '../../../lib/helpdesk-routes'
import type { BoardTicket } from '../../../components/ticket-ui'

type QueueMeta = {
  id: string
  labelKey: string
  count: number
}

type ViewMode = 'board' | 'list'

export default function HelpdeskWorkspacePage() {
  const t = useT()
  const searchParams = useSearchParams()
  const initialView = searchParams?.get('view') === 'list' ? 'list' : 'board'

  const [view, setView] = React.useState<ViewMode>(initialView)
  const [queues, setQueues] = React.useState<QueueMeta[]>([])
  const [activeQueue, setActiveQueue] = React.useState('all')
  const [search, setSearch] = React.useState('')
  const [debouncedSearch, setDebouncedSearch] = React.useState('')
  const [includeClosed, setIncludeClosed] = React.useState(false)
  const [listTickets, setListTickets] = React.useState<BoardTicket[]>([])
  const [stats, setStats] = React.useState<WorkspaceStatsPayload | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedSearch(search), 300)
    return () => window.clearTimeout(handle)
  }, [search])

  React.useEffect(() => {
    void apiCall<{ queues: QueueMeta[] }>('/api/helpdesk/agent/queues')
      .then(({ result }) =>
        setQueues(
          Array.isArray(result?.queues)
            ? result.queues.map((q) => ({ id: q.id, labelKey: q.labelKey, count: q.count }))
            : [],
        ),
      )
      .catch(() => setQueues([]))
  }, [])

  const refreshStats = React.useCallback(async () => {
    try {
      const params = new URLSearchParams({ queue: activeQueue, includeClosed: String(includeClosed) })
      if (debouncedSearch) params.set('search', debouncedSearch)
      const { result } = await apiCall<{ stats: WorkspaceStatsPayload }>(
        `/api/helpdesk/agent/board?${params.toString()}`,
      )
      setStats(result?.stats ?? null)
    } catch {
      setStats(null)
    }
  }, [activeQueue, debouncedSearch, includeClosed])

  React.useEffect(() => {
    void refreshStats()
  }, [refreshStats])

  React.useEffect(() => {
    if (view !== 'list') return
    setError(null)
    const params = new URLSearchParams({ queue: activeQueue })
    if (debouncedSearch) params.set('search', debouncedSearch)
    void apiCall<{ tickets: BoardTicket[] }>(`/api/helpdesk/tickets?${params.toString()}`)
      .then(({ result }) => setListTickets(Array.isArray(result?.tickets) ? result.tickets : []))
      .catch(() => setError(t('helpdesk.tickets.loadError', 'Failed to load tickets')))
  }, [view, activeQueue, debouncedSearch, t])

  return (
    <Page>
      <PageHeader
        title={t('helpdesk.workspace.title', 'Agent workspace')}
        description={t(
          'helpdesk.workspace.description',
          'Kanban board, queues, and SLA-aware triage for your service desk team.',
        )}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href={HELPDESK_ROUTES.report}>{t('helpdesk.hub.report', 'Report an issue')}</Link>
          </Button>
        }
      />
      <PageBody>
        <HelpdeskShell>
          <WorkspaceStatsBar stats={stats} />

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={view === 'board' ? 'default' : 'outline'}
                onClick={() => setView('board')}
              >
                {t('helpdesk.view.board', 'Board')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={view === 'list' ? 'default' : 'outline'}
                onClick={() => setView('list')}
              >
                {t('helpdesk.view.list', 'List')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={includeClosed ? 'secondary' : 'outline'}
                onClick={() => setIncludeClosed((v) => !v)}
              >
                {includeClosed
                  ? t('helpdesk.kanban.hideClosed', 'Hide closed')
                  : t('helpdesk.kanban.showClosed', 'Show closed')}
              </Button>
            </div>
            <Input
              className="max-w-sm"
              placeholder={t('helpdesk.search.placeholder', 'Search tickets…')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-6 lg:flex-row">
            <nav className="lg:w-52 shrink-0 flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
              {queues.map((queue) => (
                <button
                  key={queue.id}
                  type="button"
                  onClick={() => setActiveQueue(queue.id)}
                  className={`shrink-0 text-left rounded-lg border px-3 py-2 text-sm transition-colors ${
                    activeQueue === queue.id ? 'bg-muted border-foreground/20 font-medium' : 'hover:bg-muted/50'
                  }`}
                >
                  <span className="flex items-center justify-between gap-3">
                    {t(queue.labelKey, queue.id)}
                    <span className="text-xs text-muted-foreground tabular-nums">{queue.count}</span>
                  </span>
                </button>
              ))}
            </nav>

            <div className="flex-1 min-w-0">
              {error ? <div className="text-sm text-destructive mb-4">{error}</div> : null}
              {view === 'board' ? (
                <TicketKanbanBoard
                  queue={activeQueue}
                  search={debouncedSearch}
                  includeClosed={includeClosed}
                  onTicketMoved={refreshStats}
                />
              ) : listTickets.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  {t('helpdesk.tickets.empty', 'No tickets in this queue.')}
                </div>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {listTickets.map((ticket) => (
                    <li key={ticket.id}>
                      <TicketCard ticket={ticket} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </HelpdeskShell>
      </PageBody>
    </Page>
  )
}
