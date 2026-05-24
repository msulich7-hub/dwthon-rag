import { Migration } from '@mikro-orm/migrations'

export class Migration20260523220000_helpdesk_v06 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "helpdesk_tickets" add column if not exists "portal_public_url" text null;`)
    this.addSql(
      `alter table "helpdesk_tickets" add column if not exists "sla_breach_notified_at" timestamptz null;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "helpdesk_tickets" drop column if exists "sla_breach_notified_at";`)
    this.addSql(`alter table "helpdesk_tickets" drop column if exists "portal_public_url";`)
  }
}
