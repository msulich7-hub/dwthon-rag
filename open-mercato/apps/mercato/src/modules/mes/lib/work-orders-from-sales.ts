import type { EntityManager } from '@mikro-orm/postgresql'
import { MesWorkOrder } from '../data/entities'
import type { MesScope } from './sales-order-context'
import { loadSalesOrderContext } from './sales-order-context'
import { createWorkOrder, type WorkOrderDto } from './work-orders'

export type CreateFromSalesOrderResult = {
  salesOrderId: string
  orderNumber: string | null
  workOrders: WorkOrderDto[]
  skippedLineIds: string[]
}

export async function createWorkOrdersFromSalesOrder(
  em: EntityManager,
  scope: MesScope,
  salesOrderId: string,
  options?: { dealId?: string; skipExistingProductCodes?: boolean },
): Promise<CreateFromSalesOrderResult> {
  const context = await loadSalesOrderContext(em, scope, salesOrderId)
  if (!context.found) {
    throw new Error('SALES_ORDER_NOT_FOUND')
  }

  const existingCodes = new Set<string>()
  if (options?.skipExistingProductCodes) {
    const existing = await em.find(
      MesWorkOrder,
      {
        tenantId: scope.tenantId,
        organizationId: scope.organizationId,
        salesOrderId,
      },
      { fields: ['productCode'] },
    )
    for (const row of existing) {
      existingCodes.add(row.productCode)
    }
  }

  const workOrders: WorkOrderDto[] = []
  const skippedLineIds: string[] = []

  for (const line of context.lines) {
    if (existingCodes.has(line.productCode)) {
      skippedLineIds.push(line.lineId)
      continue
    }

    const workOrder = await createWorkOrder(em, scope, {
      productCode: line.productCode,
      quantity: line.quantity,
      salesOrderId,
      dealId: options?.dealId,
      notes: line.name ? `From sales line ${line.lineNumber}: ${line.name}` : undefined,
    })
    workOrders.push(workOrder)
    existingCodes.add(line.productCode)
  }

  return {
    salesOrderId,
    orderNumber: context.orderNumber,
    workOrders,
    skippedLineIds,
  }
}
