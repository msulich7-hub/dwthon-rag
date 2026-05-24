import { z } from 'zod'

export const productionOrderStatusSchema = z.enum([
  'draft',
  'planned',
  'in_progress',
  'completed',
  'cancelled',
])

export const createProductionOrderBodySchema = z.object({
  title: z.string().trim().min(1).max(500),
  code: z.string().trim().min(1).max(80).optional(),
  salesOrderId: z.string().uuid().optional(),
  productSku: z.string().trim().max(120).optional(),
  quantity: z.number().positive().max(1_000_000).optional(),
  workCenterCode: z.string().trim().max(80).optional(),
  plannedStartAt: z.string().datetime().optional(),
  plannedEndAt: z.string().datetime().optional(),
  dueAt: z.string().datetime().optional(),
  notes: z.string().trim().max(5000).optional(),
})

export type CreateProductionOrderBody = z.infer<typeof createProductionOrderBodySchema>

export const listProductionOrdersQuerySchema = z.object({
  status: productionOrderStatusSchema.optional(),
  salesOrderId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
})

export const createProductionOperationBodySchema = z.object({
  name: z.string().trim().min(1).max(300),
  workCenterCode: z.string().trim().min(1).max(80),
  durationMinutes: z.number().int().min(1).max(60 * 24 * 14),
  sequenceNo: z.number().int().min(1).max(999).optional(),
  plannedStartAt: z.string().datetime().optional(),
  plannedEndAt: z.string().datetime().optional(),
})

export type CreateProductionOperationBody = z.infer<typeof createProductionOperationBodySchema>
