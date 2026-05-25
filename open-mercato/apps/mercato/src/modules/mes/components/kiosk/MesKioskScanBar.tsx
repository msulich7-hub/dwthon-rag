"use client"

import { MesScanField } from '../MesScanField'
import { useT } from '@open-mercato/shared/lib/i18n/context'

type MesKioskScanBarProps = {
  onScan: (value: string) => void
}

export function MesKioskScanBar({ onScan }: MesKioskScanBarProps) {
  const t = useT()
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t-2 border-foreground/20 bg-card shadow-[0_-8px_24px_rgba(0,0,0,0.12)] px-4 py-4 md:px-8">
      <div className="max-w-4xl mx-auto">
        <MesScanField kiosk autoFocus onScan={onScan} />
        <p className="text-xs text-muted-foreground mt-2 text-center">
          {t('mes.operator.kioskScanHint', 'Scan auto-starts or completes the matched operation.')}
        </p>
      </div>
    </div>
  )
}
