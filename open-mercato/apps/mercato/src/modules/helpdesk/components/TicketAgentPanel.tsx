"use client"

import * as React from 'react'
import Link from 'next/link'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { apiCall } from '@open-mercato/ui/backend/utils/apiCall'
import { Button } from '@open-mercato/ui/primitives/button'
import { Input } from '@open-mercato/ui/primitives/input'
import { Label } from '@open-mercato/ui/primitives/label'
import { Textarea } from '@open-mercato/ui/primitives/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@open-mercato/ui/primitives/select'
import { VoiceMicButton } from './VoiceMicButton'
import { HELPDESK_ROUTES } from '../lib/helpdesk-routes'
import { applyCannedTemplate } from './ticket-ui'

type CannedItem = { id: string; title: string; body: string; isInternal: boolean }
type KbItem = { id: string; title: string; slug: string; body: string }

type Extras = {
  watchers: Array<{ id: string; userId: string }>
  links: Array<{ id: string; linkType: string; ticket: { id: string; ticketKey: string; subject: string } }>
  timeEntries: Array<{ id: string; minutes: number; note: string | null }>
  totalMinutes: number
  summary: { headline: string; bullets: string[]; suggestedNextSteps: string[] } | null
  csatRating: number | null
}

type TicketAgentPanelProps = {
  ticketId: string
  ticketKey: string
  visibility: string
  currentUserId: string | null
  onReload: () => void
  publicReply: string
  setPublicReply: (v: string) => void
}

