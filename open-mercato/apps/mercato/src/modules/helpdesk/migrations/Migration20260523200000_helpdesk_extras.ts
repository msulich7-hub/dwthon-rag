import { Migration } from '@mikro-orm/migrations'

export class Migration20260523200000_helpdesk_extras extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "helpdesk_canned_responses" ("id" uuid not null default gen_random_uuid(), "tenant_id" uuid not null, "organization_id" uuid not null, "title" text not null, "shortcut" text null, "body" text not null, "category" text null, "is_internal" boolean not null default false, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "helpdesk_canned_responses_pkey" primary key ("id"));`,
    )
    this.addSql(
      `create index if not exists "helpdesk_canned_responses_scope_idx" on "helpdesk_canned_responses" ("tenant_id", "organization_id", "category");`,
    )

    this.addSql(
      `create table if not exists "helpdesk_kb_articles" ("id" uuid not null default gen_random_uuid(), "tenant_id" uuid not null, "organization_id" uuid not null, "title" text not null, "slug" text not null, "body" text not null, "category" text null, "visibility" text not null default 'internal', "source_ticket_id" uuid null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "helpdesk_kb_articles_pkey" primary key ("id"));`,
    )
    this.addSql(
      `create unique index if not exists "helpdesk_kb_articles_slug_uidx" on "helpdesk_kb_articles" ("tenant_id", "organization_id", "slug");`,
    )

    this.addSql(
      `create table if not exists "helpdesk_ticket_watchers" ("id" uuid not null default gen_random_uuid(), "tenant_id" uuid not null, "organization_id" uuid not null, "ticket_id" uuid not null, "user_id" uuid not null, "created_at" timestamptz not null, constraint "helpdesk_ticket_watchers_pkey" primary key ("id"));`,
    )
    this.addSql(
      `create unique index if not exists "helpdesk_ticket_watchers_uidx" on "helpdesk_ticket_watchers" ("tenant_id", "organization_id", "ticket_id", "user_id");`,
    )

    this.addSql(
      `create table if not exists "helpdesk_ticket_links" ("id" uuid not null default gen_random_uuid(), "tenant_id" uuid not null, "organization_id" uuid not null, "source_ticket_id" uuid not null, "target_ticket_id" uuid not null, "link_type" text not null default 'related', "created_at" timestamptz not null, constraint "helpdesk_ticket_links_pkey" primary key ("id"));`,
    )
    this.addSql(
      `create unique index if not exists "helpdesk_ticket_links_pair_uidx" on "helpdesk_ticket_links" ("tenant_id", "organization_id", "source_ticket_id", "target_ticket_id");`,
    )

    this.addSql(
      `create table if not exists "helpdesk_time_entries" ("id" uuid not null default gen_random_uuid(), "tenant_id" uuid not null, "organization_id" uuid not null, "ticket_id" uuid not null, "user_id" uuid not null, "minutes" int not null, "note" text null, "created_at" timestamptz not null, constraint "helpdesk_time_entries_pkey" primary key ("id"));`,
    )
    this.addSql(
      `create index if not exists "helpdesk_time_entries_ticket_idx" on "helpdesk_time_entries" ("tenant_id", "organization_id", "ticket_id");`,
    )

    this.addSql(`alter table "helpdesk_tickets" add column if not exists "csat_rating" int null;`)
    this.addSql(`alter table "helpdesk_tickets" add column if not exists "csat_comment" text null;`)
    this.addSql(`alter table "helpdesk_tickets" add column if not exists "summary_json" text null;`)
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "helpdesk_tickets" drop column if exists "summary_json";`)
    this.addSql(`alter table "helpdesk_tickets" drop column if exists "csat_comment";`)
    this.addSql(`alter table "helpdesk_tickets" drop column if exists "csat_rating";`)
    this.addSql(`drop table if exists "helpdesk_time_entries" cascade;`)
    this.addSql(`drop table if exists "helpdesk_ticket_links" cascade;`)
    this.addSql(`drop table if exists "helpdesk_ticket_watchers" cascade;`)
    this.addSql(`drop table if exists "helpdesk_kb_articles" cascade;`)
    this.addSql(`drop table if exists "helpdesk_canned_responses" cascade;`)
  }
}
