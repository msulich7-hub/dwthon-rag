import { z } from 'zod'

const participantSchema = z
  .object({
    email: z.string().email().optional(),
    phone: z.string().trim().min(3).max(32).optional(),
    displayName: z.string().trim().max(200).optional(),
    role: z.enum(['host', 'participant']).optional(),
  })
  .refine((p) => Boolean(p.email?.trim() || p.phone?.trim()), {
    message: 'Each participant needs email or phone',
  })

export const transcriptResultSchema = z.object({
  externalRecordingId: z.string().trim().min(1).max(200),
  sourceMeetingUrl: z.string().url().optional(),
  occurredAt: z.coerce.date(),
  durationSec: z.number().int().positive().optional(),
  language: z.string().trim().max(16).optional(),
  title: z.string().trim().max(500).optional(),
  text: z.string().trim().min(1).max(500_000),
  segments: z
    .array(
      z.object({
        speaker: z.string().optional(),
        startSec: z.number(),
        endSec: z.number(),
        text: z.string(),
      }),
    )
    .optional(),
  participants: z.array(participantSchema).min(1),
  providerMetadata: z.record(z.string(), z.unknown()).optional(),
  dealId: z.string().uuid().optional(),
})

export type TranscriptResultInput = z.infer<typeof transcriptResultSchema>

export const callTranscriptIngestSchema = z.object({
  tenantId: z.string().uuid(),
  organizationId: z.string().uuid(),
  providerKey: z.enum(['zoom', 'gong', 'manual', 'stt']),
  transcript: transcriptResultSchema,
})

export type CallTranscriptIngestInput = z.infer<typeof callTranscriptIngestSchema>

export const providerMeetingWebhookSchema = z.object({
  dealId: z.string().uuid().optional(),
  transcript: z.string().trim().min(1).max(500_000),
  title: z.string().trim().max(500).optional(),
  externalId: z.string().trim().max(200).optional(),
  occurredAt: z.string().datetime().optional(),
  tenantId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
  participants: z.array(participantSchema).optional(),
  sourceMeetingUrl: z.string().url().optional(),
})
