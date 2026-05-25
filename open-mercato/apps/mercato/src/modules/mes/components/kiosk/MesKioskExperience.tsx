"use client"

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  CalendarClock,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  UserRound,
} from 'lucide-react'
import { Page, PageBody } from '@open-mercato/ui/backend/Page'
import { Button } from '@open-mercato/ui/primitives/button'
import { flash } from '@open-mercato/ui/backend/FlashMessages'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { MesKioskRawMaterialsHero } from '../MesKioskRawMaterialsHero'
import { MesScanField } from '../MesScanField'
import { MesStatusBadge } from '../MesStatusBadge'
import { MES_ROUTES } from '../../lib/mes-routes'
import {
  applyMockConfirmation,
  cloneOperationsForNest,
  findMockOperationByScan,
  getNestMeta,
  getNowOperation,
  getOperatorForNest,
  getTimelineForNest,
  KIOSK_MOCK_NESTS,
  resolveNestCode,
  type KioskPlannedOperation,
} from '../../lib/kiosk-planning-mock'

function formatTimeRange(startIso: string, endIso: string, locale: string): string {
  const fmt = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' })
  return `${fmt.format(new Date(startIso))} – ${fmt.format(new Date(endIso))}`
}

export function MesKioskExperience() {
  const t = useT()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const nestCode = resolveNestCode(searchParams.get('nest'))
  const nest = getNestMeta(nestCode)
  const operator = getOperatorForNest(nestCode)
  const locale = typeof navigator !== 'undefined' ? navigator.language : 'en'

  const [operations, setOperations] = React.useState<KioskPlannedOperation[]>(() =>
    cloneOperationsForNest(nestCode),
  )
  const [highlightedId, setHighlightedId] = React.useState<string | null>(null)
  const [busyId, setBusyId] = React.useState<string | null>(null)
  const [planHorizon, setPlanHorizon] = React.useState<8 | 72>(8)
  const [scanOpen, setScanOpen] = React.useState(false)
  const [queueOpen, setQueueOpen] = React.useState(false)

  React.useEffect(() => {
    setOperations(cloneOperationsForNest(nestCode))
    setHighlightedId(null)
  }, [nestCode])

  const nowOp = getNowOperation(operations)
  const timeline = getTimelineForNest(nestCode, planHorizon)

  const pushNest = React.useCallback(
    (code: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('kiosk', '1')
      params.set('nest', code)
      params.delete('live')
      router.push(`${pathname}?${params.toString()}`)
    },
    [pathname, router, searchParams],
  )

  const handleConfirm = React.useCallback(
    (op: KioskPlannedOperation, type: 'start' | 'complete') => {
      setBusyId(op.id)
      window.setTimeout(() => {
        setOperations((prev) => applyMockConfirmation(prev, op.id, type))
        setBusyId(null)
        flash(
          type === 'start'
            ? t('mes.kiosk.mockStart', 'Started (demo)')
            : t('mes.kiosk.mockComplete', 'Completed (demo)'),
          'success',
        )
      }, 280)
    },
    [t],
  )

  const handleScan = React.useCallback(
    (scan: string) => {
      const match = findMockOperationByScan(operations, scan)
      if (!match) {
        flash(t('mes.scan.notFound', 'No matching operation in queue'), 'error')
        return
      }
      setHighlightedId(match.id)
      flash(
        t('mes.scan.found', 'Found {order} — {operation}', {
          order: match.orderNumber,
          operation: match.operationName,
        }),
        'success',
      )
      if (match.status === 'ready') handleConfirm(match, 'start')
      else if (match.status === 'in_progress') handleConfirm(match, 'complete')
    },
    [handleConfirm, operations, t],
  )

  return (
    <Page>
      <div className="min-h-screen bg-background">
        <div className="border-b bg-muted/30 px-4 py-3 md:px-8">
          <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('mes.kiosk.badge', 'Planning-backed · demo data')}
              </p>
              <h1 className="text-2xl font-bold">{nest.name}</h1>
              <p className="text-sm text-muted-foreground">
                {nest.code} · {nest.line} · {t('mes.kiosk.planBatch', 'Plan {id}', { id: operations[0]?.planBatchId ?? '—' })}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href={MES_ROUTES.operator}>{t('mes.operator.exitKiosk', 'Exit kiosk')}</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`${MES_ROUTES.operator}?live=1`}>{t('mes.kiosk.liveQueue', 'Live API queue')}</Link>
              </Button>
            </div>
          </div>
        </div>

        <PageBody className="max-w-4xl mx-auto space-y-5 py-6 px-4 md:px-8">
          <section aria-label={t('mes.kiosk.nestSwitcher', 'Work centers')}>
            <p className="text-sm font-medium mb-2">{t('mes.kiosk.pickNest', 'Your nest')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {KIOSK_MOCK_NESTS.map((n) => (
                <Button
                  key={n.code}
                  type="button"
                  size="lg"
                  variant={n.code === nestCode ? 'default' : 'outline'}
                  className="min-h-[4.5rem] flex flex-col items-start gap-0.5 px-4 text-left"
                  onClick={() => pushNest(n.code)}
                >
                  <span className="text-lg font-semibold">{n.name}</span>
                  <span className="text-xs opacity-80">{n.code}</span>
                </Button>
              ))}
            </div>
          </section>

          {operator ? (
            <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UserRound className="h-6 w-6" aria-hidden />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('mes.kiosk.operatorOnNest', 'Operator on nest')}</p>
                <p className="text-lg font-semibold">{operator.displayName}</p>
                <p className="text-xs text-muted-foreground">{operator.badge}</p>
              </div>
            </div>
          ) : null}

          {nowOp ? (
            <section className="rounded-2xl border-2 border-primary bg-gradient-to-br from-primary/15 to-background p-6 shadow-lg space-y-4">
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                {t('mes.kiosk.doNow', 'Do this now')}
              </p>
              <div>
                <p className="text-2xl font-bold">{nowOp.operationName}</p>
                <p className="text-lg text-muted-foreground mt-1">
                  {nowOp.orderNumber} · {nowOp.productCode} · #{nowOp.sequence}
                </p>
                <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
                  <CalendarClock className="h-4 w-4" aria-hidden />
                  {formatTimeRange(nowOp.scheduledStart, nowOp.scheduledEnd, locale)}
                </p>
                <div className="mt-3">
                  <MesStatusBadge status={nowOp.status} kind="operation" />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">{t('mes.kiosk.materialsNeeded', 'Raw materials for this step')}</p>
                <ul className="rounded-lg border divide-y bg-background/80">
                  {nowOp.materials.map((m) => (
                    <li key={m.code} className="px-4 py-3 flex justify-between gap-2 text-base">
                      <span>
                        <span className="font-medium">{m.code}</span>
                        <span className="text-muted-foreground"> — {m.name}</span>
                      </span>
                      {m.hint ? <span className="text-xs text-muted-foreground shrink-0">{m.hint}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-wrap gap-3">
                {nowOp.status === 'ready' ? (
                  <Button
                    size="lg"
                    className="min-h-16 flex-1 text-xl"
                    disabled={busyId === nowOp.id}
                    onClick={() => handleConfirm(nowOp, 'start')}
                  >
                    {t('mes.operator.start', 'Start')}
                  </Button>
                ) : null}
                {nowOp.status === 'in_progress' ? (
                  <Button
                    size="lg"
                    className="min-h-16 flex-1 text-xl"
                    disabled={busyId === nowOp.id}
                    onClick={() => handleConfirm(nowOp, 'complete')}
                  >
                    {t('mes.operator.complete', 'Complete')}
                  </Button>
                ) : null}
              </div>
            </section>
          ) : (
            <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
              {t('mes.kiosk.noNow', 'No active step — check the plan below.')}
            </div>
          )}

          <MesKioskRawMaterialsHero workOrderId={nowOp?.workOrderId ?? null} nestCode={nestCode} />

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <CalendarClock className="h-5 w-5" aria-hidden />
                {t('mes.kiosk.planTitle', 'Planned on this nest')}
              </h2>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={planHorizon === 8 ? 'secondary' : 'outline'}
                  onClick={() => setPlanHorizon(8)}
                >
                  {t('mes.kiosk.horizon8h', 'Next 8 h')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={planHorizon === 72 ? 'secondary' : 'outline'}
                  onClick={() => setPlanHorizon(72)}
                >
                  {t('mes.kiosk.horizon3d', '3 days')}
                </Button>
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 snap-x">
              {timeline.map((slot) => (
                <button
                  key={slot.operationId}
                  type="button"
                  className={`snap-start shrink-0 min-w-[10rem] rounded-lg border px-3 py-3 text-left transition-colors ${
                    highlightedId === slot.operationId ? 'border-primary ring-2 ring-primary' : 'bg-card hover:bg-muted/50'
                  }`}
                  onClick={() => setHighlightedId(slot.operationId)}
                >
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {new Intl.DateTimeFormat(locale, { weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(
                      slot.start,
                    )}
                  </p>
                  <p className="font-medium text-sm mt-1 line-clamp-2">{slot.operationName}</p>
                  <p className="text-xs text-muted-foreground">{slot.orderNumber}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-xl border bg-card">
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-4 text-left font-medium text-lg"
              onClick={() => setQueueOpen((v) => !v)}
            >
              <span className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" aria-hidden />
                {t('mes.kiosk.fullQueue', 'Full sequence ({count})', { count: String(operations.length) })}
              </span>
              {queueOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
            {queueOpen ? (
              <ul className="border-t divide-y px-2 pb-2">
                {operations.map((op) => (
                  <li
                    key={op.id}
                    className={`px-3 py-4 space-y-2 ${highlightedId === op.id ? 'bg-primary/5 rounded-lg' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-mono text-muted-foreground">#{op.sequence}</span>
                        <p className="font-medium text-base">{op.operationName}</p>
                        <p className="text-sm text-muted-foreground">
                          {op.orderNumber} · {op.operationCode}
                        </p>
                      </div>
                      <MesStatusBadge status={op.status} kind="operation" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatTimeRange(op.scheduledStart, op.scheduledEnd, locale)}
                    </p>
                    {op.materials.length > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        {t('mes.kiosk.materialCount', '{n} materials', { n: String(op.materials.length) })}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="rounded-xl border">
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-3 text-left font-medium"
              onClick={() => setScanOpen((v) => !v)}
            >
              {t('mes.kiosk.scanSection', 'Barcode scan')}
              {scanOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {scanOpen ? (
              <div className="px-4 pb-4">
                <MesScanField kiosk onScan={handleScan} />
                <p className="text-xs text-muted-foreground mt-2">
                  {t('mes.operator.kioskScanHint', 'Scan auto-starts or completes the matched operation.')}
                </p>
              </div>
            ) : null}
          </section>
        </PageBody>
      </div>
    </Page>
  )
}
