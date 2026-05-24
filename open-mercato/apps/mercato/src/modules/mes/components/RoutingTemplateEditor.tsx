"use client"

import * as React from 'react'
import { apiCall } from '@open-mercato/ui/backend/utils/apiCall'
import { flash } from '@open-mercato/ui/backend/FlashMessages'
import { Button } from '@open-mercato/ui/primitives/button'
import { Input } from '@open-mercato/ui/primitives/input'
import { Label } from '@open-mercato/ui/primitives/label'
import { useT } from '@open-mercato/shared/lib/i18n/context'

export type RoutingStepDraft = {
  sequence: number
  operationCode: string
  operationName: string
  workCenterCode: string
}

type RoutingTemplateEditorProps = {
  templateId?: string
  initialCode?: string
  initialName?: string
  initialProductCode?: string
  initialSteps?: RoutingStepDraft[]
  onSaved?: () => void
  onCancel?: () => void
}

const emptyStep = (sequence: number): RoutingStepDraft => ({
  sequence,
  operationCode: '',
  operationName: '',
  workCenterCode: '',
})

export function RoutingTemplateEditor({
  templateId,
  initialCode = '',
  initialName = '',
  initialProductCode = '',
  initialSteps,
  onSaved,
  onCancel,
}: RoutingTemplateEditorProps) {
  const t = useT()
  const isEdit = Boolean(templateId)
  const [code, setCode] = React.useState(initialCode)
  const [name, setName] = React.useState(initialName)
  const [productCode, setProductCode] = React.useState(initialProductCode)
  const [steps, setSteps] = React.useState<RoutingStepDraft[]>(
    initialSteps?.length ? initialSteps : [emptyStep(10), emptyStep(20)],
  )
  const [saving, setSaving] = React.useState(false)

  const updateStep = (index: number, patch: Partial<RoutingStepDraft>) => {
    setSteps((prev) => prev.map((step, i) => (i === index ? { ...step, ...patch } : step)))
  }

  const addStep = () => {
    setSteps((prev) => [...prev, emptyStep((prev.length + 1) * 10)])
  }

  const removeStep = (index: number) => {
    setSteps((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)))
  }

  const handleSave = async () => {
    const normalizedSteps = steps
      .filter((s) => s.operationCode.trim() && s.operationName.trim())
      .map((s, index) => ({
        sequence: s.sequence || (index + 1) * 10,
        operationCode: s.operationCode.trim(),
        operationName: s.operationName.trim(),
        workCenterCode: s.workCenterCode.trim() || undefined,
      }))

    if (!isEdit && (!code.trim() || !name.trim() || !productCode.trim())) {
      flash(t('mes.routing.editor.required', 'Code, name, and product are required'), 'error')
      return
    }
    if (normalizedSteps.length === 0) {
      flash(t('mes.routing.editor.stepsRequired', 'Add at least one operation step'), 'error')
      return
    }

    setSaving(true)
    try {
      if (isEdit && templateId) {
        const call = await apiCall(
          `/api/mes/routing-templates/${encodeURIComponent(templateId)}/steps`,
          {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ steps: normalizedSteps }),
          },
        )
        if (!call.ok) {
          flash(t('mes.routing.editor.saveError', 'Could not save routing'), 'error')
          return
        }
        flash(t('mes.routing.editor.updated', 'Routing steps updated'), 'success')
      } else {
        const call = await apiCall('/api/mes/routing-templates', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            code: code.trim(),
            name: name.trim(),
            productCode: productCode.trim(),
            steps: normalizedSteps,
          }),
        })
        if (!call.ok) {
          flash(t('mes.routing.editor.saveError', 'Could not save routing'), 'error')
          return
        }
        flash(t('mes.routing.editor.created', 'Routing template created'), 'success')
      }
      onSaved?.()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <h3 className="text-sm font-medium">
        {isEdit
          ? t('mes.routing.editor.editTitle', 'Edit routing steps')
          : t('mes.routing.editor.createTitle', 'New routing template')}
      </h3>

      {!isEdit ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="rt-code">{t('mes.routing.editor.code', 'Code')}</Label>
            <Input id="rt-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="RT-SKU-1001" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="rt-name">{t('mes.routing.editor.name', 'Name')}</Label>
            <Input id="rt-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="rt-product">{t('mes.routing.editor.product', 'Product code')}</Label>
            <Input id="rt-product" value={productCode} onChange={(e) => setProductCode(e.target.value)} />
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            {t('mes.routing.editor.steps', 'Operation steps')}
          </span>
          <Button type="button" variant="outline" size="sm" onClick={addStep}>
            {t('mes.routing.editor.addStep', 'Add step')}
          </Button>
        </div>
        {steps.map((step, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-5 items-end rounded-md border p-2">
            <div className="space-y-1">
              <Label className="text-xs">{t('mes.routing.editor.seq', 'Seq')}</Label>
              <Input
                type="number"
                value={step.sequence}
                onChange={(e) => updateStep(index, { sequence: Number.parseInt(e.target.value, 10) || 0 })}
              />
            </div>
            <div className="space-y-1 sm:col-span-1">
              <Label className="text-xs">{t('mes.routing.editor.opCode', 'Op. code')}</Label>
              <Input value={step.operationCode} onChange={(e) => updateStep(index, { operationCode: e.target.value })} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">{t('mes.routing.editor.opName', 'Operation')}</Label>
              <Input value={step.operationName} onChange={(e) => updateStep(index, { operationName: e.target.value })} />
            </div>
            <div className="space-y-1 flex gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">{t('mes.routing.editor.workCenter', 'Work center')}</Label>
                <Input
                  value={step.workCenterCode}
                  onChange={(e) => updateStep(index, { workCenterCode: e.target.value })}
                />
              </div>
              <Button type="button" variant="ghost" size="sm" className="mb-0.5" onClick={() => removeStep(index)}>
                ×
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={saving} onClick={() => void handleSave()}>
          {t('mes.routing.editor.save', 'Save')}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" disabled={saving} onClick={onCancel}>
            {t('mes.routing.editor.cancel', 'Cancel')}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
