"use client"

import * as React from 'react'
import Link from 'next/link'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { MES_ROUTES } from '../lib/mes-routes'

export type GenealogyNodeRef = {
  type: 'lot' | 'serial' | 'work_order'
  id: string
  label: string
  productCode?: string | null
}

export type GenealogyEdgeView = {
  id: string
  relation: string
  parent: GenealogyNodeRef
  child: GenealogyNodeRef
  quantity: number | null
  workOrderId: string | null
}

export type GenealogyTracePayload = {
  root: GenealogyNodeRef
  upstream: GenealogyEdgeView[]
  downstream: GenealogyEdgeView[]
}

function nodeHref(node: GenealogyNodeRef): string | null {
  if (node.type === 'work_order') return MES_ROUTES.workOrder(node.id)
  return null
}

function EdgeRow({ edge, direction }: { edge: GenealogyEdgeView; direction: 'upstream' | 'downstream' }) {
  const t = useT()
  const from = direction === 'upstream' ? edge.parent : edge.parent
  const to = direction === 'upstream' ? edge.child : edge.child
  const fromHref = nodeHref(from)
  const toHref = nodeHref(to)

  return (
    <li className="text-xs border-l-2 border-muted pl-2 py-1">
      <span className="text-muted-foreground">{t(`mes.genealogy.relation.${edge.relation}`, edge.relation)}</span>
      {' · '}
      {fromHref ? (
        <Link href={fromHref} className="text-primary hover:underline">
          {from.label}
        </Link>
      ) : (
        <span className="font-medium">{from.label}</span>
      )}
      <span className="text-muted-foreground"> → </span>
      {toHref ? (
        <Link href={toHref} className="text-primary hover:underline">
          {to.label}
        </Link>
      ) : (
        <span className="font-medium">{to.label}</span>
      )}
      {edge.quantity != null ? (
        <span className="text-muted-foreground"> × {edge.quantity}</span>
      ) : null}
    </li>
  )
}

export function MesGenealogyTree({ trace }: { trace: GenealogyTracePayload }) {
  const t = useT()

  return (
    <div className="rounded-md bg-muted/30 p-3 text-sm space-y-3">
      <div>
        <span className="text-xs text-muted-foreground">{t('mes.genealogy.root', 'Root')}</span>
        <div className="font-medium">
          {trace.root.label}
          {trace.root.productCode ? (
            <span className="text-muted-foreground font-normal"> · {trace.root.productCode}</span>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="text-xs font-medium mb-1">
            {t('mes.genealogy.upstream', 'Upstream')} ({trace.upstream.length})
          </h3>
          {trace.upstream.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t('mes.genealogy.emptyUpstream', 'No upstream links.')}</p>
          ) : (
            <ul className="space-y-1">{trace.upstream.map((edge) => <EdgeRow key={edge.id} edge={edge} direction="upstream" />)}</ul>
          )}
        </div>
        <div>
          <h3 className="text-xs font-medium mb-1">
            {t('mes.genealogy.downstream', 'Downstream')} ({trace.downstream.length})
          </h3>
          {trace.downstream.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t('mes.genealogy.emptyDownstream', 'No downstream links.')}</p>
          ) : (
            <ul className="space-y-1">
              {trace.downstream.map((edge) => (
                <EdgeRow key={edge.id} edge={edge} direction="downstream" />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
