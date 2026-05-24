import type { EntityManager } from '@mikro-orm/postgresql'
import { findWithDecryption } from '@open-mercato/shared/lib/encryption/find'
import {
  SalesOrder,
  SalesOrderLine,
} from '@open-mercato/core/modules/sales/data/entities'

export type MesScope = { tenantId: string; organizationId: string }

export type SalesOrderLineDraft = {
  lineId: string
  lineNumber: number
  productCode: string
  quantity: number
  name: string | null
}

export type LoadedSalesOrderContext = {
  found: boolean
  salesOrderId: string
  orderNumber: string | null
  status: string | null
  fulfillmentStatus: string | null
  lines: SalesOrderLineDraft[]
}

function extractProductCode(line: SalesOrderLine): string {
  const snapshot = line.catalogSnapshot as Record<string, unknown> | null | undefined
  const sku = snapshot?.sku
  if (typeof sku === 'string' && sku.trim().length > 0) {
    return sku.trim()
  }
  const handle = snapshot?.handle
  if (typeof handle === 'string' && handle.trim().length > 0) {
    return handle.trim()
  }
  if (line.name?.trim()) {
    return line.name.trim().slice(0, 120)
  }
  return `LINE-${line.lineNumber}`
}

function parseLineQuantity(line: SalesOrderLine): number {
  const raw = Number.parseFloat(String(line.quantity ?? '0'))
  if (!Number.isFinite(raw) || raw <= 0) return 1
  return Math.min(Math.ceil(raw), 1_000_000)
}

export async function loadSalesOrderContext(
  em: EntityManager,
  scope: MesScope,
  salesOrderId: string,
): Promise<LoadedSalesOrderContext> {
  const orders = await findWithDecryption(em, SalesOrder, {
    id: salesOrderId,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })
  const order = orders[0]
  if (!order) {
    return {
      found: false,
      salesOrderId,
      orderNumber: null,
      status: null,
      fulfillmentStatus: null,
      lines: [],
    }
  }

  const lines = await em.find(
    SalesOrderLine,
    {
      order: order.id,
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
    },
    { orderBy: { lineNumber: 'ASC' } },
  )

  const productLines = lines
    .filter((line) => line.kind === 'product' || line.kind === 'service')
    .map((line) => ({
      lineId: line.id,
      lineNumber: line.lineNumber,
      productCode: extractProductCode(line),
      quantity: parseLineQuantity(line),
      name: line.name ?? null,
    }))

  return {
    found: true,
    salesOrderId: order.id,
    orderNumber: order.orderNumber ?? null,
    status: order.status ?? null,
    fulfillmentStatus: order.fulfillmentStatus ?? null,
    lines: productLines,
  }
}

export async function assertSalesOrderExists(
  em: EntityManager,
  scope: MesScope,
  salesOrderId: string,
): Promise<SalesOrder> {
  const orders = await findWithDecryption(em, SalesOrder, {
    id: salesOrderId,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })
  const order = orders[0]
  if (!order) {
    throw new Error('SALES_ORDER_NOT_FOUND')
  }
  return order
}
