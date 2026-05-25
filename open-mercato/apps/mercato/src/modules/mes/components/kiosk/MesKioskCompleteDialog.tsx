"use client"

import { Button } from '@open-mercato/ui/primitives/button'
import { useT } from '@open-mercato/shared/lib/i18n/context'

type MesKioskCompleteDialogProps = {
  open: boolean
  operationName: string
  onConfirm: () => void
  onCancel: () => void
}

export function MesKioskCompleteDialog({
  open,
  operationName,
  onConfirm,
  onCancel,
}: MesKioskCompleteDialogProps) {
  const t = useT()
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[105] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-card border-2 p-6 space-y-4 text-center">
        <h3 className="text-xl font-bold">{t('mes.kiosk.confirmCompleteTitle', 'Complete step?')}</h3>
        <p className="text-muted-foreground">{operationName}</p>
        <p className="text-sm text-amber-700 dark:text-amber-400">{t('mes.kiosk.confirmCompleteHint', 'Demo only — no MES update.')}</p>
        <div className="flex flex-col gap-2">
          <Button type="button" className="min-h-14 text-lg" onClick={onConfirm}>
            {t('mes.kiosk.completeDemo', 'Complete (demo)')}
          </Button>
          <Button type="button" variant="outline" className="min-h-12" onClick={onCancel}>
            {t('mes.rawMaterials.cancel', 'Cancel')}
          </Button>
        </div>
      </div>
    </div>
  )
}
