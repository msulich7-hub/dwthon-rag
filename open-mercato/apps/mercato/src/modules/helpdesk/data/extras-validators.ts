import { z } from 'zod'

export const cannedResponseBodySchema = z.object({
  title: z.string().trim().min(1).max(200),
  shortcut: z.string().trim().max(40).optional(),
  body: z.string().trim().min(1).max(50_000),
  category: z.string().trim().max(80).optional(),
  isInternal: z.boolean().optional(),
})

export const kbArticleBodySchema = z.object({
  title: z.string().trim().min(1).max(300),
  body: z.string().trim().min(1).max(200_000),
  category: z.string().trim().max(80).optional(),
  visibility: z.enum(['internal', 'agent']).optional(),
})

export const ticketLinkBodySchema = z.object({
  targetTicketId: z.string().uuid(),
  linkType: z.enum(['related', 'duplicate', 'blocks']).optional(),
})

export const timeEntryBodySchema = z.object({
  minutes: z.number().int().min(1).max(24 * 60),
  note: z.string().trim().max(2000).optional(),
})

export const csatBodySchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional(),
})

export const voiceIntentBodySchema = z.object({
  transcript: z.string().trim().min(1).max(8000),
  ticketId: z.string().uuid().optional(),
  locale: z.enum(['pl', 'en']).optional(),
})

export const voiceExecuteBodySchema = voiceIntentBodySchema.extend({
  confirm: z.boolean().optional(),
})

export const toneEnhanceBodySchema = z.object({
  draft: z.string().trim().min(1).max(50_000),
  tone: z.enum(['professional', 'empathetic', 'friendly']).optional(),
})
