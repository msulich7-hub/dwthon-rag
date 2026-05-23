"use client"

import * as React from 'react'
import type { InjectionWidgetComponentProps } from '@open-mercato/shared/modules/widgets/injection'
import { apiCall, readApiResultOrThrow } from '@open-mercato/ui/backend/utils/apiCall'
import { useGuardedMutation } from '@open-mercato/ui/backend/injection/useGuardedMutation'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { Button } from '@open-mercato/ui/primitives/button'
import { Textarea } from '@open-mercato/ui/primitives/textarea'
import { Input } from '@open-mercato/ui/primitives/input'
import { Label } from '@open-mercato/ui/primitives/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@open-mercato/ui/primitives/select'

type MeetingRisk = {
  atRisk: boolean
  riskLevel: 'medium' | 'high'
  reasons: string[]
}

type MeetingItem = {
  id: string
  dealId: string
  title: string | null
  source: string | null
  transcriptExcerpt: string
  sentiment: { label: string; score: number; atRisk: boolean; signals: string[] }
  progression: {
    summary: string
    riskLevel: string
    followUpActions: string[]
    suggestedStageChange: string | null
  }
  risk: MeetingRisk | null
  ingestedAt: string
}

type MeetingsResponse = {
  dealId: string
  meetings: MeetingItem[]
  risk: (MeetingRisk & { lastScannedAt: string }) | null
}

type HostContext = {
  dealId?: string
  recordId?: string
  data?: { deal?: { id?: string } }
}

function readDealId(context: HostContext | undefined, data: HostContext['data'] | undefined): string | null {
  const dealRecord = data?.deal ?? context?.data?.deal
  const id =
    (typeof context?.dealId === 'string' && context.dealId) ||
    (typeof context?.recordId === 'string' && context.recordId) ||
    (typeof dealRecord?.id === 'string' && dealRecord.id) ||
    null
  return id && id.length > 0 ? id : null
}

function riskTone(level: string): string {
  if (level === 'high') {
    return 'border-destructive/50 bg-destructive/10 text-destructive'
  }
  if (level === 'medium') {
    return 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200'
  }
  return 'border-muted bg-muted/40 text-muted-foreground'
}

