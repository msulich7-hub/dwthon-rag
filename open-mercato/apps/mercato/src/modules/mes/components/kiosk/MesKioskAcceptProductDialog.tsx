"use client"

import * as React from 'react'
import { Button } from '@open-mercato/ui/primitives/button'
import { Input } from '@open-mercato/ui/primitives/input'
import { Label } from '@open-mercato/ui/primitives/label'
import { useT } from '@open-mercato/shared/lib/i18n/context'

export type KioskAcceptProductSource = 'previous_nest' | 'warehouse' | 'supplier'

export type KioskAcceptProductPayload = {
  qty: number
  lotNumber: string
  source: KioskAcceptProductSource
  visualOk: boolean
  docMatch: boolean
}

const SOURCES: { id: KioskAcceptProductSource; labelKey: string; fallback: string }[] = [
  { id: 'previous_nest', labelKey: 'mes.kiosk.acceptSourcePrev', fallback: 'From previous nest' },
  { id: 'warehouse', labelKey: 'mes.kiosk.acceptSourceWh', fallback: 'Warehouse / WIP store' },
  { id: 'supplier', labelKey: 'mes.kiosk.acceptSourceSup', fallback: 'Supplier delivery' },
]

type MesKioskAcceptProductDialogProps = {
  open: boolean
  productCode: string
  orderNumber: string
  onClose: () => void
  onSubmit: (payload: KioskAcceptProductPayload) => void
}

export function MesKioskAcceptProductDialog({
  open,
  productCode,
  orderNumber,
  onClose,
  onSubmit,
}: MesKioskAcceptProductDialogProps) {
  const t = useT()
  const [qty, setQty] = React.useState('1')
  const [lotNumber, setLotNumber] = React.useState('')
  const [source, setSource] = React.useState<KioskAcceptProductSource>('previous_nest')
  const [visualOk, setVisualOk] = React.useState(true)
  const [docMatch, setDocMatch] = React.useState(true)

  React.useEffect(() => {
    if (!open) return
    setQty('1')
    setLotNumber('')
    setSource('previous_nest')
    setVisualOk(true)
    setDocMatch(true)
  }, [open])

  if (!open) return null

  const handleSubmit = () => {
    const parsed = Math.max(1, parseInt(qty, 10) || 0)
    if (!lotNumber.trim()) return
    onSubmit({
      qty: parsed,
      lotNumber: lotNumber.trim(),
      source,
      visualOk,
      docMatch,
    })
  }

  return (
    <div
      className="fixed inset-0 z-[105] flex items-end sm:items-center justify-center bg-black/50 p-4"
      data-testid="mes-kiosk-accept-dialog"
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-card border-2 p-5 space-y-4">
        <div>
          <h3 className="text-xl font-bold">{t('mes.kiosk.acceptTitle', 'Accept product at nest')}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {orderNumber} · {productCode}
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-2">
            {t('mes.kiosk.acceptHint', 'Demo — receipt before processing: qty, lot, source, visual check.')}
          </p>
        </div>

        <div className="space-y-1">
          <Label htmlFor="mes-kiosk-accept-qty">{t('mes.kiosk.acceptQty', 'Quantity received')}</Label>
          <Input
            id="mes-kiosk-accept-qty"
            data-testid="mes-kiosk-accept-qty"
            type="number"
            min={1}
            inputMode="numeric"
            className="h-12 text-lg"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="mes-kiosk-accept-lot">{t('mes.kiosk.acceptLot', 'Lot / pallet label (scan)')}</Label>
          <Input
            id="mes-kiosk-accept-lot"
            data-testid="mes-kiosk-accept-lot"
            className="h-12 font-mono text-lg"
            placeholder={t('mes.kiosk.acceptLotPh', 'Scan or enter LOT-…')}
            value={lotNumber}
            onChange={(e) => setLotNumber(e.target.value)}
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label>{t('mes.kiosk.acceptSource', 'Where did the product come from?')}</Label>
          <div className="grid gap-2">
            {SOURCES.map((s) => (
              <Button
                key={s.id}
                type="button"
                variant={source === s.id ? 'default' : 'outline'}
                className="min-h-12 justify-start"
                data-testid={`mes-kiosk-accept-source-${s.id}`}
                onClick={() => setSource(s.id)}
              >
                {t(s.labelKey, s.fallback)}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t('mes.kiosk.acceptVisual', 'Visual condition OK (no damage)?')}</Label>
          <div className="flex gap-2" data-testid="mes-kiosk-accept-visual">
            <Button
              type="button"
              variant={visualOk ? 'default' : 'outline'}
              className="flex-1 min-h-12"
              onClick={() => setVisualOk(true)}
            >
              {t('mes.kiosk.yes', 'Yes')}
            </Button>
            <Button
              type="button"
              variant={!visualOk ? 'default' : 'outline'}
              className="flex-1 min-h-12"
              onClick={() => setVisualOk(false)}
            >
              {t('mes.kiosk.no', 'No')}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t('mes.kiosk.acceptDoc', 'Matches work order / routing document?')}</Label>
          <div className="flex gap-2" data-testid="mes-kiosk-accept-doc">
            <Button
              type="button"
              variant={docMatch ? 'default' : 'outline'}
              className="flex-1 min-h-12"
              onClick={() => setDocMatch(true)}
            >
              {t('mes.kiosk.yes', 'Yes')}
            </Button>
            <Button
              type="button"
              variant={!docMatch ? 'default' : 'outline'}
              className="flex-1 min-h-12"
              onClick={() => setDocMatch(false)}
            >
              {t('mes.kiosk.no', 'No')}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <Button
            type="button"
            className="min-h-14 text-lg"
            data-testid="mes-kiosk-accept-submit"
            onClick={handleSubmit}
          >
            {t('mes.kiosk.acceptSubmit', 'Confirm receipt (demo)')}
          </Button>
          <Button type="button" variant="outline" className="min-h-12" onClick={onClose}>
            {t('mes.rawMaterials.cancel', 'Cancel')}
          </Button>
        </div>
      </div>
    </div>
  )
}
