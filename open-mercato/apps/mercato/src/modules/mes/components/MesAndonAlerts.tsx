"use client"

import { Alert, AlertDescription, AlertTitle } from '@open-mercato/ui/primitives/alert'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import type { AndonAlert } from '../lib/pulse-escalation'

type MesAndonAlertsProps = {
  alerts: AndonAlert[]
  escalationLevel: 0 | 1 | 2 | 3
}

function alertVariant(level: AndonAlert['level']): 'default' | 'destructive' {
  return level === 'critical' ? 'destructive' : 'default'
}

export function MesAndonAlerts({ alerts, escalationLevel }: MesAndonAlertsProps) {
  const t = useT()

  if (alerts.length === 0) return null

  return (
    <section className="space-y-2" aria-label={t('mes.pulse.alertsTitle', 'Andon alerts')}>
      {escalationLevel >= 3 ? (
        <p className="text-xs font-medium text-destructive uppercase tracking-wide">
          {t('mes.pulse.escalation.critical', 'Level 3 — immediate action')}
        </p>
      ) : escalationLevel >= 2 ? (
        <p className="text-xs font-medium text-amber-700 dark:text-amber-300 uppercase tracking-wide">
          {t('mes.pulse.escalation.warning', 'Level 2 — supervisor attention')}
        </p>
      ) : null}
      {alerts.map((alert) => (
        <Alert key={alert.code} variant={alertVariant(alert.level)}>
          <AlertTitle>{alert.code.replace(/_/g, ' ')}</AlertTitle>
          <AlertDescription>
            {t(alert.messageKey, alert.messageFallback, alert.params)}
          </AlertDescription>
        </Alert>
      ))}
    </section>
  )
}
