import { z } from 'zod'

export const helpdeskTicketSourceSchema = z.enum(['manual', 'email', 'portal', 'api', 'chat'])

export const helpdeskTicketVisibilitySchema = z.enum(['internal', 'customer'])

export const helpdeskRequesterTypeSchema = z.enum(['staff', 'customer'])

export const helpdeskTeamQueueSchema = z.enum(['general', 'it', 'ops', 'billing'])

export const helpdeskTicketStatusSchema = z.enum([
  'open',
  'in_progress',
  'waiting',
  'resolved',
  'closed',
])

export const helpdeskTicketPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent'])

export const helpdeskAgentQueueSchema = z.enum([
  'all',
  'my_work',
  'unassigned',
  'internal',
  'customer_requests',
  'it',
  'ops',
  'billing',
])

const ticketBodyFields = {
  subject: z.string().trim().min(1).max(500),
  body: z.string().trim().min(1).max(100_000),
  source: helpdeskTicketSourceSchema.optional(),
  reporterEmail: z.string().trim().email().max(320).optional(),
  reporterName: z.string().trim().max(200).optional(),
  companyId: z.string().uuid().optional(),
  personId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  category: z.string().trim().max(120).optional(),
  teamQueue: helpdeskTeamQueueSchema.optional(),
}

/** Customer channel — email, portal webhook, chat handoff. */
export const ingestHelpdeskTicketBodySchema = z.object({
  ...ticketBodyFields,
})

export type IngestHelpdeskTicketBody = z.infer<typeof ingestHelpdeskTicketBodySchema>

/** Staff internal request (employee self-service to IT/ops). */
export const internalHelpdeskRequestBodySchema = z.object({
  ...ticketBodyFields,
  teamQueue: helpdeskTeamQueueSchema.optional(),
})

export type InternalHelpdeskRequestBody = z.infer<typeof internalHelpdeskRequestBodySchema>

export const createHelpdeskTicketBodySchema = ingestHelpdeskTicketBodySchema.extend({
  priority: helpdeskTicketPrioritySchema.optional(),
  status: helpdeskTicketStatusSchema.optional(),
  assigneeUserId: z.string().uuid().optional(),
  visibility: helpdeskTicketVisibilitySchema.optional(),
  requesterType: helpdeskRequesterTypeSchema.optional(),
  teamQueue: helpdeskTeamQueueSchema.optional(),
})

export type CreateHelpdeskTicketBody = z.infer<typeof createHelpdeskTicketBodySchema>

export const updateHelpdeskTicketBodySchema = z
  .object({
    status: helpdeskTicketStatusSchema.optional(),
    priority: helpdeskTicketPrioritySchema.optional(),
    assigneeUserId: z.string().uuid().nullable().optional(),
    category: z.string().trim().max(120).nullable().optional(),
    teamQueue: helpdeskTeamQueueSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one field required' })

export type UpdateHelpdeskTicketBody = z.infer<typeof updateHelpdeskTicketBodySchema>

export const createTicketCommentBodySchema = z.object({
  body: z.string().trim().min(1).max(50_000),
  isInternal: z.boolean().optional(),
  authorName: z.string().trim().max(200).optional(),
})

export type CreateTicketCommentBody = z.infer<typeof createTicketCommentBodySchema>
