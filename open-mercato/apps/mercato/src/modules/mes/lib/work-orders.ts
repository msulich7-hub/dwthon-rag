import type { EntityManager } from '@mikro-orm/postgresql'
import { findWithDecryption } from '@open-mercato/shared/lib/encryption/find'
import { CustomerDeal } from '@open-mercato/core/modules/customers/data/entities'
import { assertSalesOrderExists } from './sales-order-context'
import { MesWorkOrder, type MesWorkOrderStatus } from '../data/entities'
import type { CreateWorkOrderBody } from '../data/validators'
import { canTransitionWorkOrderStatus } from './work-order-status'
import { emitMesEvent } from '../events'

export type MesScope = { tenantId: string; organizationId: string }

export type WorkOrderDto = {
  id: string
  orderNumber: string
  productCode: string
  quantity: number
  status: MesWorkOrderStatus
  dealId: string | null
  salesOrderId: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

function toDto(order: MesWorkOrder): WorkOrderDto {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    productCode: order.productCode,
    quantity: order.quantity,
    status: order.status,
    dealId: order.dealId ?? null,
    salesOrderId: order.salesOrderId ?? null,
    notes: order.notes ?? null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  }
}

function buildOrderNumber(scope: MesScope): string {
  const suffix = Date.now().toString(36).toUpperCase()
  return `WO-${suffix}`
}

async function assertDealExists(
  em: EntityManager,
  scope: MesScope,
  dealId: string,
): Promise<void> {
  const deals = await findWithDecryption(em, CustomerDeal, {
    id: dealId,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    deletedAt: null,
  })
  if (!deals[0]) {
    throw new Error('DEAL_NOT_FOUND')
  }
}

export async function listWorkOrders(
  em: EntityManager,
  scope: MesScope,
  filters: {
    dealId?: string
    salesOrderId?: string
    status?: MesWorkOrderStatus
    limit?: number
  },
): Promise<WorkOrderDto[]> {
  const where: Record<string, unknown> = {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  }
  if (filters.dealId) where.dealId = filters.dealId
  if (filters.salesOrderId) where.salesOrderId = filters.salesOrderId
  if (filters.status) where.status = filters.status

  const orders = await em.find(MesWorkOrder, where, {
    orderBy: { updatedAt: 'DESC' },
    limit: filters.limit ?? 100,
  })

  return orders.map(toDto)
}

export async function createWorkOrder(
  em: EntityManager,
  scope: MesScope,
  body: CreateWorkOrderBody,
): Promise<WorkOrderDto> {
  if (body.dealId) {
    await assertDealExists(em, scope, body.dealId)
  }
  if (body.salesOrderId) {
    await assertSalesOrderExists(em, scope, body.salesOrderId)
  }

  const order = em.create(MesWorkOrder, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    orderNumber: body.orderNumber?.trim() || buildOrderNumber(scope),
    productCode: body.productCode.trim(),
    quantity: body.quantity,
    status: body.status ?? 'draft',
    dealId: body.dealId ?? null,
    salesOrderId: body.salesOrderId ?? null,
    notes: body.notes?.trim() ?? null,
  })

  await em.persistAndFlush(order)

  await emitMesEvent('mes.work_order.created', {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    workOrderId: order.id,
    orderNumber: order.orderNumber,
    dealId: order.dealId,
    salesOrderId: order.salesOrderId,
    status: order.status,
  })

  return toDto(order)
}

export async function updateWorkOrderStatus(
  em: EntityManager,
  scope: MesScope,
  workOrderId: string,
  nextStatus: MesWorkOrderStatus,
): Promise<WorkOrderDto> {
  const order = await em.findOne(MesWorkOrder, {
    id: workOrderId,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })

  if (!order) {
    throw new Error('WORK_ORDER_NOT_FOUND')
  }

  if (!canTransitionWorkOrderStatus(order.status, nextStatus)) {
    throw new Error('INVALID_STATUS_TRANSITION')
  }

  const previousStatus = order.status
  order.status = nextStatus
  await em.flush()

  await emitMesEvent('mes.work_order.status_changed', {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    workOrderId: order.id,
    orderNumber: order.orderNumber,
    fromStatus: previousStatus,
    toStatus: nextStatus,
    dealId: order.dealId,
    salesOrderId: order.salesOrderId,
  })

  return toDto(order)
}

export async function listWorkOrderStatusesForDashboard(
  em: EntityManager,
  scope: MesScope,
): Promise<MesWorkOrderStatus[]> {
  const rows = await em.find(
    MesWorkOrder,
    { tenantId: scope.tenantId, organizationId: scope.organizationId },
    { fields: ['status'] },
  )
  return rows.map((row) => row.status)
}
