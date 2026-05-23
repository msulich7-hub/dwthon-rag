import { Migration } from '@mikro-orm/migrations'

export class Migration20260523210000_helpdesk_portal extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table "helpdesk_tickets" add column if not exists "portal_token_hash" text null;`,
    )
    this.addSql(
      `create unique index if not exists "helpdesk_tickets_portal_token_uidx" on "helpdesk_tickets" ("tenant_id", "organization_id", "portal_token_hash") where "portal_token_hash" is not null;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "helpdesk_tickets_portal_token_uidx";`)
    this.addSql(`alter table "helpdesk_tickets" drop column if exists "portal_token_hash";`)
  }
}
