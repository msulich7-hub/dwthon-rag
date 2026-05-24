import { Migration } from '@mikro-orm/migrations'

export class Migration20260523140000_helpdesk_tickets extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "helpdesk_ticket_counters" ("id" uuid not null default gen_random_uuid(), "tenant_id" uuid not null, "organization_id" uuid not null, "next_number" int not null default 1, "updated_at" timestamptz not null, constraint "helpdesk_ticket_counters_pkey" primary key ("id"));`,
    )
    this.addSql(
      `create unique index if not exists "helpdesk_ticket_counters_scope_uidx" on "helpdesk_ticket_counters" ("tenant_id", "organization_id");`,
    )

    this.addSql(
      `create table if not exists "helpdesk_tickets" ("id" uuid not null default gen_random_uuid(), "tenant_id" uuid not null, "organization_id" uuid not null, "ticket_key" text not null, "subject" text not null, "description" text not null, "status" text not null, "priority" text not null, "category" text null, "source" text not null, "reporter_email" text null, "reporter_name" text null, "assignee_user_id" uuid null, "company_id" uuid null, "person_id" uuid null, "deal_id" uuid null, "triage_json" text null, "resolved_at" timestamptz null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "helpdesk_tickets_pkey" primary key ("id"));`,
    )
    this.addSql(
      `create unique index if not exists "helpdesk_tickets_scope_key_uidx" on "helpdesk_tickets" ("tenant_id", "organization_id", "ticket_key");`,
    )
    this.addSql(
      `create index if not exists "helpdesk_tickets_scope_status_idx" on "helpdesk_tickets" ("tenant_id", "organization_id", "status", "updated_at");`,
    )
    this.addSql(
      `create index if not exists "helpdesk_tickets_company_idx" on "helpdesk_tickets" ("tenant_id", "organization_id", "company_id", "updated_at");`,
    )
    this.addSql(
      `create index if not exists "helpdesk_tickets_person_idx" on "helpdesk_tickets" ("tenant_id", "organization_id", "person_id", "updated_at");`,
    )

    this.addSql(
      `create table if not exists "helpdesk_ticket_comments" ("id" uuid not null default gen_random_uuid(), "tenant_id" uuid not null, "organization_id" uuid not null, "ticket_id" uuid not null, "author_user_id" uuid null, "author_name" text null, "body" text not null, "is_internal" boolean not null default false, "created_at" timestamptz not null, constraint "helpdesk_ticket_comments_pkey" primary key ("id"));`,
    )
    this.addSql(
      `create index if not exists "helpdesk_ticket_comments_ticket_idx" on "helpdesk_ticket_comments" ("tenant_id", "organization_id", "ticket_id", "created_at");`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "helpdesk_ticket_comments" cascade;`)
    this.addSql(`drop table if exists "helpdesk_tickets" cascade;`)
    this.addSql(`drop table if exists "helpdesk_ticket_counters" cascade;`)
  }
}
