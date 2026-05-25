"use client"

import * as React from 'react'
import { Button } from '@open-mercato/ui/primitives/button'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { isKioskOnboardingDone, markKioskOnboardingDone } from '../../lib/kiosk-planning-view-model'

const STEPS = [
  { titleKey: 'mes.kiosk.onboard1Title', titleFb: 'This is your nest terminal', bodyKey: 'mes.kiosk.onboard1Body', bodyFb: 'You see one work center. Operations come from the production plan only.' },
  { titleKey: 'mes.kiosk.onboard2Title', titleFb: 'Do this now', bodyKey: 'mes.kiosk.onboard2Body', bodyFb: 'Start and complete the highlighted step. Buttons are demo — nothing is sent to MES.' },
  { titleKey: 'mes.kiosk.onboard3Title', titleFb: 'Materials & scan', bodyKey: 'mes.kiosk.onboard3Body', bodyFb: 'Order raw materials from the card. Scan barcodes at the bottom of the screen.' },
] as const

export function MesKioskOnboarding() {
  const t = useT()
  const [open, setOpen] = React.useState(() => !isKioskOnboardingDone())
  const [step, setStep] = React.useState(0)

  if (!open) return null

  const current = STEPS[step]!
  const done = () => {
    markKioskOnboardingDone()
    setOpen(false)
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4">
      <div className="max-w-md w-full rounded-2xl bg-card border-2 p-6 space-y-4 shadow-2xl">
        <p className="text-xs font-medium text-muted-foreground">
          {t('mes.kiosk.onboardProgress', 'Step {n} of {total}', { n: String(step + 1), total: String(STEPS.length) })}
        </p>
        <h2 className="text-2xl font-bold">{t(current.titleKey, current.titleFb)}</h2>
        <p className="text-muted-foreground">{t(current.bodyKey, current.bodyFb)}</p>
        <div className="flex gap-2 pt-2">
          {step > 0 ? (
            <Button type="button" variant="outline" className="flex-1 min-h-12" onClick={() => setStep((s) => s - 1)}>
              {t('mes.kiosk.onboardBack', 'Back')}
            </Button>
          ) : null}
          {step < STEPS.length - 1 ? (
            <Button type="button" className="flex-1 min-h-12" onClick={() => setStep((s) => s + 1)}>
              {t('mes.kiosk.onboardNext', 'Next')}
            </Button>
          ) : (
            <Button type="button" className="flex-1 min-h-12" onClick={done}>
              {t('mes.kiosk.onboardDone', 'Start work')}
            </Button>
          )}
        </div>
        <Button type="button" variant="ghost" size="sm" className="w-full" onClick={done}>
          {t('mes.kiosk.onboardSkip', 'Skip')}
        </Button>
      </div>
    </div>
  )
}
