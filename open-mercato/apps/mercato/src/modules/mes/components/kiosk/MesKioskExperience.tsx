"use client"

import Link from 'next/link'
import { ChevronDown, ChevronUp, ClipboardList, UserRound } from 'lucide-react'
import { Page, PageBody } from '@open-mercato/ui/backend/Page'
import { Button } from '@open-mercato/ui/primitives/button'
import { flash } from '@open-mercato/ui/backend/FlashMessages'
import { MesKioskRawMaterialsHero } from '../MesKioskRawMaterialsHero'
import { MesStatusBadge } from '../MesStatusBadge'
import { useKioskNestState } from '../../hooks/useKioskNestState'
import { MES_ROUTES } from '../../lib/mes-routes'
import { MesKioskDemoBanner } from './MesKioskDemoBanner'
import { MesKioskTerminalHeader } from './MesKioskTerminalHeader'
import { MesKioskNowCard } from './MesKioskNowCard'
import { MesKioskPlanStrip } from './MesKioskPlanStrip'
import { MesKioskScanBar } from './MesKioskScanBar'

export function MesKioskExperience() {
  const locale = typeof navigator !== 'undefined' ? navigator.language : 'pl-PL'
  const {
    t,
    nestCode,
    vm,
    nests,
    highlightedId,
    setHighlightedId,
    busyId,
    planHorizon,
    setPlanHorizon,
    planOpen,
    setPlanOpen,
    andonOpen,
    setAndonOpen,
    pushNest,
    handleConfirm,
    handleScan,
    showServiceLinks,
  } = useKioskNestState()

  return (
    <Page>
      <div className="min-h-screen bg-background pb-36">
        <MesKioskDemoBanner />
        <MesKioskTerminalHeader
          nestName={vm.nestName}
          nestCode={vm.nestCode}
          line={vm.line}
          planBatchId={vm.planBatchId}
          planPublishedAt={vm.planPublishedAt}
          nests={nests}
          currentNestCode={nestCode}
          onSelectNest={pushNest}
          showServiceLinks={showServiceLinks}
        />

        <PageBody className="max-w-4xl mx-auto space-y-4 py-5 px-4 md:px-8">
          {vm.operator ? (
            <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-2">
              <UserRound className="h-5 w-5 text-muted-foreground" aria-hidden />
              <div className="text-sm">
                <span className="text-muted-foreground">{t('mes.kiosk.operatorOnNest', 'Operator on nest')}: </span>
                <span className="font-semibold">{vm.operator.displayName}</span>
                <span className="text-muted-foreground ml-2">{vm.operator.badge}</span>
              </div>
            </div>
          ) : null}

          {andonOpen ? (
            <div className="rounded-lg border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/40 p-4 text-center">
              <p className="font-semibold">{t('mes.kiosk.andonSent', 'Andon logged (demo) — supervisor notified')}</p>
              <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => setAndonOpen(false)}>
                {t('mes.kiosk.andonDismiss', 'OK')}
              </Button>
            </div>
          ) : null}

          {vm.now ? (
            <MesKioskNowCard
              op={vm.now}
              locale={locale}
              busyId={busyId}
              onStart={() => handleConfirm(vm.now!.id, 'start')}
              onComplete={() => handleConfirm(vm.now!.id, 'complete')}
              onAndon={() => {
                setAndonOpen(true)
                flash(t('mes.kiosk.andonFlash', 'Issue reported (demo)'), 'success')
              }}
            />
          ) : (
            <div className="rounded-xl border border-dashed p-10 text-center text-lg text-muted-foreground">
              {t('mes.kiosk.noNow', 'No active step — check the plan below.')}
            </div>
          )}

          <MesKioskRawMaterialsHero workOrderId={vm.now?.workOrderId ?? null} nestCode={nestCode} />

          <Button
            type="button"
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={() => setPlanOpen((v) => !v)}
          >
            {planOpen ? <ChevronUp className="h-4 w-4 inline mr-1" /> : <ChevronDown className="h-4 w-4 inline mr-1" />}
            {planOpen
              ? t('mes.kiosk.hidePlan', 'Hide plan')
              : t('mes.kiosk.showPlan', 'Show plan & full sequence')}
          </Button>

          {planOpen ? (
            <>
              <MesKioskPlanStrip
                nestCode={nestCode}
                horizonHours={planHorizon}
                onHorizonChange={setPlanHorizon}
                operations={vm.operations}
                highlightedId={highlightedId}
                onSelect={setHighlightedId}
                nowOperationId={vm.now?.id ?? null}
                locale={locale}
              />
              <section className="rounded-xl border bg-card">
                <p className="px-4 py-3 font-medium flex items-center gap-2 border-b">
                  <ClipboardList className="h-4 w-4" aria-hidden />
                  {t('mes.kiosk.fullQueue', 'Full sequence ({count})', { count: String(vm.operations.length) })}
                </p>
                <ul className="divide-y max-h-64 overflow-y-auto">
                  {vm.operations.map((op) => (
                    <li
                      key={op.id}
                      className={`px-4 py-3 ${highlightedId === op.id ? 'bg-primary/5' : ''}`}
                      onClick={() => setHighlightedId(op.id)}
                    >
                      <div className="flex justify-between gap-2">
                        <div>
                          <span className="text-xs font-mono text-muted-foreground">#{op.sequence}</span>
                          <p className="font-medium">{op.operationName}</p>
                          <p className="text-xs text-muted-foreground">{op.orderNumber}</p>
                          {op.blockedReasonKey ? (
                            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                              {t(op.blockedReasonKey, 'Waiting for previous step')}
                            </p>
                          ) : null}
                        </div>
                        <MesStatusBadge status={op.displayStatus} kind="operation" />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          ) : null}

          <div className="text-center pt-2">
            <Button variant="link" size="sm" asChild>
              <Link href={MES_ROUTES.operator}>{t('mes.operator.exitKiosk', 'Exit kiosk')}</Link>
            </Button>
          </div>
        </PageBody>

        <MesKioskScanBar onScan={handleScan} />
      </div>
    </Page>
  )
}
