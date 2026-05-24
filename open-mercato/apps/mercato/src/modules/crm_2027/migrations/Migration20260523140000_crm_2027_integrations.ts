import { Migration } from '@mikro-orm/migrations'

export class Migration20260523140000_crm_2027_integrations extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table "crm_2027_deal_meetings" add column if not exists "external_id" text null;`,
    )
    this.addSql(
      `alter table "crm_2027_deal_meetings" add column if not exists "interaction_id" uuid null;`,
    )
    this.addSql(
      `create index if not exists "crm_2027_deal_meetings_external_idx" on "crm_2027_deal_meetings" ("tenant_id", "organization_id", "source", "external_id");`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "crm_2027_deal_meetings_external_idx";`)
    this.addSql(`alter table "crm_2027_deal_meetings" drop column if exists "interaction_id";`)
    this.addSql(`alter table "crm_2027_deal_meetings" drop column if exists "external_id";`)
  }
}
