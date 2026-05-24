import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/decorators/legacy'

export type CallTranscriptProjectionStatus =
  | 'pending'
  | 'projected'
  | 'unmatched'
  | 'projection_failed'

@Entity({ tableName: 'call_transcripts' })
@Unique({ properties: ['tenantId', 'providerKey', 'externalRecordingId'] })
export class CallTranscript {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid' })
  organizationId!: string

  @Property({ name: 'provider_key', type: 'text' })
  providerKey!: string

  @Property({ name: 'external_recording_id', type: 'text' })
  externalRecordingId!: string

  @Property({ name: 'source_meeting_url', type: 'text', nullable: true })
  sourceMeetingUrl?: string | null

  @Property({ name: 'occurred_at', type: Date })
  occurredAt!: Date

  @Property({ name: 'duration_sec', type: 'int', nullable: true })
  durationSec?: number | null

  @Property({ type: 'text', nullable: true })
  language?: string | null

  @Property({ type: 'text', nullable: true })
  title?: string | null

  @Property({ type: 'text' })
  text!: string

  @Property({ name: 'segments_json', type: 'text', nullable: true })
  segmentsJson?: string | null

  @Property({ name: 'provider_metadata_json', type: 'text', nullable: true })
  providerMetadataJson?: string | null

  @Property({ name: 'projection_status', type: 'text' })
  projectionStatus!: CallTranscriptProjectionStatus

  @Property({ name: 'interaction_id', type: 'uuid', nullable: true })
  interactionId?: string | null

  @Property({ name: 'primary_entity_id', type: 'uuid', nullable: true })
  primaryEntityId?: string | null

  @Property({ name: 'deal_id', type: 'uuid', nullable: true })
  dealId?: string | null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date() })
  updatedAt: Date = new Date()
}

@Entity({ tableName: 'call_transcript_participants' })
export class CallTranscriptParticipant {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid' })
  organizationId!: string

  @Property({ name: 'call_transcript_id', type: 'uuid' })
  callTranscriptId!: string

  @Property({ type: 'text', nullable: true })
  email?: string | null

  @Property({ type: 'text', nullable: true })
  phone?: string | null

  @Property({ name: 'display_name', type: 'text', nullable: true })
  displayName?: string | null

  @Property({ type: 'text', nullable: true })
  role?: string | null

  @Property({ name: 'customer_entity_id', type: 'uuid', nullable: true })
  customerEntityId?: string | null

  @Property({ name: 'matched_via', type: 'text', nullable: true })
  matchedVia?: string | null
}

@Entity({ tableName: 'call_transcript_unmatched' })
export class CallTranscriptUnmatched {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid' })
  organizationId!: string

  @Property({ name: 'call_transcript_id', type: 'uuid' })
  @Unique()
  callTranscriptId!: string

  @Property({ name: 'participants_summary_json', type: 'text' })
  participantsSummaryJson!: string

  @Property({ type: 'text', default: 'pending' })
  status: string = 'pending'

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()
}
