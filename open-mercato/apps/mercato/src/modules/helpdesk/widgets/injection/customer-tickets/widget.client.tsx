"use client"

import * as React from 'react'
import Link from 'next/link'
import type { InjectionWidgetComponentProps } from '@open-mercato/shared/modules/widgets/injection'
import { apiCall, readApiResultOrThrow } from '@open-mercato/ui/backend/utils/apiCall'
import { useGuardedMutation } from '@open-mercato/ui/backend/injection/useGuardedMutation'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { Button } from '@open-mercato/ui/primitives/button'
import { Input } from '@open-mercato/ui/primitives/input'
import { Label } from '@open-mercato/ui/primitives/label'
import { Textarea } from '@open-mercato/ui/primitives/textarea'
import { HELPDESK_ROUTES } from '../../../lib/helpdesk-routes'

type TicketItem = {
  id: string
  ticketKey: string
  subject: string
  status: string
  priority: string
  category: string | null
  updatedAt: string
}

type HostContext = {
  recordId?: string
  customerId?: string
  entityKind?: 'company' | 'person'
  data?: { entity?: { id?: string; kind?: string } }
}

function readCustomerContext(
  context: HostContext | undefined,
  data: HostContext['data'] | undefined,
): { customerId: string | null; kind: 'company' | 'person' | null } {
  const entity = data?.entity ?? context?.data?.entity
  const kindRaw =
    (typeof context?.entityKind === 'string' && context.entityKind) ||
    (typeof entity?.kind === 'string' && entity.kind) ||
    null
  const kind = kindRaw === 'company' || kindRaw === 'person' ? kindRaw : null
  const customerId =
    (typeof context?.customerId === 'string' && context.customerId) ||
    (typeof context?.recordId === 'string' && context.recordId) ||
    (typeof entity?.id === 'string' && entity.id) ||
    null

  return {
    customerId: customerId && customerId.length > 0 ? customerId : null,
    kind,
  }
}

function priorityTone(priority: string): string {
  if (priority === 'urgent') return 'border-destructive/50 bg-destructive/10 text-destructive'
  if (priority === 'high') return 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200'
  return 'border-muted bg-muted/40 text-muted-foreground'
}

export default function CustomerTicketsWidget({
  context,
  data,
}: InjectionWidgetComponentProps<HostContext, HostContext['data']>) {
  const t = useT()
  const { customerId, kind } = readCustomerContext(context, data)
  const [tickets, setTickets] = React.useState<TicketItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [subject, setSubject] = React.useState('')
  const [body, setBody] = React.useState('')

  const apiBase =
    kind === 'company'
      ? `/api/helpdesk/customers/company/${encodeURIComponent(customerId ?? '')}/tickets`
      : `/api/helpdesk/customers/person/${encodeURIComponent(customerId ?? '')}/tickets`

  const { runMutation } = useGuardedMutation<{ resourceType: string; resourceId: string | null }>({
    contextId: `helpdesk.customer-tickets.${kind ?? 'unknown'}.${customerId ?? 'unknown'}`,
  })

  const loadTickets = React.useCallback(async () => {
    if (!customerId || !kind) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const payload = await readApiResultOrThrow<{ tickets: TicketItem[] }>(apiBase)
      setTickets(Array.isArray(payload.tickets) ? payload.tickets : [])
    } catch (err) {
      console.error('helpdesk.customerTickets.load', err)
      setError(t('helpdesk.customerTickets.loadError', 'Failed to load tickets'))
    } finally {
      setLoading(false)
    }
  }, [apiBase, customerId, kind, t])

  React.useEffect(() => {
    void loadTickets()
  }, [loadTickets])

  const handleCreate = React.useCallback(
    async (event?: React.FormEvent) => {
      event?.preventDefault()
      if (!customerId || !kind || !subject.trim() || !body.trim()) return

      setError(null)
      await runMutation(async () => {
        const { result } = await apiCall<{ ticket: TicketItem }>(apiBase, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ subject: subject.trim(), body: body.trim(), source: 'manual' }),
        })
        if (result?.ticket) {
          setTickets((prev) => [result.ticket, ...prev])
        }
        setSubject('')
        setBody('')
      })
    },
    [apiBase, body, customerId, kind, runMutation, subject],
  )

  if (!customerId || !kind) {
    return (
      <div className="text-sm text-muted-foreground" data-helpdesk-customer-tickets="">
        {t('helpdesk.customerTickets.missingCustomer', 'Open a customer record to manage tickets.')}
      </div>
    )
  }

  return (
    <div className="space-y-4" data-helpdesk-customer-tickets="">
      <form className="space-y-3 rounded-lg border bg-card p-4" onSubmit={handleCreate}>
        <div>
          <h3 className="text-sm font-medium">{t('helpdesk.customerTickets.createTitle', 'New ticket')}</h3>
          <p className="text-xs text-muted-foreground">
            {t(
              'helpdesk.customerTickets.createHint',
              'Create a support issue linked to this customer. Priority is triaged automatically.',
            )}
          </p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="helpdesk-ticket-subject">{t('helpdesk.customerTickets.subjectLabel', 'Subject')}</Label>
          <Input
            id="helpdesk-ticket-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t('helpdesk.customerTickets.subjectPlaceholder', 'Cannot access billing portal')}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="helpdesk-ticket-body">{t('helpdesk.customerTickets.bodyLabel', 'Description')}</Label>
          <Textarea
            id="helpdesk-ticket-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder={t('helpdesk.customerTickets.bodyPlaceholder', 'Describe the issue…')}
          />
        </div>
        <Button type="submit" disabled={!subject.trim() || !body.trim()}>
          {t('helpdesk.customerTickets.create', 'Create ticket')}
        </Button>
      </form>

      {error ? <div className="text-sm text-destructive">{error}</div> : null}

      {loading ? (
        <div className="text-sm text-muted-foreground">{t('helpdesk.customerTickets.loading', 'Loading tickets…')}</div>
      ) : tickets.length === 0 ? (
        <div className="text-sm text-muted-foreground">{t('helpdesk.customerTickets.empty', 'No tickets yet.')}</div>
      ) : (
        <ul className="space-y-2">
          {tickets.map((ticket) => (
            <li key={ticket.id} className="rounded-lg border p-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <Link href={HELPDESK_ROUTES.ticket(ticket.id)} className="text-sm font-medium hover:underline">
                  {ticket.ticketKey} — {ticket.subject}
                </Link>
                <div className="text-xs text-muted-foreground capitalize">
                  {ticket.status.replace('_', ' ')} · {ticket.category ?? 'general'}
                </div>
              </div>
              <span className={`text-xs rounded-full border px-2 py-0.5 ${priorityTone(ticket.priority)}`}>
                {ticket.priority}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
