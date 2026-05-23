import { z } from 'zod'

export const dealMeetingSourceSchema = z.enum(['manual', 'zoom', 'teams', 'gong'])

export const ingestDealMeetingBodySchema = z.object({
  transcript: z.string().trim().min(1).max(100_000),
  title: z.string().trim().max(500).optional(),
  source: dealMeetingSourceSchema.optional(),
})

export type IngestDealMeetingBody = z.infer<typeof ingestDealMeetingBodySchema>
