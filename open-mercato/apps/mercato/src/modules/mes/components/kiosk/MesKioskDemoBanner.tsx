"use client"

import { AlertTriangle } from 'lucide-react'
import { useT } from '@open-mercato/shared/lib/i18n/context'

export function MesKioskDemoBanner() {
  const t = useT()
  return (
    <div
      role="alert"
      className="bg-amber-400 text-amber-950 px-4 py-3 text-center font-semibold text-base md:text-lg border-b border-amber-600"
    >
      <span className="inline-flex items-center justify-center gap-2">
        <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden />
        {t('mes.kiosk.demoBanner', 'DEMO MODE — actions do not update production / MES')}
      </span>
    </div>
  )
}
