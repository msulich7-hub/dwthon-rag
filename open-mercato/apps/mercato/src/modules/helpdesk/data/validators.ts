import { z } from 'zod'

export const helpdeskTicketSourceSchema = z.enum(['manual', 'email', 'portal', 'api', 'chat'])

export const helpdeskTicketStatusSchema = z.enum([
  'open',
  'in_progress',
  'waiting',
  'resolved',
  'closed',
])

export const helpdeskTicketPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent'])

export const ingestHelpdeskTicketBodySchema = z.object({
  subject: z.string().trim().min(1).max(500),
  body: z.string().trim().min(1).max(100_000),
  source: helpdeskTicketSourceSchema.optional(),
  reporterEmail: z.string().trim().email().max(320).optional(),
  reporterName: z.string().trim().max(200).optional(),
  companyId: z.string().uuid().optional(),
  personId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  category: z.string().trim().max(120).optional(),
})

export type IngestHelpdeskTicketBody = z.infer<typeof ingestHelpdeskTicketBodySchema>

export const createHelpdeskTicketBodySchema = ingestHelpdeskTicketBodySchema.extend({
  priority: helpdeskTicketPrioritySchema.optional(),
  status: helpdeskTicketStatusSchema.optional(),
  assigneeUserId: z.string().uuid().optional(),
})

export type CreateHelpdeskTicketBody = z.infer<typeof createHelpdeskTicketBodySchema>

export const updateHelpdeskTicketBodySchema = z
  .object({
    status: helpdeskTicketStatusSchema.optional(),
    priority: helpdeskTicketPrioritySchema.optional(),
    assigneeUserId: z.string().uuid().nullable().optional(),
    category: z.string().trim().max(120).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one field required' })

export type UpdateHelpdeskTicketBody = z.infer<typeof updateHelpdeskTicketBodySchema>

export const createTicketCommentBodySchema = z.object({
  body: z.string().trim().min(1).max(50_000),
  isInternal: z.boolean().optional(),
  authorName: z.string().trim().max(200).optional(),
})

export type CreateTicketCommentBody = z.infer<typeof createTicketCommentBodySchema>
