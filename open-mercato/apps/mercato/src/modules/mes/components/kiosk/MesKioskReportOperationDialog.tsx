"use client"

import * as React from 'react'
import { Button } from '@open-mercato/ui/primitives/button'
import { Input } from '@open-mercato/ui/primitives/input'
import { Label } from '@open-mercato/ui/primitives/label'
import { Textarea } from '@open-mercato/ui/primitives/textarea'
import { useT } from '@open-mercato/shared/lib/i18n/context'

export type KioskOperationReportPayload = {
  confirmationType: 'partial' | 'complete'
  goodQty: number
  scrapQty: number
  lotNumber: string
  qualityOk: boolean
  bomVerified: boolean
  notes: string
}

type MesKioskReportOperationDialogProps = {
  open: boolean
  operationName: string
  orderNumber: string
  defaultGoodQty?: number
  onClose: () => void
  onSubmit: (payload: KioskOperationReportPayload) => void
}

function YesNoToggle({
  value,
  onChange,
  yesLabel,
  noLabel,
  testId,
}: {
  value: boolean
  onChange: (v: boolean) => void
  yesLabel: string
  noLabel: string
  testId: string
}) {
  return (
    <div className="flex gap-2" data-testid={testId}>
      <Button
        type="button"
        variant={value ? 'default' : 'outline'}
        className="flex-1 min-h-12"
        onClick={() => onChange(true)}
        data-testid={`${testId}-yes`}
      >
        {yesLabel}
      </Button>
      <Button
        type="button"
        variant={!value ? 'default' : 'outline'}
        className="flex-1 min-h-12"
        onClick={() => onChange(false)}
        data-testid={`${testId}-no`}
      >
        {noLabel}
      </Button>
    </div>
  )
}

export function MesKioskReportOperationDialog({
  open,
  operationName,
  orderNumber,
  defaultGoodQty = 1,
  onClose,
  onSubmit,
}: MesKioskReportOperationDialogProps) {
  const t = useT()
  const [confirmationType, setConfirmationType] = React.useState<'partial' | 'complete'>('partial')
  const [goodQty, setGoodQty] = React.useState(String(defaultGoodQty))
  const [scrapQty, setScrapQty] = React.useState('0')
  const [lotNumber, setLotNumber] = React.useState('')
  const [qualityOk, setQualityOk] = React.useState(true)
  const [bomVerified, setBomVerified] = React.useState(true)
  const [notes, setNotes] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setConfirmationType('partial')
    setGoodQty(String(defaultGoodQty))
    setScrapQty('0')
    setLotNumber('')
    setQualityOk(true)
    setBomVerified(true)
    setNotes('')
  }, [open, defaultGoodQty])

  if (!open) return null

  const handleSubmit = () => {
    const good = Math.max(0, parseInt(goodQty, 10) || 0)
    const scrap = Math.max(0, parseInt(scrapQty, 10) || 0)
    if (good + scrap <= 0) return
    onSubmit({
      confirmationType,
      goodQty: good,
      scrapQty: scrap,
      lotNumber: lotNumber.trim(),
      qualityOk,
      bomVerified,
      notes: notes.trim(),
    })
  }

  return (
    <div
      className="fixed inset-0 z-[105] flex items-end sm:items-center justify-center bg-black/50 p-4"
      data-testid="mes-kiosk-report-dialog"
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-card border-2 p-5 space-y-4">
        <div>
          <h3 className="text-xl font-bold">{t('mes.kiosk.reportOpTitle', 'Report operation')}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {orderNumber} · {operationName}
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-2">
            {t('mes.kiosk.reportOpHint', 'Demo — captures good/scrap qty, lot traceability, and quality checks.')}
          </p>
        </div>

        <div className="space-y-2">
          <Label>{t('mes.kiosk.reportOpType', 'Report type')}</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={confirmationType === 'partial' ? 'default' : 'outline'}
              className="flex-1 min-h-12"
              data-testid="mes-kiosk-report-type-partial"
              onClick={() => setConfirmationType('partial')}
            >
              {t('mes.kiosk.reportOpPartial', 'Partial output')}
            </Button>
            <Button
              type="button"
              variant={confirmationType === 'complete' ? 'default' : 'outline'}
              className="flex-1 min-h-12"
              data-testid="mes-kiosk-report-type-complete"
              onClick={() => setConfirmationType('complete')}
            >
              {t('mes.kiosk.reportOpCompleteStep', 'Close step')}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="mes-kiosk-report-good">{t('mes.kiosk.reportOpGoodQty', 'Good quantity')}</Label>
            <Input
              id="mes-kiosk-report-good"
              data-testid="mes-kiosk-report-good-qty"
              type="number"
              min={0}
              inputMode="numeric"
              className="h-12 text-lg"
              value={goodQty}
              onChange={(e) => setGoodQty(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="mes-kiosk-report-scrap">{t('mes.kiosk.reportOpScrapQty', 'Scrap quantity')}</Label>
            <Input
              id="mes-kiosk-report-scrap"
              data-testid="mes-kiosk-report-scrap-qty"
              type="number"
              min={0}
              inputMode="numeric"
              className="h-12 text-lg"
              value={scrapQty}
              onChange={(e) => setScrapQty(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="mes-kiosk-report-lot">{t('mes.kiosk.reportOpLot', 'Output lot / label (traceability)')}</Label>
          <Input
            id="mes-kiosk-report-lot"
            data-testid="mes-kiosk-report-lot"
            className="h-12 font-mono"
            placeholder={t('mes.operator.lotPlaceholder', 'LOT-…')}
            value={lotNumber}
            onChange={(e) => setLotNumber(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>{t('mes.kiosk.reportOpQuality', 'Quality check passed?')}</Label>
          <YesNoToggle
            value={qualityOk}
            onChange={setQualityOk}
            yesLabel={t('mes.kiosk.yes', 'Yes')}
            noLabel={t('mes.kiosk.no', 'No')}
            testId="mes-kiosk-report-quality"
          />
        </div>

        <div className="space-y-2">
          <Label>{t('mes.kiosk.reportOpBom', 'Materials match BOM / work instruction?')}</Label>
          <YesNoToggle
            value={bomVerified}
            onChange={setBomVerified}
            yesLabel={t('mes.kiosk.yes', 'Yes')}
            noLabel={t('mes.kiosk.no', 'No')}
            testId="mes-kiosk-report-bom"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="mes-kiosk-report-notes">{t('mes.kiosk.reportOpNotes', 'Notes (downtime, rework, deviation)')}</Label>
          <Textarea
            id="mes-kiosk-report-notes"
            data-testid="mes-kiosk-report-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('mes.kiosk.reportOpNotesPh', 'Optional — e.g. tool change, minor stop')}
          />
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <Button
            type="button"
            className="min-h-14 text-lg"
            data-testid="mes-kiosk-report-submit"
            onClick={handleSubmit}
          >
            {t('mes.kiosk.reportOpSubmit', 'Save report (demo)')}
          </Button>
          <Button type="button" variant="outline" className="min-h-12" onClick={onClose}>
            {t('mes.rawMaterials.cancel', 'Cancel')}
          </Button>
        </div>
      </div>
    </div>
  )
}
