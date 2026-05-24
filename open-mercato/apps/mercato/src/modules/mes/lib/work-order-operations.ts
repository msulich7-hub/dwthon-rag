import type { EntityManager } from '@mikro-orm/postgresql'
import {
  MesRoutingTemplateStep,
  MesWorkOrder,
  MesWorkOrderOperation,
  type MesWorkOrderOperationStatus,
} from '../data/entities'
import { emitMesEvent } from '../events'
import { findActiveTemplateForProduct } from './routing-templates'

export type MesScope = { tenantId: string; organizationId: string }

export type WorkOrderOperationDto = {
  id: string
  workOrderId: string
  sequence: number
  operationCode: string
  operationName: string
  workCenterCode: string | null
  status: MesWorkOrderOperationStatus
  plannedQty: number
  completedQty: number
  scrapQty: number
  startedAt: string | null
  completedAt: string | null
}

function toDto(op: MesWorkOrderOperation): WorkOrderOperationDto {
  return {
    id: op.id,
    workOrderId: op.workOrderId,
    sequence: op.sequence,
    operationCode: op.operationCode,
    operationName: op.operationName,
    workCenterCode: op.workCenterCode ?? null,
    status: op.status,
    plannedQty: op.plannedQty,
    completedQty: op.completedQty,
    scrapQty: op.scrapQty,
    startedAt: op.startedAt?.toISOString() ?? null,
    completedAt: op.completedAt?.toISOString() ?? null,
  }
}

export async function listWorkOrderOperations(
  em: EntityManager,
  scope: MesScope,
  workOrderId: string,
): Promise<WorkOrderOperationDto[]> {
  const ops = await em.find(
    MesWorkOrderOperation,
    {
      workOrderId,
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
    },
    { orderBy: { sequence: 'ASC' } },
  )
  return ops.map(toDto)
}

export async function applyRoutingToWorkOrder(
  em: EntityManager,
  scope: MesScope,
  workOrderId: string,
  routingTemplateId?: string,
): Promise<{ operations: WorkOrderOperationDto[]; routingTemplateId: string }> {
  const workOrder = await em.findOne(MesWorkOrder, {
    id: workOrderId,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })
  if (!workOrder) throw new Error('WORK_ORDER_NOT_FOUND')

  if (!['draft', 'planned'].includes(workOrder.status)) {
    throw new Error('WORK_ORDER_NOT_RELEASABLE')
  }

  const existing = await em.count(MesWorkOrderOperation, {
    workOrderId,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    status: { $nin: ['cancelled'] },
  })
  if (existing > 0) throw new Error('OPERATIONS_ALREADY_EXIST')

  const template = await findActiveTemplateForProduct(
    em,
    scope,
    workOrder.productCode,
    routingTemplateId,
  )
  if (!template) throw new Error('ROUTING_TEMPLATE_NOT_FOUND')

  const steps = await em.find(
    MesRoutingTemplateStep,
    { routingTemplateId: template.id },
    { orderBy: { sequence: 'ASC' } },
  )
  if (!steps.length) throw new Error('ROUTING_HAS_NO_STEPS')

  const operations: MesWorkOrderOperation[] = []
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    const status: MesWorkOrderOperationStatus = i === 0 ? 'ready' : 'pending'
    const op = em.create(MesWorkOrderOperation, {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      workOrderId: workOrder.id,
      sequence: step.sequence,
      operationCode: step.operationCode,
      operationName: step.operationName,
      workCenterCode: step.workCenterCode ?? null,
      status,
      routingTemplateStepId: step.id,
      plannedQty: workOrder.quantity,
      completedQty: 0,
      scrapQty: 0,
    })
    operations.push(op)
  }

  if (workOrder.status === 'draft') {
    workOrder.status = 'planned'
  }

  await em.flush()

  await emitMesEvent('mes.work_order.operations_applied', {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    workOrderId: workOrder.id,
    routingTemplateId: template.id,
    operationCount: operations.length,
  })

  return {
    operations: operations.map(toDto),
    routingTemplateId: template.id,
  }
}

export async function promoteNextOperation(
  em: EntityManager,
  scope: MesScope,
  workOrderId: string,
  completedSequence: number,
): Promise<void> {
  const next = await em.findOne(
    MesWorkOrderOperation,
    {
      workOrderId,
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      sequence: { $gt: completedSequence },
      status: 'pending',
    },
    { orderBy: { sequence: 'ASC' } },
  )
  if (next) {
    next.status = 'ready'
    await em.flush()
  }
}

export async function allOperationsCompleted(
  em: EntityManager,
  scope: MesScope,
  workOrderId: string,
): Promise<boolean> {
  const incomplete = await em.count(MesWorkOrderOperation, {
    workOrderId,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    status: { $nin: ['completed', 'skipped', 'cancelled'] },
  })
  return incomplete === 0
}
