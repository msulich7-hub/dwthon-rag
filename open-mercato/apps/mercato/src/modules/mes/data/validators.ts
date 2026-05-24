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
  salesOrderId: z.string().uuid().optional(),
  notes: z.string().trim().max(4000).optional(),
  status: mesWorkOrderStatusSchema.optional(),
})

export const updateWorkOrderStatusBodySchema = z.object({
  status: mesWorkOrderStatusSchema,
})

export const listWorkOrdersQuerySchema = z.object({
  dealId: z.string().uuid().optional(),
  salesOrderId: z.string().uuid().optional(),
  status: mesWorkOrderStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
})

export type CreateWorkOrderBody = z.infer<typeof createWorkOrderBodySchema>
export type UpdateWorkOrderStatusBody = z.infer<typeof updateWorkOrderStatusBodySchema>

export const routingTemplateStepSchema = z.object({
  sequence: z.number().int().positive(),
  operationCode: z.string().trim().min(1).max(64),
  operationName: z.string().trim().min(1).max(200),
  workCenterCode: z.string().trim().max(64).optional(),
  setupMinutes: z.number().int().min(0).optional(),
  runMinutesPerUnit: z.number().min(0).optional(),
})

export const createRoutingTemplateBodySchema = z.object({
  code: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(200),
  productCode: z.string().trim().min(1).max(120),
  notes: z.string().trim().max(4000).optional(),
  steps: z.array(routingTemplateStepSchema).min(1).optional(),
})

export const replaceRoutingTemplateStepsBodySchema = z.object({
  steps: z.array(routingTemplateStepSchema).min(1),
})

export const applyRoutingBodySchema = z.object({
  routingTemplateId: z.string().uuid().optional(),
})

export const operationConfirmationBodySchema = z.object({
  confirmationType: z.enum(['start', 'complete', 'partial']),
  goodQty: z.number().int().min(0).optional(),
  scrapQty: z.number().int().min(0).optional(),
  notes: z.string().trim().max(2000).optional(),
})

export const listDispatchQueueQuerySchema = z.object({
  workCenterCode: z.string().trim().max(64).optional(),
  status: z.enum(['ready', 'in_progress']).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
})
