"use client"

import * as React from 'react'
import Link from 'next/link'
import { Page, PageBody, PageHeader } from '@open-mercato/ui/backend/Page'
import { DataTable } from '@open-mercato/ui/backend/DataTable'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@open-mercato/ui/primitives/button'
import { Input } from '@open-mercato/ui/primitives/input'
import { Label } from '@open-mercato/ui/primitives/label'
import { apiCall, readApiResultOrThrow } from '@open-mercato/ui/backend/utils/apiCall'
import { flash } from '@open-mercato/ui/backend/FlashMessages'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { MesShell } from '../../../components/MesShell'
import { MES_ROUTES } from '../../../lib/mes-routes'

type HoldRow = {
  id: string
  targetType: string
  targetId: string
  reasonCode: string
  reasonText: string | null
  status: string
  createdAt: string
}

type DowntimeRow = {
  id: string
  workCenterCode: string
  reasonCode: string
  reasonLabel: string
  startedAt: string
  endedAt: string | null
}

type TemplateRow = {
  id: string
  code: string
  name: string
  productCode: string | null
  items: Array<{ id: string; label: string; sequence: number }>
}

export default function MesQualityPage() {
  const t = useT()
  const [holds, setHolds] = React.useState<HoldRow[]>([])
  const [downtime, setDowntime] = React.useState<DowntimeRow[]>([])
  const [templates, setTemplates] = React.useState<TemplateRow[]>([])
  const [loading, setLoading] = React.useState(true)

  const [holdForm, setHoldForm] = React.useState({
    targetId: '',
    reasonCode: 'QC_HOLD',
    reasonText: '',
  })
  const [downtimeForm, setDowntimeForm] = React.useState({
    workCenterCode: '',
    reasonCode: 'BREAKDOWN',
    reasonLabel: 'Breakdown',
  })
  const [templateForm, setTemplateForm] = React.useState({
    code: '',
    name: '',
    productCode: '',
    itemLabel: 'Visual inspection OK',
  })

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const [holdsRes, downtimeRes, templatesRes] = await Promise.all([
        readApiResultOrThrow<{ holds: HoldRow[] }>('/api/mes/quality/holds?status=active&limit=50'),
        readApiResultOrThrow<{ segments: DowntimeRow[] }>('/api/mes/downtime?activeOnly=true&limit=50'),
        readApiResultOrThrow<{ templates: TemplateRow[] }>('/api/mes/quality/checklist-templates'),
      ])
      setHolds(holdsRes.holds ?? [])
      setDowntime(downtimeRes.segments ?? [])
      setTemplates(templatesRes.templates ?? [])
    } catch {
      flash(t('mes.quality.loadError', 'Failed to load quality data'), 'error')
    } finally {
      setLoading(false)
    }
  }, [t])

  React.useEffect(() => {
    void load()
  }, [load])

  const handleCreateHold = async () => {
    if (!holdForm.targetId.trim()) return
    const call = await apiCall('/api/mes/quality/holds', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        targetType: 'work_order',
        targetId: holdForm.targetId.trim(),
        reasonCode: holdForm.reasonCode,
        reasonText: holdForm.reasonText || undefined,
      }),
    })
    if (!call.ok) {
      flash(t('mes.quality.holdError', 'Could not create hold'), 'error')
      return
    }
    flash(t('mes.quality.holdSuccess', 'Hold created'), 'success')
    setHoldForm((s) => ({ ...s, targetId: '', reasonText: '' }))
    await load()
  }

  const handleReleaseHold = async (holdId: string) => {
    const call = await apiCall(`/api/mes/quality/holds/${encodeURIComponent(holdId)}/release`, {
      method: 'PATCH',
    })
    if (!call.ok) {
      flash(t('mes.quality.releaseError', 'Could not release hold'), 'error')
      return
    }
    flash(t('mes.quality.releaseSuccess', 'Hold released'), 'success')
    await load()
  }

  const handleStartDowntime = async () => {
    if (!downtimeForm.workCenterCode.trim()) return
    const call = await apiCall('/api/mes/downtime', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(downtimeForm),
    })
    if (!call.ok) {
      flash(t('mes.quality.downtimeError', 'Could not start downtime'), 'error')
      return
    }
    flash(t('mes.quality.downtimeSuccess', 'Downtime started'), 'success')
    await load()
  }

  const handleEndDowntime = async (segmentId: string) => {
    const call = await apiCall(`/api/mes/downtime/${encodeURIComponent(segmentId)}/end`, {
      method: 'PATCH',
    })
    if (!call.ok) {
      flash(t('mes.quality.downtimeEndError', 'Could not end downtime'), 'error')
      return
    }
    await load()
  }

  const handleCreateTemplate = async () => {
    if (!templateForm.code.trim() || !templateForm.name.trim()) return
    const call = await apiCall('/api/mes/quality/checklist-templates', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        code: templateForm.code.trim(),
        name: templateForm.name.trim(),
        productCode: templateForm.productCode.trim() || undefined,
        items: [{ sequence: 10, label: templateForm.itemLabel.trim(), requiresValue: false }],
      }),
    })
    if (!call.ok) {
      flash(t('mes.quality.templateError', 'Could not create template'), 'error')
      return
    }
    flash(t('mes.quality.templateSuccess', 'Checklist template created'), 'success')
    await load()
  }

  const holdColumns = React.useMemo<ColumnDef<HoldRow>[]>(
    () => [
      { accessorKey: 'reasonCode', header: t('mes.quality.columns.reason', 'Reason') },
      {
        id: 'target',
        header: t('mes.quality.columns.target', 'Target'),
        cell: ({ row }) => (
          <Link href={MES_ROUTES.workOrder(row.original.targetId)} className="text-primary hover:underline text-xs">
            {row.original.targetId.slice(0, 8)}…
          </Link>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Button type="button" size="sm" variant="outline" onClick={() => void handleReleaseHold(row.original.id)}>
            {t('mes.quality.release', 'Release')}
          </Button>
        ),
      },
    ],
    [t],
  )

  const downtimeColumns = React.useMemo<ColumnDef<DowntimeRow>[]>(
    () => [
      { accessorKey: 'workCenterCode', header: t('mes.quality.columns.workCenter', 'Work center') },
      { accessorKey: 'reasonLabel', header: t('mes.quality.columns.reason', 'Reason') },
      {
        id: 'actions',
        cell: ({ row }) =>
          !row.original.endedAt ? (
            <Button type="button" size="sm" variant="outline" onClick={() => void handleEndDowntime(row.original.id)}>
              {t('mes.quality.endDowntime', 'End')}
            </Button>
          ) : null,
      },
    ],
    [t],
  )

  return (
    <Page>
      <MesShell>
        <PageHeader
          title={t('mes.quality.title', 'Quality & downtime')}
          description={t('mes.quality.description', 'Holds, checklists, and work center downtime (Phase D).')}
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link href={MES_ROUTES.pulse}>{t('mes.quality.openPulse', 'Pulse board')}</Link>
            </Button>
          }
        />
        <PageBody className="space-y-8">
          <section className="space-y-3 rounded-lg border p-4">
            <h2 className="text-sm font-medium">{t('mes.quality.holdsTitle', 'Quality holds')}</h2>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="space-y-1">
                <Label>{t('mes.quality.workOrderId', 'Work order ID')}</Label>
                <Input value={holdForm.targetId} onChange={(e) => setHoldForm((s) => ({ ...s, targetId: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>{t('mes.quality.reasonCode', 'Reason code')}</Label>
                <Input value={holdForm.reasonCode} onChange={(e) => setHoldForm((s) => ({ ...s, reasonCode: e.target.value }))} />
              </div>
              <div className="space-y-1 sm:col-span-1 flex items-end">
                <Button type="button" size="sm" onClick={() => void handleCreateHold()}>
                  {t('mes.quality.createHold', 'Place hold')}
                </Button>
              </div>
            </div>
            <DataTable
              columns={holdColumns}
              data={holds}
              isLoading={loading}
              embedded
              emptyState={t('mes.quality.noHolds', 'No active holds.')}
            />
          </section>

          <section className="space-y-3 rounded-lg border p-4">
            <h2 className="text-sm font-medium">{t('mes.quality.downtimeTitle', 'Downtime')}</h2>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="space-y-1">
                <Label>{t('mes.quality.columns.workCenter', 'Work center')}</Label>
                <Input
                  value={downtimeForm.workCenterCode}
                  onChange={(e) => setDowntimeForm((s) => ({ ...s, workCenterCode: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>{t('mes.quality.reasonCode', 'Reason code')}</Label>
                <Input
                  value={downtimeForm.reasonCode}
                  onChange={(e) => setDowntimeForm((s) => ({ ...s, reasonCode: e.target.value }))}
                />
              </div>
              <div className="space-y-1 flex items-end">
                <Button type="button" size="sm" onClick={() => void handleStartDowntime()}>
                  {t('mes.quality.startDowntime', 'Start downtime')}
                </Button>
              </div>
            </div>
            <DataTable
              columns={downtimeColumns}
              data={downtime}
              isLoading={loading}
              embedded
              emptyState={t('mes.quality.noDowntime', 'No active downtime.')}
            />
          </section>

          <section className="space-y-3 rounded-lg border p-4">
            <h2 className="text-sm font-medium">{t('mes.quality.templatesTitle', 'Checklist templates')}</h2>
            <div className="grid gap-2 sm:grid-cols-3">
              <Input
                placeholder={t('mes.quality.templateCode', 'Code')}
                value={templateForm.code}
                onChange={(e) => setTemplateForm((s) => ({ ...s, code: e.target.value }))}
              />
              <Input
                placeholder={t('mes.quality.templateName', 'Name')}
                value={templateForm.name}
                onChange={(e) => setTemplateForm((s) => ({ ...s, name: e.target.value }))}
              />
              <Button type="button" size="sm" onClick={() => void handleCreateTemplate()}>
                {t('mes.quality.createTemplate', 'Add template')}
              </Button>
            </div>
            {templates.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t('mes.quality.noTemplates', 'No templates yet.')}</p>
            ) : (
              <ul className="text-sm space-y-1">
                {templates.map((tpl) => (
                  <li key={tpl.id}>
                    <span className="font-medium">{tpl.code}</span> — {tpl.name}
                    {tpl.productCode ? ` · ${tpl.productCode}` : ''} ({tpl.items.length}{' '}
                    {t('mes.quality.items', 'items')})
                  </li>
                ))}
              </ul>
            )}
          </section>
        </PageBody>
      </MesShell>
    </Page>
  )
}
