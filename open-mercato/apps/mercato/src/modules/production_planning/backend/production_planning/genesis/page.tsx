"use client"

import * as React from 'react'
import Link from 'next/link'
import { Page, PageBody, PageHeader } from '@open-mercato/ui/backend/Page'
import { Button } from '@open-mercato/ui/primitives/button'
import { apiCall } from '@open-mercato/ui/backend/utils/apiCall'
import { PP_ROUTES } from '../../../lib/routes'

type GenesisRoot = {
  id: string
  demandSourceType: string
  demandSourceId: string
  salesOrderId: string | null
  productSku: string
  quantity: number
  dueAt: string | null
  status: string
  nodeCount: number
}

type GenesisNode = {
  id: string
  nodeKey: string
  level: number
  nodeType: string
  productSku: string
  extendedQty: number
  parentNodeId: string | null
}

type NettingRun = {
  id: string
  mode: string
  status: string
  rootsProcessed: number
  poolMoCreated: number
  peggingLinksCreated: number
  consolidatedMoCount: number
  completedAt: string | null
}

type IfsStatus = {
  status: {
    sourceSystem: string
    entities: Array<{
      entityName: string
      rowCount: number
      lagSeconds: number
      lastSuccessAt: string | null
    }>
  }
  reconcile: {
    withinTolerance: boolean
    checks: Array<{ entity: string; liveCount: number; silverCount: number; ok: boolean }>
  }
}

