import type { CommandBus } from '@open-mercato/shared/lib/commands'
import type { CommandRuntimeContext } from '@open-mercato/shared/lib/commands'

export type SalesOrderSummary = {
  id: string
  number: string | null
  status: string | null
}

/**
 * Resolves a sales order via command bus without patching core sales module.
 */
export async function loadSalesOrderSummary(
  commandBus: CommandBus,
  commandContext: CommandRuntimeContext,
  salesOrderId: string,
): Promise<SalesOrderSummary | null> {
  try {
    const result = await commandBus.execute<{
      id?: string
      number?: string | null
      status?: string | null
    }>('sales.orders.get', { id: salesOrderId }, commandContext)

    if (!result?.id) return null
    return {
      id: result.id,
      number: result.number ?? null,
      status: result.status ?? null,
    }
  } catch {
    return null
  }
}
