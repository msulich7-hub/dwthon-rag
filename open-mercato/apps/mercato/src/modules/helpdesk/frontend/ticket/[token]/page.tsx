"use client"

import * as React from 'react'
import { apiCallOrThrow } from '@open-mercato/ui/backend/utils/apiCall'
import { Button } from '@open-mercato/ui/primitives/button'
import { Textarea } from '@open-mercato/ui/primitives/textarea'
import { Label } from '@open-mercato/ui/primitives/label'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@open-mercato/ui/primitives/select'

type PublicTicket = {
  ticketKey: string
  subject: string
  status: string
  createdAt: string
  updatedAt: string
  csatRating: number | null
  comments: Array<{ body: string; authorName: string | null; createdAt: string }>
}

export default function HelpdeskPublicTicketPage({ params }: { params: { token: string } }) {
  const t = useT()
  const token = params?.token
  const [ticket, setTicket] = React.useState<PublicTicket | null>(null)
  const [reply, setReply] = React.useState('')
  const [csat, setCsat] = React.useState('5')
  const [error, setError] = React.useState<string | null>(null)
  const [message, setMessage] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    if (!token) return
    setError(null)
    try {
      const { result } = await apiCallOrThrow<{ ticket: PublicTicket }>(
        `/api/helpdesk/public/${encodeURIComponent(token)}`,
        { method: 'GET' },
      )
      setTicket(result?.ticket ?? null)
    } catch {
      setError(t('helpdesk.portal.notFound', 'Request not found or link expired.'))
      setTicket(null)
    }
  }, [token, t])

  React.useEffect(() => {
    void load()
  }, [load])

  const sendReply = async () => {
    if (!token || !reply.trim()) return
    await apiCallOrThrow(`/api/helpdesk/public/${encodeURIComponent(token)}/comments`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ body: reply.trim() }),
    })
    setReply('')
    setMessage(t('helpdesk.portal.replySent', 'Your message was sent.'))
    void load()
  }

  const sendCsat = async () => {
    if (!token) return
    await apiCallOrThrow(`/api/helpdesk/public/${encodeURIComponent(token)}/csat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ rating: Number(csat) }),
    })
    setMessage(t('helpdesk.portal.csatSaved', 'Thank you for your feedback.'))
    void load()
  }

  if (error) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <p className="text-destructive">{error}</p>
      </main>
    )
  }

  if (!ticket) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <p className="text-muted-foreground">{t('helpdesk.portal.loading', 'Loading…')}</p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-2xl p-8 space-y-8">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground font-mono">{ticket.ticketKey}</p>
        <h1 className="text-2xl font-semibold">{ticket.subject}</h1>
        <p className="text-sm capitalize text-muted-foreground">
          {t('helpdesk.portal.status', 'Status')}: {ticket.status.replace('_', ' ')}
        </p>
      </header>

      {message ? <p className="text-sm text-emerald-700 dark:text-emerald-300">{message}</p> : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">{t('helpdesk.portal.thread', 'Conversation')}</h2>
        <ul className="space-y-3">
          {ticket.comments.map((c, i) => (
            <li key={`${c.createdAt}-${i}`} className="rounded-lg border p-3 text-sm">
              <div className="text-xs text-muted-foreground mb-1">
                {c.authorName ?? t('helpdesk.portal.support', 'Support')} ·{' '}
                {new Date(c.createdAt).toLocaleString()}
              </div>
              <p className="whitespace-pre-wrap">{c.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2 rounded-xl border p-4">
        <Label htmlFor="portal-reply">{t('helpdesk.portal.reply', 'Add a reply')}</Label>
        <Textarea id="portal-reply" value={reply} onChange={(e) => setReply(e.target.value)} rows={4} />
        <Button type="button" onClick={() => void sendReply()} disabled={!reply.trim()}>
          {t('helpdesk.portal.send', 'Send')}
        </Button>
      </section>

      {(ticket.status === 'resolved' || ticket.status === 'closed') && !ticket.csatRating ? (
        <section className="space-y-2 rounded-xl border p-4 bg-muted/30">
          <h2 className="text-sm font-semibold">{t('helpdesk.portal.csat', 'Rate our support')}</h2>
          <Select value={csat} onValueChange={setCsat}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[5, 4, 3, 2, 1].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} ★
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" size="sm" onClick={() => void sendCsat()}>
            {t('helpdesk.portal.submitCsat', 'Submit rating')}
          </Button>
        </section>
      ) : ticket.csatRating ? (
        <p className="text-sm text-muted-foreground">
          {t('helpdesk.portal.csatDone', 'You rated this request')} {ticket.csatRating}/5
        </p>
      ) : null}
    </main>
  )
}
