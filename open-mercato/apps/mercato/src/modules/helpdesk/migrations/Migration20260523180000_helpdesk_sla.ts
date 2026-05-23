import { Migration } from '@mikro-orm/migrations'

export class Migration20260523180000_helpdesk_sla extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table "helpdesk_tickets" add column if not exists "sla_due_at" timestamptz null;`,
    )
    this.addSql(
      `alter table "helpdesk_tickets" add column if not exists "first_responded_at" timestamptz null;`,
    )
    this.addSql(
      `create index if not exists "helpdesk_tickets_sla_due_idx" on "helpdesk_tickets" ("tenant_id", "organization_id", "sla_due_at");`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "helpdesk_tickets_sla_due_idx";`)
    this.addSql(`alter table "helpdesk_tickets" drop column if exists "first_responded_at";`)
    this.addSql(`alter table "helpdesk_tickets" drop column if exists "sla_due_at";`)
  }
}