export default function DealMeetingsWidget({
  context,
  data,
}: InjectionWidgetComponentProps<HostContext, HostContext['data']>) {
  const t = useT()
  const dealId = readDealId(context, data)
  const [meetings, setMeetings] = React.useState<MeetingItem[]>([])
  const [dealRisk, setDealRisk] = React.useState<MeetingsResponse['risk']>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [transcript, setTranscript] = React.useState('')
  const [title, setTitle] = React.useState('')
  const [source, setSource] = React.useState('manual')

  const { runMutation } = useGuardedMutation<{ resourceType: string; resourceId: string | null }>({
    contextId: `crm_2027.deal-meetings.${dealId ?? 'unknown'}`,
  })

  const loadMeetings = React.useCallback(async () => {
    if (!dealId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const payload = await readApiResultOrThrow<MeetingsResponse>(
        `/api/crm_2027/deals/${encodeURIComponent(dealId)}/meetings`,
      )
      setMeetings(Array.isArray(payload.meetings) ? payload.meetings : [])
      setDealRisk(payload.risk ?? null)
    } catch (err) {
      console.error('crm_2027.dealMeetings.load', err)
      setError(t('crm_2027.dealMeetings.loadError', 'Failed to load meetings'))
    } finally {
      setLoading(false)
    }
  }, [dealId, t])

  React.useEffect(() => {
    void loadMeetings()
  }, [loadMeetings])

  const handleAnalyze = React.useCallback(
    async (event?: React.FormEvent) => {
      event?.preventDefault()
      if (!dealId || !transcript.trim()) return

      setError(null)
      await runMutation(async () => {
        const { result } = await apiCall<{
          meeting: MeetingItem
          risk: MeetingsResponse['risk']
          alerts: number
        }>(`/api/crm_2027/deals/${encodeURIComponent(dealId)}/meetings`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            transcript: transcript.trim(),
            title: title.trim() || undefined,
            source,
          }),
        })

        if (result?.meeting) {
          setMeetings((prev) => [result.meeting, ...prev])
        }
        if (result?.risk !== undefined) {
          setDealRisk(result.risk)
        }
        setTranscript('')
        setTitle('')
      })
    },
    [dealId, runMutation, source, title, transcript],
  )

  if (!dealId) {
    return (
      <div className="text-sm text-muted-foreground" data-crm-2027-deal-meetings="">
        {t('crm_2027.dealMeetings.missingDeal', 'Open a deal to ingest meeting notes.')}
      </div>
    )
  }

  return (
    <div className="space-y-4" data-crm-2027-deal-meetings="">
      {dealRisk?.atRisk ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
          <span className={`text-xs rounded-full border px-2 py-0.5 font-medium ${riskTone(dealRisk.riskLevel)}`}>
            {t('crm_2027.dealMeetings.dealRisk', 'Deal at risk')} ({dealRisk.riskLevel})
          </span>
          {dealRisk.reasons.slice(0, 3).map((reason) => (
            <span key={reason} className="text-xs text-muted-foreground">
              {reason}
            </span>
          ))}
        </div>
      ) : null}

      <form className="space-y-3 rounded-lg border bg-card p-4" onSubmit={handleAnalyze}>
        <div>
          <h3 className="text-sm font-medium">{t('crm_2027.dealMeetings.ingestTitle', 'Meeting transcript')}</h3>
          <p className="text-xs text-muted-foreground">
            {t(
              'crm_2027.dealMeetings.ingestHint',
              'Paste notes from Zoom, Teams, Gong, or a manual recap. We analyze sentiment and refresh deal risk.',
            )}
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="crm-2027-meeting-title">{t('crm_2027.dealMeetings.titleLabel', 'Title')}</Label>
            <Input
              id="crm-2027-meeting-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('crm_2027.dealMeetings.titlePlaceholder', 'Discovery call')}
            />
          </div>
          <div className="space-y-1">
            <Label>{t('crm_2027.dealMeetings.sourceLabel', 'Source')}</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">{t('crm_2027.dealMeetings.source.manual', 'Manual')}</SelectItem>
                <SelectItem value="zoom">{t('crm_2027.dealMeetings.source.zoom', 'Zoom')}</SelectItem>
                <SelectItem value="teams">{t('crm_2027.dealMeetings.source.teams', 'Teams')}</SelectItem>
                <SelectItem value="gong">{t('crm_2027.dealMeetings.source.gong', 'Gong')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="crm-2027-meeting-transcript">{t('crm_2027.dealMeetings.transcriptLabel', 'Transcript')}</Label>
          <Textarea
            id="crm-2027-meeting-transcript"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={6}
            placeholder={t(
              'crm_2027.dealMeetings.transcriptPlaceholder',
              'Paste the meeting transcript or call notes here…',
            )}
          />
        </div>
        <Button type="submit" disabled={!transcript.trim()}>
          {t('crm_2027.dealMeetings.analyze', 'Analyze')}
        </Button>
      </form>

      {error ? <div className="text-sm text-destructive">{error}</div> : null}

      {loading ? (
        <div className="text-sm text-muted-foreground">{t('crm_2027.dealMeetings.loading', 'Loading meetings…')}</div>
      ) : meetings.length === 0 ? (
        <div className="text-sm text-muted-foreground">{t('crm_2027.dealMeetings.empty', 'No meetings ingested yet.')}</div>
      ) : (
        <ul className="space-y-3">
          {meetings.map((meeting) => (
            <li key={meeting.id} className="rounded-lg border p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-medium">
                    {meeting.title || t('crm_2027.dealMeetings.untitled', 'Untitled meeting')}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {meeting.source ?? 'manual'} · {new Date(meeting.ingestedAt).toLocaleString()}
                  </div>
                </div>
                <span className={`text-xs rounded-full border px-2 py-0.5 ${riskTone(meeting.sentiment.atRisk ? 'high' : 'low')}`}>
                  {meeting.sentiment.label}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{meeting.transcriptExcerpt}</p>
              <p className="text-xs">{meeting.progression.summary}</p>
              {meeting.progression.followUpActions.length > 0 ? (
                <ul className="text-xs list-disc pl-4 text-muted-foreground">
                  {meeting.progression.followUpActions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
              ) : null}
              {meeting.risk?.atRisk ? (
                <div className="flex flex-wrap gap-1">
                  {meeting.risk.reasons.map((reason) => (
                    <span key={reason} className={`text-xs rounded-full border px-2 py-0.5 ${riskTone(meeting.risk!.riskLevel)}`}>
                      {reason}
                    </span>
                  ))}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
