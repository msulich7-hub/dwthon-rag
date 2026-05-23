"use client"

import * as React from 'react'
import Link from 'next/link'
import { Page, PageBody, PageHeader } from '@open-mercato/ui/backend/Page'
import { apiCall } from '@open-mercato/ui/backend/utils/apiCall'
import { useT } from '@open-mercato/shared/lib/i18n/context'
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
import { HELPDESK_ROUTES } from '../../../lib/helpdesk-routes'

export default function HelpdeskReportPage() {
  const t = useT()
  const [subject, setSubject] = React.useState('')
  const [body, setBody] = React.useState('')
  const [teamQueue, setTeamQueue] = React.useState('general')
  const [submittedKey, setSubmittedKey] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!subject.trim() || !body.trim()) return
    setLoading(true)
    setError(null)
    setSubmittedKey(null)
    try {
      const { result } = await apiCall<{ ticket: { ticketKey: string; id: string } }>(
        '/api/helpdesk/requests/internal',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            subject: subject.trim(),
            body: body.trim(),
            teamQueue,
          }),
        },
      )
      if (result?.ticket?.ticketKey) {
        setSubmittedKey(result.ticket.ticketKey)
        setSubject('')
        setBody('')
      }
    } catch {
      setError(t('helpdesk.report.error', 'Could not submit your request'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Page>
      <PageHeader
        title={t('helpdesk.report.title', 'Report an issue')}
        description={t(
          'helpdesk.report.description',
          'Internal request for IT, operations, or billing. Visible to the service desk team only.',
        )}
      />
      <PageBody className="max-w-xl">
        {submittedKey ? (
          <div className="rounded-lg border border-green-500/40 bg-green-500/10 p-4 text-sm mb-4">
            {t('helpdesk.report.success', 'Request submitted')}: <strong>{submittedKey}</strong>
          </div>
        ) : null}
        {error ? <div className="text-sm text-destructive mb-4">{error}</div> : null}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <Label htmlFor="helpdesk-report-queue">{t('helpdesk.report.queueLabel', 'Team')}</Label>
            <Select value={teamQueue} onValueChange={setTeamQueue}>
              <SelectTrigger id="helpdesk-report-queue">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">{t('helpdesk.queues.general', 'General')}</SelectItem>
                <SelectItem value="it">{t('helpdesk.queues.it', 'IT')}</SelectItem>
                <SelectItem value="ops">{t('helpdesk.queues.ops', 'Operations')}</SelectItem>
                <SelectItem value="billing">{t('helpdesk.queues.billing', 'Billing')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="helpdesk-report-subject">{t('helpdesk.report.subjectLabel', 'Subject')}</Label>
            <Input
              id="helpdesk-report-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t('helpdesk.report.subjectPlaceholder', 'Laptop cannot connect to VPN')}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="helpdesk-report-body">{t('helpdesk.report.bodyLabel', 'Details')}</Label>
            <Textarea
              id="helpdesk-report-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              placeholder={t('helpdesk.report.bodyPlaceholder', 'What happened? What did you try?')}
            />
          </div>
          <Button type="submit" disabled={loading || !subject.trim() || !body.trim()}>
            {t('helpdesk.report.submit', 'Submit internal request')}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground mt-6">
          {t('helpdesk.report.agentHint', 'Agents triage requests in the')}{' '}
          <Link href={HELPDESK_ROUTES.workspace} className="underline">
            {t('helpdesk.workspace.title', 'Agent workspace')}
          </Link>
          .
        </p>
      </PageBody>
    </Page>
  )
}