export function TicketAgentPanel({
  ticketId,
  ticketKey,
  visibility,
  currentUserId,
  onReload,
  publicReply,
  setPublicReply,
}: TicketAgentPanelProps) {
  const t = useT()
  const [extras, setExtras] = React.useState<Extras | null>(null)
  const [canned, setCanned] = React.useState<CannedItem[]>([])
  const [kb, setKb] = React.useState<KbItem[]>([])
  const [kbQuery, setKbQuery] = React.useState('')
  const [linkKey, setLinkKey] = React.useState('')
  const [minutes, setMinutes] = React.useState('15')
  const [csatRating, setCsatRating] = React.useState('5')
  const [voiceMsg, setVoiceMsg] = React.useState<string | null>(null)
  const [tone, setTone] = React.useState<'professional' | 'empathetic' | 'friendly'>('professional')
  const [portalUrl, setPortalUrl] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    const [{ result: ex }, { result: can }, { result: kbRes }] = await Promise.all([
      apiCall<{ extras: Extras }>(`/api/helpdesk/tickets/${encodeURIComponent(ticketId)}/extras`),
      apiCall<{ items: CannedItem[] }>('/api/helpdesk/canned-responses'),
      apiCall<{ articles: KbItem[] }>(`/api/helpdesk/kb/articles?q=${encodeURIComponent(kbQuery)}`),
    ])
    if (ex?.extras) setExtras(ex.extras)
    if (can?.items) setCanned(can.items)
    if (kbRes?.articles) setKb(kbRes.articles)
  }, [ticketId, kbQuery])

  React.useEffect(() => {
    void load()
  }, [load])

  const insertCanned = (item: CannedItem) => {
    const text = applyCannedTemplate(item.body, { ticketKey })
    if (item.isInternal) {
      void apiCall(`/api/helpdesk/tickets/${encodeURIComponent(ticketId)}/comments`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body: text, isInternal: true }),
      }).then(() => onReload())
    } else {
      setPublicReply(text)
    }
  }

  const enhanceTone = async () => {
    const { result } = await apiCall<{ enhanced: string }>(
      `/api/helpdesk/tickets/${encodeURIComponent(ticketId)}/enhance-tone`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ draft: publicReply, tone }),
      },
    )
    if (result?.enhanced) setPublicReply(result.enhanced)
  }

  return (
    <div className="space-y-6" data-helpdesk-agent-panel="">
      <section className="rounded-xl border bg-gradient-to-br from-violet-500/5 to-sky-500/5 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">{t('helpdesk.agent.voiceTitle', 'Voice commands')}</h2>
          <VoiceMicButton
            ticketId={ticketId}
            onExecuted={(msg) => {
              setVoiceMsg(msg)
              onReload()
              void load()
            }}
          />
        </div>
        {voiceMsg ? <p className="text-xs text-muted-foreground">{voiceMsg}</p> : null}
        <p className="text-xs text-muted-foreground">
          {t(
            'helpdesk.agent.voiceHint',
            'Try: „przypisz do mnie”, „notatka wewnętrzna: …”, „ustaw status resolved”, „szukaj w bazie VPN”.',
          )}
        </p>
      </section>

      {extras?.summary ? (
        <section className="rounded-xl border p-4 space-y-2 bg-card">
          <h2 className="text-sm font-semibold">{t('helpdesk.agent.summary', 'AI summary')}</h2>
          <p className="text-sm font-medium">{extras.summary.headline}</p>
          <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
            {extras.summary.bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
          {extras.summary.suggestedNextSteps.length > 0 ? (
            <div className="text-xs">
              <span className="font-medium">{t('helpdesk.agent.nextSteps', 'Next steps')}:</span>{' '}
              {extras.summary.suggestedNextSteps.join(' · ')}
            </div>
          ) : null}
        </section>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            void apiCall(`/api/helpdesk/tickets/${encodeURIComponent(ticketId)}/summary`, {
              method: 'POST',
            }).then(() => load())
          }
        >
          {t('helpdesk.agent.generateSummary', 'Generate summary')}
        </Button>
      )}

      <section className="rounded-xl border p-4 space-y-3">
        <h2 className="text-sm font-semibold">{t('helpdesk.agent.canned', 'Canned responses')}</h2>
        <div className="flex flex-wrap gap-2">
          {canned.map((item) => (
            <Button key={item.id} type="button" size="sm" variant="secondary" onClick={() => insertCanned(item)}>
              {item.title}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 items-end">
          <div className="space-y-1">
            <Label>{t('helpdesk.agent.tone', 'Tone enhance')}</Label>
            <Select value={tone} onValueChange={(v) => setTone(v as typeof tone)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="empathetic">Empathetic</SelectItem>
                <SelectItem value="friendly">Friendly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="button" size="sm" onClick={() => void enhanceTone()} disabled={!publicReply.trim()}>
            {t('helpdesk.agent.polish', 'Polish draft')}
          </Button>
        </div>
      </section>

      <section className="rounded-xl border p-4 space-y-3">
        <h2 className="text-sm font-semibold">{t('helpdesk.agent.kb', 'Knowledge base')}</h2>
        <div className="flex gap-2">
          <Input
            value={kbQuery}
            onChange={(e) => setKbQuery(e.target.value)}
            placeholder={t('helpdesk.agent.kbSearch', 'Search KB…')}
          />
          <Button type="button" size="sm" onClick={() => void load()}>
            {t('helpdesk.agent.search', 'Search')}
          </Button>
        </div>
        <ul className="space-y-2 max-h-40 overflow-y-auto text-sm">
          {kb.map((a) => (
            <li key={a.id} className="border rounded-lg p-2">
              <div className="font-medium">{a.title}</div>
              <p className="text-xs text-muted-foreground line-clamp-2">{a.body}</p>
              <Button
                type="button"
                size="sm"
                variant="link"
                className="h-auto p-0 mt-1"
                onClick={() =>
                  setPublicReply((prev) => `${prev}\n\nKB: ${a.title}\n${a.body.slice(0, 300)}…`.trim())
                }
              >
                {t('helpdesk.agent.insertKb', 'Insert into reply')}
              </Button>
            </li>
          ))}
        </ul>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            void apiCall(`/api/helpdesk/kb/from-ticket/${encodeURIComponent(ticketId)}`, {
              method: 'POST',
            }).then(() => load())
          }
        >
          {t('helpdesk.agent.kbFromTicket', 'Create KB article from ticket')}
        </Button>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border p-4 space-y-2">
          <h2 className="text-sm font-semibold">{t('helpdesk.agent.time', 'Time tracking')}</h2>
          <p className="text-2xl font-semibold tabular-nums">{extras?.totalMinutes ?? 0} min</p>
          <div className="flex gap-2">
            <Input value={minutes} onChange={(e) => setMinutes(e.target.value)} type="number" min={1} />
            <Button
              type="button"
              size="sm"
              onClick={() =>
                void apiCall(`/api/helpdesk/tickets/${encodeURIComponent(ticketId)}/time-entries`, {
                  method: 'POST',
                  headers: { 'content-type': 'application/json' },
                  body: JSON.stringify({ minutes: Number(minutes) || 15 }),
                }).then(() => load())
              }
            >
              {t('helpdesk.agent.logTime', 'Log time')}
            </Button>
          </div>
        </div>

        <div className="rounded-xl border p-4 space-y-2">
          <h2 className="text-sm font-semibold">{t('helpdesk.agent.watchers', 'Watchers')}</h2>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              void apiCall(`/api/helpdesk/tickets/${encodeURIComponent(ticketId)}/watchers`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({}),
              }).then(() => load())
            }
          >
            {t('helpdesk.agent.watchMe', 'Watch this ticket')}
          </Button>
          <ul className="text-xs space-y-1 font-mono">
            {extras?.watchers.map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-2">
                <span>{w.userId.slice(0, 8)}…</span>
                {currentUserId && w.userId === currentUserId ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs"
                    onClick={() =>
                      void apiCall(
                        `/api/helpdesk/tickets/${encodeURIComponent(ticketId)}/watchers?userId=${encodeURIComponent(w.userId)}`,
                        { method: 'DELETE' },
                      ).then(() => load())
                    }
                  >
                    {t('helpdesk.agent.unwatch', 'Unwatch')}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
          {!extras?.watchers.length ? (
            <p className="text-xs text-muted-foreground">{t('helpdesk.agent.noWatchers', 'No watchers')}</p>
          ) : null}
        </div>
      </section>

      <section className="rounded-xl border p-4 space-y-2">
        <h2 className="text-sm font-semibold">{t('helpdesk.agent.links', 'Linked tickets')}</h2>
        <div className="flex gap-2">
          <Input
            value={linkKey}
            onChange={(e) => setLinkKey(e.target.value)}
            placeholder="HD-0002"
          />
          <Button
            type="button"
            size="sm"
            onClick={async () => {
              const { result } = await apiCall<{ ticket: { id: string; ticketKey: string } }>(
                `/api/helpdesk/tickets/lookup?key=${encodeURIComponent(linkKey.trim())}`,
              )
              const target = result?.ticket
              if (!target) return
              await apiCall(`/api/helpdesk/tickets/${encodeURIComponent(ticketId)}/links`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ targetTicketId: target.id, linkType: 'related' }),
              })
              setLinkKey('')
              void load()
            }}
          >
            {t('helpdesk.agent.link', 'Link')}
          </Button>
        </div>
        <ul className="text-sm space-y-1">
          {extras?.links.map((l) => (
            <li key={l.id}>
              <Link href={HELPDESK_ROUTES.ticket(l.ticket.id)} className="underline">
                {l.ticket.ticketKey}
              </Link>{' '}
              — {l.ticket.subject} ({l.linkType})
            </li>
          ))}
        </ul>
      </section>

      {visibility === 'customer' ? (
        <section className="rounded-xl border p-4 space-y-2 bg-sky-500/5">
          <h2 className="text-sm font-semibold">{t('helpdesk.agent.portal', 'Customer portal link')}</h2>
          <p className="text-xs text-muted-foreground">
            {t('helpdesk.agent.portalHint', 'Share with the requester to view status and reply. Regenerating invalidates the previous link.')}
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              void apiCall<{ portalUrl: string }>(
                `/api/helpdesk/tickets/${encodeURIComponent(ticketId)}/portal-token`,
                { method: 'POST' },
              ).then(({ result }) => {
                if (result?.portalUrl) {
                  setPortalUrl(result.portalUrl)
                  void navigator.clipboard?.writeText(result.portalUrl)
                }
              })
            }
          >
            {t('helpdesk.agent.generatePortal', 'Generate & copy link')}
          </Button>
          {portalUrl ? (
            <p className="text-xs break-all font-mono text-muted-foreground">{portalUrl}</p>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-xl border p-4 space-y-2">
        <h2 className="text-sm font-semibold">{t('helpdesk.agent.csat', 'CSAT (internal)')}</h2>
        <div className="flex gap-2 items-center">
          <Select value={csatRating} onValueChange={setCsatRating}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} ★
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            onClick={() =>
              void apiCall(`/api/helpdesk/tickets/${encodeURIComponent(ticketId)}/csat`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ rating: Number(csatRating) }),
              }).then(() => onReload())
            }
          >
            {t('helpdesk.agent.saveCsat', 'Save rating')}
          </Button>
          {extras?.csatRating ? (
            <span className="text-sm text-muted-foreground">Saved: {extras.csatRating}/5</span>
          ) : null}
        </div>
      </section>
    </div>
  )
}
