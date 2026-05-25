"use client"

import Link from 'next/link'
import { ChevronDown, ChevronUp, ClipboardList, UserRound } from 'lucide-react'
import { Button } from '@open-mercato/ui/primitives/button'
import { MesStatusBadge } from '../MesStatusBadge'
import { MES_ROUTES } from '../../lib/mes-routes'
import { useKioskNestState } from '../../hooks/useKioskNestState'
import { MesKioskDemoBanner } from './MesKioskDemoBanner'
import { MesKioskTerminalHeader } from './MesKioskTerminalHeader'
import { MesKioskNowCard } from './MesKioskNowCard'
import { MesKioskPlanStrip } from './MesKioskPlanStrip'
import { MesKioskScanBar } from './MesKioskScanBar'
import { MesKioskShell } from './MesKioskShell'
import { MesKioskOnboarding } from './MesKioskOnboarding'
import { MesKioskAndonDialog } from './MesKioskAndonDialog'
import { MesKioskCompleteDialog } from './MesKioskCompleteDialog'

export function MesKioskExperience() {
  const {
    t,
    locale,
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
    completeConfirmOpId,
    setCompleteConfirmOpId,
    completeOp,
    nowCardRef,
    pushNest,
    handleConfirm,
    handleScan,
    submitAndon,
    showServiceLinks,
  } = useKioskNestState()

  const rawMaterialsHref = MES_ROUTES.operatorRawMaterialsKiosk({
    nest: nestCode,
    workOrderId: vm.now?.workOrderId,
  })

  return (
    <MesKioskShell footer={<MesKioskScanBar onScan={handleScan} />}>
      <MesKioskOnboarding />
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

      <div className="max-w-4xl mx-auto px-4 py-3 space-y-3 min-h-0">
        {vm.operator ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <UserRound className="h-4 w-4" aria-hidden />
            <span>{vm.operator.displayName}</span>
            <span className="font-mono text-xs">{vm.operator.badge}</span>
          </div>
        ) : null}

        <div ref={nowCardRef}>
          {vm.now ? (
            <MesKioskNowCard
              op={vm.now}
              locale={locale}
              busyId={busyId}
              rawMaterialsHref={rawMaterialsHref}
              onStart={() => handleConfirm(vm.now!.id, 'start')}
              onRequestComplete={() => setCompleteConfirmOpId(vm.now!.id)}
              onAndon={() => setAndonOpen(true)}
            />
          ) : (
            <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
              {t('mes.kiosk.noNow', 'No active step — check the plan below.')}
            </div>
          )}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground h-8"
          onClick={() => setPlanOpen((v) => !v)}
        >
          {planOpen ? <ChevronUp className="h-4 w-4 inline" /> : <ChevronDown className="h-4 w-4 inline" />}
          <span className="ml-1">
            {planOpen ? t('mes.kiosk.hidePlan', 'Hide plan') : t('mes.kiosk.showPlan', 'Show plan & sequence')}
          </span>
        </Button>

        {planOpen ? (
          <div className="space-y-3 pb-2">
            <MesKioskPlanStrip
              nestCode={nestCode}
              horizonHours={planHorizon}
              onHorizonChange={setPlanHorizon}
              highlightedId={highlightedId}
              onSelect={setHighlightedId}
              nowOperationId={vm.now?.id ?? null}
              locale={locale}
            />
            <section className="rounded-lg border text-sm">
              <p className="px-3 py-2 font-medium border-b flex items-center gap-2">
                <ClipboardList className="h-4 w-4" aria-hidden />
                {t('mes.kiosk.fullQueue', 'Full sequence ({count})', { count: String(vm.operations.length) })}
              </p>
              <ul className="divide-y max-h-40 overflow-y-auto">
                {vm.operations.map((op) => (
                  <li
                    key={op.id}
                    className={`px-3 py-2 cursor-pointer ${highlightedId === op.id ? 'bg-primary/5' : ''}`}
                    onClick={() => setHighlightedId(op.id)}
                  >
                    <div className="flex justify-between gap-2">
                      <div>
                        <span className="text-xs font-mono text-muted-foreground">#{op.sequence}</span>
                        <p className="font-medium">{op.operationName}</p>
                        {op.blockedReasonKey ? (
                          <p className="text-xs text-orange-600">{t(op.blockedReasonKey, 'Blocked')}</p>
                        ) : null}
                      </div>
                      <MesStatusBadge status={op.displayStatus} kind="operation" />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        ) : null}
      </div>

      <MesKioskAndonDialog open={andonOpen} onClose={() => setAndonOpen(false)} onSubmit={submitAndon} />
      <MesKioskCompleteDialog
        open={completeConfirmOpId != null}
        operationName={completeOp?.operationName ?? ''}
        onConfirm={() => {
          if (completeConfirmOpId) handleConfirm(completeConfirmOpId, 'complete')
          setCompleteConfirmOpId(null)
        }}
        onCancel={() => setCompleteConfirmOpId(null)}
      />

      {showServiceLinks ? (
        <p className="text-center text-xs text-muted-foreground pb-28">
          <Link href={MES_ROUTES.operator} className="underline">
            {t('mes.operator.exitKiosk', 'Exit kiosk')}
          </Link>
        </p>
      ) : null}
    </MesKioskShell>
  )
}
