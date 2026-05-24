"use client"

import * as React from 'react'
import { apiCall, readApiResultOrThrow } from '@open-mercato/ui/backend/utils/apiCall'
import { flash } from '@open-mercato/ui/backend/FlashMessages'
import { Button } from '@open-mercato/ui/primitives/button'
import { Label } from '@open-mercato/ui/primitives/label'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import type { MesOperationStep } from './MesOperationStepper'
import { MesOperationStepper } from './MesOperationStepper'

type RoutingTemplate = {
  id: string
  code: string
  name: string
  productCode: string
}

type OperationsResponse = {
  workOrderId: string
  operations: MesOperationStep[]
}

type TemplatesResponse = {
  templates: RoutingTemplate[]
}

type ReleaseRoutingPanelProps = {
  workOrderId: string
  productCode: string
  onReleased?: () => void
}

export function ReleaseRoutingPanel({ workOrderId, productCode, onReleased }: ReleaseRoutingPanelProps) {
  const t = useT()
  const [operations, setOperations] = React.useState<MesOperationStep[]>([])
  const [templates, setTemplates] = React.useState<RoutingTemplate[]>([])
  const [templateId, setTemplateId] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [releasing, setReleasing] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const [opsPayload, tplPayload] = await Promise.all([
        readApiResultOrThrow<OperationsResponse>(
          `/api/mes/work-orders/${encodeURIComponent(workOrderId)}/operations`,
        ),
        readApiResultOrThrow<TemplatesResponse>(
          `/api/mes/routing-templates?productCode=${encodeURIComponent(productCode)}&isActive=true`,
        ),
      ])
      setOperations(opsPayload.operations ?? [])
      const list = tplPayload.templates ?? []
      setTemplates(list)
      setTemplateId((prev) => prev || list[0]?.id || '')
    } catch {
      flash(t('mes.release.loadError', 'Failed to load routing data'), 'error')
    } finally {
      setLoading(false)
    }
  }, [productCode, t, workOrderId])

  React.useEffect(() => {
    void load()
  }, [load])

  const handleRelease = async () => {
    setReleasing(true)
    try {
      const call = await apiCall<{ error?: string }>(
        `/api/mes/work-orders/${encodeURIComponent(workOrderId)}/operations/apply-routing`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(templateId ? { routingTemplateId: templateId } : {}),
        },
      )
      if (!call.ok) {
        const message =
          typeof call.result === 'object' && call.result && 'error' in call.result
            ? String((call.result as { error: string }).error)
            : t('mes.release.error', 'Could not release routing')
        flash(message, 'error')
        return
      }
      flash(t('mes.release.success', 'Routing released to shop floor'), 'success')
      await load()
      onReleased?.()
    } catch {
      flash(t('mes.release.error', 'Could not release routing'), 'error')
    } finally {
      setReleasing(false)
    }
  }

  if (loading) {
    return <p className="text-xs text-muted-foreground">{t('mes.release.loading', 'Loading routing…')}</p>
  }

  if (operations.length > 0) {
    return <MesOperationStepper operations={operations} compact />
  }

  return (
    <div className="rounded-md border bg-muted/20 p-3 space-y-3">
      <p className="text-xs text-muted-foreground">
        {t('mes.release.hint', 'Release a routing template to create shop-floor operations.')}
      </p>
      {templates.length === 0 ? (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          {t('mes.release.noTemplate', 'No active routing for product {code}.', { code: productCode })}
        </p>
      ) : (
        <>
          <div className="space-y-1">
            <Label htmlFor={`mes-routing-${workOrderId}`}>{t('mes.release.template', 'Routing template')}</Label>
            <select
              id={`mes-routing-${workOrderId}`}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
            >
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.code} — {tpl.name}
                </option>
              ))}
            </select>
          </div>
          <Button type="button" size="sm" disabled={releasing || !templateId} onClick={() => void handleRelease()}>
            {t('mes.release.action', 'Release routing')}
          </Button>
        </>
      )}
    </div>
  )
}
