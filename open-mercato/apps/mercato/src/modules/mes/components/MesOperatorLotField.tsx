"use client"

import * as React from 'react'
import { Input } from '@open-mercato/ui/primitives/input'
import { Label } from '@open-mercato/ui/primitives/label'
import { useT } from '@open-mercato/shared/lib/i18n/context'

type MesOperatorLotFieldProps = {
  lotNumber: string
  consumeQty: string
  onLotNumberChange: (value: string) => void
  onConsumeQtyChange: (value: string) => void
  kiosk?: boolean
}

export function MesOperatorLotField({
  lotNumber,
  consumeQty,
  onLotNumberChange,
  onConsumeQtyChange,
  kiosk = false,
}: MesOperatorLotFieldProps) {
  const t = useT()

  return (
    <div className={`grid gap-2 sm:grid-cols-2 ${kiosk ? 'text-base' : ''}`}>
      <div className="space-y-1">
        <Label htmlFor="mes-op-lot">{t('mes.operator.lotNumber', 'Component lot (optional)')}</Label>
        <Input
          id="mes-op-lot"
          value={lotNumber}
          onChange={(e) => onLotNumberChange(e.target.value)}
          placeholder={t('mes.operator.lotPlaceholder', 'LOT-…')}
          className={kiosk ? 'h-12 font-mono' : 'font-mono'}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="mes-op-consume-qty">{t('mes.operator.consumeQty', 'Consume qty')}</Label>
        <Input
          id="mes-op-consume-qty"
          type="number"
          min={1}
          value={consumeQty}
          onChange={(e) => onConsumeQtyChange(e.target.value)}
          className={kiosk ? 'h-12' : ''}
        />
      </div>
    </div>
  )
}
