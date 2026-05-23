import { z } from 'zod'

export const mesWorkOrderStatusSchema = z.enum([
  'draft',
  'planned',
  'in_progress',
  'completed',
  'cancelled',
])

export const createWorkOrderBodySchema = z.object({
  productCode: z.string().trim().min(1).max(120),
  quantity: z.number().int().positive().max(1_000_000),
  orderNumber: z.string().trim().min(1).max(64).optional(),
  dealId: z.string().uuid().optional(),
  notes: z.string().trim().max(4000).optional(),
  status: mesWorkOrderStatusSchema.optional(),
})

export const updateWorkOrderStatusBodySchema = z.object({
  status: mesWorkOrderStatusSchema,
})

export const listWorkOrdersQuerySchema = z.object({
  dealId: z.string().uuid().optional(),
  status: mesWorkOrderStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
})

export type CreateWorkOrderBody = z.infer<typeof createWorkOrderBodySchema>
export type UpdateWorkOrderStatusBody = z.infer<typeof updateWorkOrderStatusBodySchema>
