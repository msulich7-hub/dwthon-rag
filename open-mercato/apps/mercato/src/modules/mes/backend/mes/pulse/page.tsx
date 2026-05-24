"use client"

import * as React from 'react'
import Link from 'next/link'
import { Page, PageBody, PageHeader } from '@open-mercato/ui/backend/Page'
import { Button } from '@open-mercato/ui/primitives/button'
import { readApiResultOrThrow } from '@open-mercato/ui/backend/utils/apiCall'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { MesShell } from '../../../components/MesShell'
import { MesKpiSkeleton } from '../../../components/MesKpiSkeleton'
import { andonLevelClass } from '../../../lib/status-styles'
import { MES_ROUTES } from '../../../lib/mes-routes'

type PulseSnapshot = {
  dashboard: { total: number; active: number; completed: number }
  queue: { ready: number; inProgress: number; total: number }
  workCenters: { workCenterCode: string; ready: number; inProgress: number }[]
  andon: 'green' | 'amber' | 'red'
  generatedAt: string
}

type PulseResponse = { pulse: PulseSnapshot }

const POLL_MS = 15_000

export default function MesPulsePage() {
  const t = useT()
  const [pulse, setPulse] = React.useState<PulseSnapshot | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)

  const load = React.useCallback(async () => {
    try {
      const payload = await readApiResultOrThrow<PulseResponse>('/api/mes/pulse')
      setPulse(payload.pulse)
      setError(null)
    } catch {
      setError(t('mes.pulse.loadError', 'Failed to load pulse board'))
    } finally {
      setLoading(false)
    }
  }, [t])

  React.useEffect(() => {
    void load()
    const timer = window.setInterval(() => void load(), POLL_MS)
    return () => window.clearInterval(timer)
  }, [load])

  const andonLabel =
    pulse?.andon === 'green'
      ? t('mes.pulse.andon.green', 'Normal')
      : pulse?.andon === 'amber'
        ? t('mes.pulse.andon.amber', 'Attention')
        : t('mes.pulse.andon.red', 'Critical')

  return (
    <Page>
      <MesShell>
        <PageHeader
          title={t('mes.pulse.title', 'Pulse board')}
          description={t('mes.pulse.description', 'Live manufacturing KPIs and Andon status — refreshes every 15s.')}
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link href={MES_ROUTES.operator}>{t('mes.pulse.openOperator', 'Operator queue')}</Link>
            </Button>
          }
        />
        <PageBody className="space-y-6">
          {error ? <div className="text-sm text-destructive">{error}</div> : null}

          {loading && !pulse ? <MesKpiSkeleton /> : null}

          {pulse ? (
            <>
              <div
                className={`rounded-xl border-2 p-6 text-center ${andonLevelClass(pulse.andon)}`}
                role="status"
                aria-live="polite"
              >
                <div className="text-xs uppercase tracking-wide opacity-80">
                  {t('mes.pulse.andonTitle', 'Andon')}
                </div>
                <div className="text-3xl font-bold mt-1">{andonLabel}</div>
                <div className="text-xs mt-2 opacity-70">
                  {t('mes.pulse.updated', 'Updated {time}', {
                    time: new Date(pulse.generatedAt).toLocaleTimeString(),
                  })}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border p-4">
                  <div className="text-2xl font-semibold">{pulse.dashboard.active}</div>
                  <div className="text-xs text-muted-foreground">
                    {t('mes.pulse.kpi.activeWo', 'Active work orders')}
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-2xl font-semibold">{pulse.queue.inProgress}</div>
                  <div className="text-xs text-muted-foreground">
                    {t('mes.pulse.kpi.inProgress', 'Operations in progress')}
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-2xl font-semibold">{pulse.queue.ready}</div>
                  <div className="text-xs text-muted-foreground">
                    {t('mes.pulse.kpi.ready', 'Ready in queue')}
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-2xl font-semibold">{pulse.dashboard.completed}</div>
                  <div className="text-xs text-muted-foreground">
                    {t('mes.pulse.kpi.completed', 'Completed work orders')}
                  </div>
                </div>
              </div>

              <section>
                <h2 className="text-sm font-medium text-muted-foreground mb-3">
                  {t('mes.pulse.workCenters', 'By work center')}
                </h2>
                {pulse.workCenters.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t('mes.pulse.noWorkCenters', 'No queued operations.')}
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {pulse.workCenters.map((wc) => (
                      <div key={wc.workCenterCode} className="rounded-lg border p-3">
                        <div className="font-medium text-sm">
                          {wc.workCenterCode === '__unassigned__'
                            ? t('mes.pulse.unassigned', 'Unassigned')
                            : wc.workCenterCode}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {t('mes.pulse.wcStats', '{ready} ready · {active} active', {
                            ready: wc.ready,
                            active: wc.inProgress,
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          ) : null}
        </PageBody>
      </MesShell>
    </Page>
  )
}
