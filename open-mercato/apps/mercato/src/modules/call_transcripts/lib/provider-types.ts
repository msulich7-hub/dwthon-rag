export type TranscriptParticipant = {
  email?: string
  phone?: string
  displayName?: string
  role?: 'host' | 'participant'
}

export type TranscriptResult = {
  externalRecordingId: string
  sourceMeetingUrl?: string
  occurredAt: Date
  durationSec?: number
  language?: string
  title?: string
  text: string
  segments?: Array<{
    speaker?: string
    startSec: number
    endSec: number
    text: string
  }>
  participants: TranscriptParticipant[]
  providerMetadata?: Record<string, unknown>
  dealId?: string
}

export type ParticipantMatch = {
  email?: string
  phone?: string
  displayName?: string
  role?: string
  customerEntityId: string | null
  matchedVia: string | null
}
