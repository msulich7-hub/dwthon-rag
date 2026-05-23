import type { EntityManager } from '@mikro-orm/postgresql'
import {
  ProductionPlanningOperation,
  ProductionPlanningOrder,
  type ProductionOrderStatus,
} from '../data/entities'
import type {
  CreateProductionOperationBody,
  CreateProductionOrderBody,
} from '../data/validators'
import { emitProductionPlanningEvent } from '../events'
import { isOrderLate } from './capacity-snapshot'

export type OrgScope = { tenantId: string; organizationId: string }

export type ProductionOrderDto = {
  id: string
  code: string
  title: string
  salesOrderId: string | null
  productSku: string | null
  quantity: number
  status: ProductionOrderStatus
  workCenterCode: string | null
  plannedStartAt: string | null
  plannedEndAt: string | null
  dueAt: string | null
  isLate: boolean
  createdAt: string
  updatedAt: string
}

export type ProductionOperationDto = {
  id: string
  productionOrderId: string
  sequenceNo: number
  name: string
  workCenterCode: string
  durationMinutes: number
  status: string
  plannedStartAt: string | null
  plannedEndAt: string | null
}

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null
}

export function mapProductionOrder(order: ProductionPlanningOrder): ProductionOrderDto {
  return {
    id: order.id,
    code: order.code,
    title: order.title,
    salesOrderId: order.salesOrderId ?? null,
    productSku: order.productSku ?? null,
    quantity: Number(order.quantity),
    status: order.status,
    workCenterCode: order.workCenterCode ?? null,
    plannedStartAt: toIso(order.plannedStartAt),
    plannedEndAt: toIso(order.plannedEndAt),
    dueAt: toIso(order.dueAt),
    isLate: isOrderLate(order),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  }
}

export function mapProductionOperation(op: ProductionPlanningOperation): ProductionOperationDto {
  return {
    id: op.id,
    productionOrderId: op.productionOrderId,
    sequenceNo: op.sequenceNo,
    name: op.name,
    workCenterCode: op.workCenterCode,
    durationMinutes: op.durationMinutes,
    status: op.status,
    plannedStartAt: toIso(op.plannedStartAt),
    plannedEndAt: toIso(op.plannedEndAt),
  }
}

async function nextOrderCode(em: EntityManager, scope: OrgScope): Promise<string> {
  const count = await em.count(ProductionPlanningOrder, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })
  const seq = String(count + 1).padStart(5, '0')
  return `PO-${seq}`
}

export async function listProductionOrders(
  em: EntityManager,
  scope: OrgScope,
  filters?: { status?: ProductionOrderStatus; salesOrderId?: string; limit?: number },
): Promise<ProductionOrderDto[]> {
  const where: Record<string, unknown> = {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  }
  if (filters?.status) where.status = filters.status
  if (filters?.salesOrderId) where.salesOrderId = filters.salesOrderId

  const rows = await em.find(ProductionPlanningOrder, where, {
    orderBy: { plannedStartAt: 'ASC', createdAt: 'DESC' },
    limit: filters?.limit ?? 100,
  })

  return rows.map(mapProductionOrder)
}

export async function createProductionOrder(
  em: EntityManager,
  scope: OrgScope,
  body: CreateProductionOrderBody,
): Promise<ProductionOrderDto> {
  const order = em.create(ProductionPlanningOrder, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    code: body.code?.trim() || (await nextOrderCode(em, scope)),
    title: body.title.trim(),
    salesOrderId: body.salesOrderId ?? null,
    productSku: body.productSku ?? null,
    quantity: body.quantity ?? 1,
    status: 'planned',
    workCenterCode: body.workCenterCode ?? null,
    plannedStartAt: body.plannedStartAt ? new Date(body.plannedStartAt) : null,
    plannedEndAt: body.plannedEndAt ? new Date(body.plannedEndAt) : null,
    dueAt: body.dueAt ? new Date(body.dueAt) : null,
    notesJson: body.notes ? JSON.stringify({ notes: body.notes }) : null,
  })

  await em.persistAndFlush(order)

  await emitProductionPlanningEvent(
    'production_planning.order.created',
    {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      orderId: order.id,
      code: order.code,
      title: order.title,
      salesOrderId: order.salesOrderId,
    },
    { persistent: true },
  )

  return mapProductionOrder(order)
}

export async function getProductionOrder(
  em: EntityManager,
  scope: OrgScope,
  orderId: string,
): Promise<ProductionPlanningOrder | null> {
  return em.findOne(ProductionPlanningOrder, {
    id: orderId,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })
}

export async function listProductionOperations(
  em: EntityManager,
  scope: OrgScope,
  productionOrderId: string,
): Promise<ProductionOperationDto[]> {
  const rows = await em.find(
    ProductionPlanningOperation,
    {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      productionOrderId,
    },
    { orderBy: { sequenceNo: 'ASC' } },
  )
  return rows.map(mapProductionOperation)
}

export async function createProductionOperation(
  em: EntityManager,
  scope: OrgScope,
  productionOrderId: string,
  body: CreateProductionOperationBody,
): Promise<ProductionOperationDto> {
  const order = await getProductionOrder(em, scope, productionOrderId)
  if (!order) {
    throw new Error('PRODUCTION_ORDER_NOT_FOUND')
  }

  const existing = await em.count(ProductionPlanningOperation, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    productionOrderId,
  })

  const op = em.create(ProductionPlanningOperation, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    productionOrderId,
    sequenceNo: body.sequenceNo ?? existing + 1,
    name: body.name.trim(),
    workCenterCode: body.workCenterCode.trim(),
    durationMinutes: body.durationMinutes,
    status: 'pending',
    plannedStartAt: body.plannedStartAt ? new Date(body.plannedStartAt) : null,
    plannedEndAt: body.plannedEndAt ? new Date(body.plannedEndAt) : null,
  })

  await em.persistAndFlush(op)
  return mapProductionOperation(op)
}

export async function emitLateOrderEvents(
  em: EntityManager,
  scope: OrgScope,
): Promise<number> {
  const orders = await em.find(ProductionPlanningOrder, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    status: { $in: ['planned', 'in_progress'] },
  })

  let emitted = 0
  for (const order of orders) {
    if (!isOrderLate(order)) continue
    await emitProductionPlanningEvent(
      'production_planning.order.late',
      {
        tenantId: scope.tenantId,
        organizationId: scope.organizationId,
        orderId: order.id,
        code: order.code,
        title: order.title,
        dueAt: order.dueAt?.toISOString() ?? null,
      },
      { persistent: true },
    )
    emitted += 1
  }
  return emitted
}
