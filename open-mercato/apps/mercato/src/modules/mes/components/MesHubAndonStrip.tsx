"use client"

import * as React from 'react'
import Link from 'next/link'
import { readApiResultOrThrow } from '@open-mercato/ui/backend/utils/apiCall'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { andonLevelClass } from '../lib/status-styles'
import { MES_ROUTES } from '../lib/mes-routes'

type PulseMini = {
  andon: 'green' | 'amber' | 'red'
  escalationLevel: number
  queue: { ready: number; inProgress: number }
}

type PulseResponse = { pulse: PulseMini }

export function MesHubAndonStrip() {
  const t = useT()
  const [pulse, setPulse] = React.useState<PulseMini | null>(null)

  React.useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const payload = await readApiResultOrThrow<PulseResponse>('/api/mes/pulse')
        if (!cancelled) setPulse(payload.pulse)
      } catch {
        if (!cancelled) setPulse(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!pulse) return null

  const label =
    pulse.andon === 'green'
      ? t('mes.hub.andon.green', 'Shop floor: Normal')
      : pulse.andon === 'amber'
        ? t('mes.hub.andon.amber', 'Shop floor: Attention')
        : t('mes.hub.andon.red', 'Shop floor: Critical')

  return (
    <Link
      href={MES_ROUTES.pulse}
      className={`block rounded-lg border-2 px-4 py-3 transition-opacity hover:opacity-90 ${andonLevelClass(pulse.andon)}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-sm">{label}</span>
        <span className="text-xs opacity-80">
          {t('mes.hub.andon.stats', '{ready} ready · {active} active · L{level}', {
            ready: pulse.queue.ready,
            active: pulse.queue.inProgress,
            level: pulse.escalationLevel,
          })}
        </span>
      </div>
    </Link>
  )
}