export default function ProductionGenesisPage() {
  const [roots, setRoots] = React.useState<GenesisRoot[]>([])
  const [runs, setRuns] = React.useState<NettingRun[]>([])
  const [selectedRootId, setSelectedRootId] = React.useState<string | null>(null)
  const [tree, setTree] = React.useState<{ root: GenesisRoot; nodes: GenesisNode[] } | null>(null)
  const [ifsStatus, setIfsStatus] = React.useState<IfsStatus | null>(null)
  const [statusFilter, setStatusFilter] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [message, setMessage] = React.useState<string | null>(null)

  const loadRoots = React.useCallback(() => {
    const qs = new URLSearchParams({ limit: '100' })
    if (statusFilter) qs.set('status', statusFilter)
    void apiCall<{ roots: GenesisRoot[] }>(`/api/production_planning/genesis/roots?${qs}`)
      .then(({ result }) => setRoots(result?.roots ?? []))
      .catch(() => setRoots([]))
  }, [statusFilter])

  const loadRuns = React.useCallback(() => {
    void apiCall<{ runs: NettingRun[] }>('/api/production_planning/mrp/netting/runs')
      .then(({ result }) => setRuns(result?.runs ?? []))
      .catch(() => setRuns([]))
  }, [])

  const loadIfs = React.useCallback(() => {
    void apiCall<IfsStatus>('/api/production_planning/ifs/extract/status')
      .then(({ result }) => setIfsStatus(result ?? null))
      .catch(() => setIfsStatus(null))
  }, [])

  React.useEffect(() => {
    loadRoots()
    loadRuns()
    loadIfs()
  }, [loadRoots, loadRuns, loadIfs])

  React.useEffect(() => {
    if (!selectedRootId) {
      setTree(null)
      return
    }
    void apiCall<{ root: GenesisRoot; nodes: GenesisNode[] }>(
      `/api/production_planning/genesis/roots/${encodeURIComponent(selectedRootId)}`,
    )
      .then(({ result }) => {
        if (result?.root) setTree({ root: result.root, nodes: result.nodes })
        else setTree(null)
      })
      .catch(() => setTree(null))
  }, [selectedRootId])

  const runNetting = React.useCallback(async () => {
    setBusy(true)
    setMessage(null)
    try {
      const { result } = await apiCall<{
        rootsProcessed: number
        poolMoCreated: number
        peggingLinksCreated: number
      }>('/api/production_planning/mrp/netting/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'full' }),
      })
      setMessage(
        `Netting: ${result?.rootsProcessed ?? 0} korzeni · ${result?.poolMoCreated ?? 0} pool MO · ${result?.peggingLinksCreated ?? 0} pegów`,
      )
      loadRoots()
      loadRuns()
    } catch {
      setMessage('Netting nie powiódł się.')
    } finally {
      setBusy(false)
    }
  }, [loadRoots, loadRuns])

  const runIfsExtract = React.useCallback(async () => {
    setBusy(true)
    setMessage(null)
    try {
      const { result } = await apiCall<{
        extract: { counts: Record<string, number> }
        reconcile: { withinTolerance: boolean }
      }>('/api/production_planning/ifs/extract/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const c = result?.extract.counts
      setMessage(
        `IFS extract: CO ${c?.customerOrderLines ?? 0} · shop ${c?.shopOrders ?? 0} · ops ${c?.shopOrderOperations ?? 0} · reconcile ${result?.reconcile.withinTolerance ? 'OK' : 'WARN'}`,
      )
      loadIfs()
    } catch {
      setMessage('IFS extract nie powiódł się.')
    } finally {
      setBusy(false)
    }
  }, [loadIfs])

  const nodesByParent = React.useMemo(() => {
    if (!tree) return new Map<string | null, GenesisNode[]>()
    const map = new Map<string | null, GenesisNode[]>()
    for (const node of tree.nodes) {
      const key = node.parentNodeId
      const list = map.get(key) ?? []
      list.push(node)
      map.set(key, list)
    }
    return map
  }, [tree])

  function renderNode(node: GenesisNode, depth: number): React.ReactNode {
    const children = nodesByParent.get(node.id) ?? []
    return (
      <li key={node.id} className="text-xs">
        <span style={{ paddingLeft: depth * 12 }} className="font-mono">
          L{node.level} · {node.nodeType} · {node.productSku} ×{node.extendedQty}
        </span>
        {children.length > 0 ? (
          <ul className="mt-0.5">{children.map((c) => renderNode(c, depth + 1))}</ul>
        ) : null}
      </li>
    )
  }

  return (
    <Page>
      <PageHeader
        title="Genesis & MRP"
        description="Korzenie popytu, eksplozja BOM, netting pool MO oraz pilot IFS silver."
        actions={
          <Link href={PP_ROUTES.hub} className="text-sm underline text-muted-foreground">
            Powrót
          </Link>
        }
      />
      <PageBody className="space-y-6">
        {message ? (
          <p className="text-sm rounded-lg border bg-muted/30 p-3 text-muted-foreground">{message}</p>
        ) : null}

        <section className="rounded-lg border p-4 space-y-3">
          <h2 className="font-medium text-sm">Akcje</h2>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={busy} onClick={() => void runNetting()}>
              Uruchom netting (full)
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void runIfsExtract()}>
              IFS silver extract (pilot)
            </Button>
          </div>
        </section>

        <section className="rounded-lg border p-4 space-y-2">
          <h2 className="font-medium text-sm">IFS silver — status</h2>
          {!ifsStatus ? (
            <p className="text-xs text-muted-foreground">Brak watermarków — uruchom extract.</p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Źródło: {ifsStatus.status.sourceSystem} · reconcile:{' '}
                {ifsStatus.reconcile.withinTolerance ? (
                  <span className="text-emerald-600">w tolerancji</span>
                ) : (
                  <span className="text-amber-600">poza tolerancją</span>
                )}
              </p>
              <ul className="text-xs grid gap-1 sm:grid-cols-2">
                {ifsStatus.status.entities.map((e) => (
                  <li key={e.entityName} className="font-mono border rounded px-2 py-1">
                    {e.entityName}: {e.rowCount} wierszy
                    {e.lastSuccessAt ? ` · ${new Date(e.lastSuccessAt).toLocaleString()}` : ''}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="rounded-lg border p-4 space-y-2">
          <h2 className="font-medium text-sm">Ostatnie netting runs</h2>
          {runs.length === 0 ? (
            <p className="text-xs text-muted-foreground">Brak uruchomień.</p>
          ) : (
            <ul className="text-xs space-y-1 max-h-32 overflow-y-auto">
              {runs.slice(0, 5).map((r) => (
                <li key={r.id} className="font-mono">
                  {r.status} · {r.rootsProcessed} roots · pool {r.poolMoCreated} · peg{' '}
                  {r.peggingLinksCreated}
                  {r.completedAt ? ` · ${new Date(r.completedAt).toLocaleString()}` : ''}
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-medium text-sm">Korzenie genesis</h2>
              <select
                className="border rounded px-2 py-0.5 text-xs"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Wszystkie statusy</option>
                <option value="pending">pending</option>
                <option value="exploded">exploded</option>
                <option value="netted">netted</option>
                <option value="released">released</option>
              </select>
            </div>
            {roots.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Brak korzeni — uruchom netting po seedzie fabryki.
              </p>
            ) : (
              <ul className="text-xs space-y-1 max-h-80 overflow-y-auto">
                {roots.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      className={`w-full text-left border rounded p-2 hover:bg-muted/40 ${selectedRootId === r.id ? 'ring-1 ring-primary' : ''}`}
                      onClick={() => setSelectedRootId(r.id)}
                    >
                      <span className="font-medium">{r.productSku}</span>
                      <span className="text-muted-foreground"> · {r.status}</span>
                      <span className="text-muted-foreground"> · {r.nodeCount} węzłów</span>
                      <div className="text-muted-foreground font-mono truncate">{r.demandSourceId}</div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-lg border p-4 space-y-2">
            <h2 className="font-medium text-sm">Drzewo BOM</h2>
            {!tree ? (
              <p className="text-xs text-muted-foreground">Wybierz korzeń z listy.</p>
            ) : (
              <>
                <p className="text-xs">
                  <span className="font-medium">{tree.root.productSku}</span> · qty {tree.root.quantity}{' '}
                  · {tree.root.status}
                </p>
                <ul className="max-h-80 overflow-y-auto border rounded p-2">
                  {(nodesByParent.get(null) ?? []).map((n) => renderNode(n, 0))}
                </ul>
              </>
            )}
          </section>
        </div>
      </PageBody>
    </Page>
  )
}
