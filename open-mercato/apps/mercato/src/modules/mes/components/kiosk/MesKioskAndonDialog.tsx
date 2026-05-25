"use client"

import { Button } from '@open-mercato/ui/primitives/button'
import { useT } from '@open-mercato/shared/lib/i18n/context'

export type AndonReason = 'missing_material' | 'machine' | 'quality'

const REASONS: { id: AndonReason; labelKey: string; fallback: string }[] = [
  { id: 'missing_material', labelKey: 'mes.kiosk.andonMaterial', fallback: 'Missing material' },
  { id: 'machine', labelKey: 'mes.kiosk.andonMachine', fallback: 'Machine / downtime' },
  { id: 'quality', labelKey: 'mes.kiosk.andonQuality', fallback: 'Quality issue' },
]

type MesKioskAndonDialogProps = {
  open: boolean
  onClose: () => void
  onSubmit: (reason: AndonReason) => void
}

export function MesKioskAndonDialog({ open, onClose, onSubmit }: MesKioskAndonDialogProps) {
  const t = useT()
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[105] flex items-end sm:items-center justify-center bg-black/50 p-4" data-testid="mes-kiosk-andon-dialog">
      <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-card border p-5 space-y-3">
        <h3 className="text-lg font-semibold">{t('mes.kiosk.andonPick', 'Report issue (demo)')}</h3>
        <div className="grid gap-2">
          {REASONS.map((r) => (
            <Button
              key={r.id}
              type="button"
              variant="outline"
              className="min-h-14 justify-start text-base"
              onClick={() => onSubmit(r.id)}
              data-testid={`mes-kiosk-andon-${r.id}`}
            >
              {t(r.labelKey, r.fallback)}
            </Button>
          ))}
        </div>
        <Button type="button" variant="ghost" className="w-full" onClick={onClose}>
          {t('mes.rawMaterials.cancel', 'Cancel')}
        </Button>
      </div>
    </div>
  )
}
