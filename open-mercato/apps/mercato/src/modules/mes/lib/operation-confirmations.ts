import type { EntityManager } from '@mikro-orm/postgresql'
import {
  MesOperationConfirmation,
  MesWorkOrder,
  MesWorkOrderOperation,
} from '../data/entities'
import type { OperationConfirmationBody } from '../data/validators'
import { emitMesEvent } from '../events'
import {
  canTransitionOperationStatus,
  isOperationQtyComplete,
} from './operation-status'
import {
  allOperationsCompleted,
  promoteNextOperation,
} from './work-order-operations'
import { canTransitionWorkOrderStatus } from './work-order-status'
import { updateWorkOrderStatus } from './work-orders'

export type MesScope = { tenantId: string; organizationId: string }

export type OperationConfirmationDto = {
  id: string
  workOrderOperationId: string
  confirmationType: string
  goodQty: number
  scrapQty: number
  confirmedAt: string
}

export async function confirmWorkOrderOperation(
  em: EntityManager,
  scope: MesScope,
  workOrderId: string,
  operationId: string,
  body: OperationConfirmationBody,
  operatorId?: string | null,
): Promise<{
  operation: ReturnType<typeof toOpDto>
  confirmation: OperationConfirmationDto
  workOrderCompleted: boolean
}> {
  const operation = await em.findOne(MesWorkOrderOperation, {
    id: operationId,
    workOrderId,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })
  if (!operation) throw new Error('OPERATION_NOT_FOUND')

  const workOrder = await em.findOne(MesWorkOrder, {
    id: workOrderId,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })
  if (!workOrder) throw new Error('WORK_ORDER_NOT_FOUND')

  const fromStatus = operation.status

  if (body.confirmationType === 'start') {
    if (!canTransitionOperationStatus(operation.status, 'in_progress')) {
      throw new Error('INVALID_STATUS_TRANSITION')
    }
    if (operation.status !== 'ready') {
      throw new Error('INVALID_STATUS_TRANSITION')
    }

    const priorIncomplete = await em.count(MesWorkOrderOperation, {
      workOrderId,
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      sequence: { $lt: operation.sequence },
      status: { $nin: ['completed', 'skipped'] },
    })
    if (priorIncomplete > 0) throw new Error('PRIOR_OPERATIONS_INCOMPLETE')

    operation.status = 'in_progress'
    operation.startedAt = new Date()

    if (workOrder.status === 'planned' && canTransitionWorkOrderStatus(workOrder.status, 'in_progress')) {
      workOrder.status = 'in_progress'
    }
  } else {
    if (operation.status === 'ready') {
      operation.status = 'in_progress'
      operation.startedAt = new Date()
      if (workOrder.status === 'planned') {
        workOrder.status = 'in_progress'
      }
    }

    const goodQty = body.goodQty ?? 0
    const scrapQty = body.scrapQty ?? 0
    if (goodQty + scrapQty <= 0 && body.confirmationType !== 'complete') {
      throw new Error('INVALID_CONFIRMATION_QTY')
    }

    const newCompleted = operation.completedQty + goodQty
    const newScrap = operation.scrapQty + scrapQty
    if (newCompleted + newScrap > operation.plannedQty) {
      throw new Error('INVALID_CONFIRMATION_QTY')
    }

    operation.completedQty = newCompleted
    operation.scrapQty = newScrap

    if (isOperationQtyComplete(operation.plannedQty, newCompleted, newScrap)) {
      if (!canTransitionOperationStatus(operation.status, 'completed')) {
        throw new Error('INVALID_STATUS_TRANSITION')
      }
      operation.status = 'completed'
      operation.completedAt = new Date()
      await promoteNextOperation(em, scope, workOrderId, operation.sequence)
    } else if (operation.status === 'ready') {
      operation.status = 'in_progress'
      operation.startedAt = operation.startedAt ?? new Date()
      if (workOrder.status === 'planned') {
        workOrder.status = 'in_progress'
      }
    }
  }

  const confirmation = em.create(MesOperationConfirmation, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    workOrderOperationId: operation.id,
    confirmationType: body.confirmationType,
    goodQty: body.goodQty ?? 0,
    scrapQty: body.scrapQty ?? 0,
    operatorId: operatorId ?? null,
    notes: body.notes?.trim() ?? null,
  })

  await em.flush()

  await emitMesEvent('mes.operation.confirmed', {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    workOrderId,
    operationId: operation.id,
    confirmationType: body.confirmationType,
    goodQty: confirmation.goodQty,
    scrapQty: confirmation.scrapQty,
  })

  await emitMesEvent('mes.operation.status_changed', {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    workOrderId,
    operationId: operation.id,
    toStatus: operation.status,
    fromStatus,
  })

  let workOrderCompleted = false
  if (await allOperationsCompleted(em, scope, workOrderId)) {
    if (workOrder.status === 'in_progress') {
      await updateWorkOrderStatus(em, scope, workOrderId, 'completed')
      workOrderCompleted = true
    }
  }

  return {
    operation: toOpDto(operation),
    confirmation: {
      id: confirmation.id,
      workOrderOperationId: confirmation.workOrderOperationId,
      confirmationType: confirmation.confirmationType,
      goodQty: confirmation.goodQty,
      scrapQty: confirmation.scrapQty,
      confirmedAt: confirmation.confirmedAt.toISOString(),
    },
    workOrderCompleted,
  }
}

function toOpDto(operation: MesWorkOrderOperation) {
  return {
    id: operation.id,
    workOrderId: operation.workOrderId,
    sequence: operation.sequence,
    operationCode: operation.operationCode,
    operationName: operation.operationName,
    workCenterCode: operation.workCenterCode ?? null,
    status: operation.status,
    plannedQty: operation.plannedQty,
    completedQty: operation.completedQty,
    scrapQty: operation.scrapQty,
    startedAt: operation.startedAt?.toISOString() ?? null,
    completedAt: operation.completedAt?.toISOString() ?? null,
  }
}
