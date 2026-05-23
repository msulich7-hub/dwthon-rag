import { Entity, PrimaryKey, Property } from '@mikro-orm/decorators/legacy'

export type HelpdeskTicketStatus =
  | 'open'
  | 'in_progress'
  | 'waiting'
  | 'resolved'
  | 'closed'

export type HelpdeskTicketPriority = 'low' | 'medium' | 'high' | 'urgent'

/** Staff-only ticket vs customer-submitted request (JSM external request). */
export type HelpdeskTicketVisibility = 'internal' | 'customer'

export type HelpdeskRequesterType = 'staff' | 'customer'

export type HelpdeskTeamQueue = 'general' | 'it' | 'ops' | 'billing'

@Entity({ tableName: 'helpdesk_tickets' })
export class HelpdeskTicket {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid' })
  organizationId!: string

  @Property({ name: 'ticket_key', type: 'text' })
  ticketKey!: string

  @Property({ type: 'text' })
  subject!: string

  @Property({ type: 'text' })
  description!: string

  @Property({ type: 'text' })
  status!: HelpdeskTicketStatus

  @Property({ type: 'text' })
  priority!: HelpdeskTicketPriority

  @Property({ type: 'text', nullable: true })
  category?: string | null

  @Property({ type: 'text' })
  source!: string

  @Property({ type: 'text', default: 'internal' })
  visibility: HelpdeskTicketVisibility = 'internal'

  @Property({ name: 'requester_type', type: 'text', default: 'staff' })
  requesterType: HelpdeskRequesterType = 'staff'

  @Property({ name: 'requester_user_id', type: 'uuid', nullable: true })
  requesterUserId?: string | null

  @Property({ name: 'team_queue', type: 'text', default: 'general' })
  teamQueue: HelpdeskTeamQueue = 'general'

  @Property({ name: 'reporter_email', type: 'text', nullable: true })
  reporterEmail?: string | null

  @Property({ name: 'reporter_name', type: 'text', nullable: true })
  reporterName?: string | null

  @Property({ name: 'assignee_user_id', type: 'uuid', nullable: true })
  assigneeUserId?: string | null

  @Property({ name: 'company_id', type: 'uuid', nullable: true })
  companyId?: string | null

  @Property({ name: 'person_id', type: 'uuid', nullable: true })
  personId?: string | null

  @Property({ name: 'deal_id', type: 'uuid', nullable: true })
  dealId?: string | null

  @Property({ name: 'triage_json', type: 'text', nullable: true })
  triageJson?: string | null

  @Property({ name: 'resolved_at', type: Date, nullable: true })
  resolvedAt?: Date | null

  @Property({ name: 'sla_due_at', type: Date, nullable: true })
  slaDueAt?: Date | null

  @Property({ name: 'first_responded_at', type: Date, nullable: true })
  firstRespondedAt?: Date | null

  @Property({ name: 'csat_rating', type: 'int', nullable: true })
  csatRating?: number | null

  @Property({ name: 'csat_comment', type: 'text', nullable: true })
  csatComment?: string | null

  @Property({ name: 'summary_json', type: 'text', nullable: true })
  summaryJson?: string | null

  @Property({ name: 'portal_token_hash', type: 'text', nullable: true })
  portalTokenHash?: string | null

  @Property({ name: 'portal_public_url', type: 'text', nullable: true })
  portalPublicUrl?: string | null

  @Property({ name: 'sla_breach_notified_at', type: Date, nullable: true })
  slaBreachNotifiedAt?: Date | null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date() })
  updatedAt: Date = new Date()
}

@Entity({ tableName: 'helpdesk_ticket_comments' })
export class HelpdeskTicketComment {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid' })
  organizationId!: string

  @Property({ name: 'ticket_id', type: 'uuid' })
  ticketId!: string

  @Property({ name: 'author_user_id', type: 'uuid', nullable: true })
  authorUserId?: string | null

  @Property({ name: 'author_name', type: 'text', nullable: true })
  authorName?: string | null

  @Property({ type: 'text' })
  body!: string

  @Property({ name: 'is_internal', type: 'boolean', default: false })
  isInternal: boolean = false

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()
}

@Entity({ tableName: 'helpdesk_ticket_counters' })
export class HelpdeskTicketCounter {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid' })
  organizationId!: string

  @Property({ name: 'next_number', type: 'int', default: 1 })
  nextNumber: number = 1

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date() })
  updatedAt: Date = new Date()
}

@Entity({ tableName: 'helpdesk_canned_responses' })
export class HelpdeskCannedResponse {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid' })
  organizationId!: string

  @Property({ type: 'text' })
  title!: string

  @Property({ type: 'text', nullable: true })
  shortcut?: string | null

  @Property({ type: 'text' })
  body!: string

  @Property({ type: 'text', nullable: true })
  category?: string | null

  @Property({ name: 'is_internal', type: 'boolean', default: false })
  isInternal: boolean = false

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date() })
  updatedAt: Date = new Date()
}

@Entity({ tableName: 'helpdesk_kb_articles' })
export class HelpdeskKbArticle {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid' })
  organizationId!: string

  @Property({ type: 'text' })
  title!: string

  @Property({ type: 'text' })
  slug!: string

  @Property({ type: 'text' })
  body!: string

  @Property({ type: 'text', nullable: true })
  category?: string | null

  @Property({ type: 'text', default: 'internal' })
  visibility: string = 'internal'

  @Property({ name: 'source_ticket_id', type: 'uuid', nullable: true })
  sourceTicketId?: string | null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date() })
  updatedAt: Date = new Date()
}

@Entity({ tableName: 'helpdesk_ticket_watchers' })
export class HelpdeskTicketWatcher {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid' })
  organizationId!: string

  @Property({ name: 'ticket_id', type: 'uuid' })
  ticketId!: string

  @Property({ name: 'user_id', type: 'uuid' })
  userId!: string

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()
}

export type HelpdeskTicketLinkType = 'related' | 'duplicate' | 'blocks'

@Entity({ tableName: 'helpdesk_ticket_links' })
export class HelpdeskTicketLink {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid' })
  organizationId!: string

  @Property({ name: 'source_ticket_id', type: 'uuid' })
  sourceTicketId!: string

  @Property({ name: 'target_ticket_id', type: 'uuid' })
  targetTicketId!: string

  @Property({ name: 'link_type', type: 'text', default: 'related' })
  linkType: HelpdeskTicketLinkType = 'related'

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()
}

@Entity({ tableName: 'helpdesk_time_entries' })
export class HelpdeskTimeEntry {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid' })
  organizationId!: string

  @Property({ name: 'ticket_id', type: 'uuid' })
  ticketId!: string

  @Property({ name: 'user_id', type: 'uuid' })
  userId!: string

  @Property({ type: 'int' })
  minutes!: number

  @Property({ type: 'text', nullable: true })
  note?: string | null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()
}
