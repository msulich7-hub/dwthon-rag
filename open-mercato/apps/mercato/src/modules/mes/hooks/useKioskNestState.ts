"use client"

import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { flash } from '@open-mercato/ui/backend/FlashMessages'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import {
  applyMockConfirmationWithGates,
  buildKioskNestViewModel,
  initialMockOperationsForNest,
  persistNestCode,
  readPersistedNestCode,
  type KioskPlannedOperation,
} from '../lib/kiosk-planning-view-model'
import {
  findMockOperationByScan,
  KIOSK_MOCK_NESTS,
  resolveNestCode,
} from '../lib/kiosk-planning-mock'

export function useKioskNestState() {
  const t = useT()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const urlNest = searchParams.get('nest')
  const nestCode = React.useMemo(() => {
    if (urlNest && KIOSK_MOCK_NESTS.some((n) => n.code === urlNest)) return urlNest
    const stored = readPersistedNestCode()
    if (stored && KIOSK_MOCK_NESTS.some((n) => n.code === stored)) return stored
    return resolveNestCode(null)
  }, [urlNest])

  const [rawOps, setRawOps] = React.useState<KioskPlannedOperation[]>(() =>
    initialMockOperationsForNest(nestCode),
  )
  const [highlightedId, setHighlightedId] = React.useState<string | null>(null)
  const [busyId, setBusyId] = React.useState<string | null>(null)
  const [planHorizon, setPlanHorizon] = React.useState<8 | 72>(8)
  const [planOpen, setPlanOpen] = React.useState(false)
  const [andonOpen, setAndonOpen] = React.useState(false)

  React.useEffect(() => {
    persistNestCode(nestCode)
    setRawOps(initialMockOperationsForNest(nestCode))
    setHighlightedId(null)
  }, [nestCode])

  React.useEffect(() => {
    if (urlNest) return
    const params = new URLSearchParams(searchParams.toString())
    params.set('kiosk', '1')
    params.set('nest', nestCode)
    router.replace(`${pathname}?${params.toString()}`)
  }, [urlNest, nestCode, pathname, router, searchParams])

  const vm = React.useMemo(() => buildKioskNestViewModel(nestCode, rawOps), [nestCode, rawOps])

  const pushNest = React.useCallback(
    (code: string) => {
      persistNestCode(code)
      const params = new URLSearchParams(searchParams.toString())
      params.set('kiosk', '1')
      params.set('nest', code)
      params.delete('live')
      params.delete('debug')
      router.push(`${pathname}?${params.toString()}`)
    },
    [pathname, router, searchParams],
  )

  const handleConfirm = React.useCallback(
    (operationId: string, type: 'start' | 'complete') => {
      setBusyId(operationId)
      window.setTimeout(() => {
        setRawOps((prev) => applyMockConfirmationWithGates(prev, operationId, type))
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
      const match = findMockOperationByScan(rawOps, scan)
      if (!match) {
        flash(t('mes.scan.notFound', 'No matching operation in queue'), 'error')
        return
      }
      const view = vm.operations.find((o) => o.id === match.id)
      setHighlightedId(match.id)
      flash(
        t('mes.scan.found', 'Found {order} — {operation}', {
          order: match.orderNumber,
          operation: match.operationName,
        }),
        'success',
      )
      if (view?.canStart) handleConfirm(match.id, 'start')
      else if (view?.canComplete) handleConfirm(match.id, 'complete')
    },
    [handleConfirm, rawOps, t, vm.operations],
  )

  const showServiceLinks = searchParams.get('debug') === '1'

  return {
    t,
    nestCode,
    vm,
    nests: KIOSK_MOCK_NESTS,
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
  }
}
