import { Migration } from '@mikro-orm/migrations'

export class Migration20260523160000_helpdesk_internal_scope extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table "helpdesk_tickets" add column if not exists "visibility" text not null default 'internal';`,
    )
    this.addSql(
      `alter table "helpdesk_tickets" add column if not exists "requester_type" text not null default 'staff';`,
    )
    this.addSql(
      `alter table "helpdesk_tickets" add column if not exists "requester_user_id" uuid null;`,
    )
    this.addSql(
      `alter table "helpdesk_tickets" add column if not exists "team_queue" text not null default 'general';`,
    )
    this.addSql(
      `create index if not exists "helpdesk_tickets_scope_queue_idx" on "helpdesk_tickets" ("tenant_id", "organization_id", "team_queue", "status", "updated_at");`,
    )
    this.addSql(
      `create index if not exists "helpdesk_tickets_scope_visibility_idx" on "helpdesk_tickets" ("tenant_id", "organization_id", "visibility", "updated_at");`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "helpdesk_tickets_scope_visibility_idx";`)
    this.addSql(`drop index if exists "helpdesk_tickets_scope_queue_idx";`)
    this.addSql(`alter table "helpdesk_tickets" drop column if exists "team_queue";`)
    this.addSql(`alter table "helpdesk_tickets" drop column if exists "requester_user_id";`)
    this.addSql(`alter table "helpdesk_tickets" drop column if exists "requester_type";`)
    this.addSql(`alter table "helpdesk_tickets" drop column if exists "visibility";`)
  }
}
