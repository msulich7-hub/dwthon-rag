import { z } from 'zod'

export const dealMeetingSourceSchema = z.enum(['manual', 'zoom', 'teams', 'gong'])

export const ingestDealMeetingBodySchema = z.object({
  transcript: z.string().trim().min(1).max(100_000),
  title: z.string().trim().max(500).optional(),
  source: dealMeetingSourceSchema.optional(),
})

export type IngestDealMeetingBody = z.infer<typeof ingestDealMeetingBodySchema>

export const providerMeetingWebhookSchema = z.object({
  dealId: z.string().uuid(),
  transcript: z.string().trim().min(1).max(100_000),
  title: z.string().trim().max(500).optional(),
  externalId: z.string().trim().max(200).optional(),
  occurredAt: z.string().datetime().optional(),
  tenantId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
})

export const sttTranscribeSchema = z.object({
  transcript: z.string().trim().min(1).max(100_000).optional(),
  audioUrl: z.string().url().optional(),
  dealId: z.string().uuid().optional(),
})

export const emailSyncBodySchema = z.object({
  days: z.number().int().min(1).max(90).optional(),
  limit: z.number().int().min(1).max(200).optional(),
})
