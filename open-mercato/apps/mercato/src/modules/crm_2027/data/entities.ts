import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/decorators/legacy'

@Entity({ tableName: 'crm_2027_deal_risk_flags' })
@Unique({ properties: ['tenantId', 'organizationId', 'dealId'] })
export class Crm2027DealRiskFlag {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid' })
  organizationId!: string

  @Property({ name: 'deal_id', type: 'uuid' })
  dealId!: string

  @Property({ name: 'deal_title', type: 'text' })
  dealTitle!: string

  @Property({ name: 'risk_level', type: 'text' })
  riskLevel!: 'medium' | 'high'

  @Property({ name: 'reasons_json', type: 'text' })
  reasonsJson!: string

  @Property({ name: 'sentiment_label', type: 'text', nullable: true })
  sentimentLabel?: string | null

  @Property({ name: 'days_since_last_activity', type: 'int', nullable: true })
  daysSinceLastActivity?: number | null

  @Property({ name: 'last_scanned_at', type: Date })
  lastScannedAt: Date = new Date()

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date() })
  updatedAt: Date = new Date()
}

@Entity({ tableName: 'crm_2027_deal_meetings' })
export class Crm2027DealMeeting {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid' })
  organizationId!: string

  @Property({ name: 'deal_id', type: 'uuid' })
  dealId!: string

  @Property({ type: 'text', nullable: true })
  title?: string | null

  @Property({ type: 'text', nullable: true })
  source?: string | null

  @Property({ name: 'external_id', type: 'text', nullable: true })
  externalId?: string | null

  @Property({ name: 'interaction_id', type: 'uuid', nullable: true })
  interactionId?: string | null

  @Property({ type: 'text' })
  transcript!: string

  @Property({ name: 'sentiment_json', type: 'text' })
  sentimentJson!: string

  @Property({ name: 'progression_json', type: 'text' })
  progressionJson!: string

  @Property({ name: 'risk_json', type: 'text', nullable: true })
  riskJson?: string | null

  @Property({ name: 'ingested_at', type: Date })
  ingestedAt: Date = new Date()

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date() })
  updatedAt: Date = new Date()
}
