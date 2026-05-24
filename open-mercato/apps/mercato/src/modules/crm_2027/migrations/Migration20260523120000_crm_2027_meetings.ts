import { Migration } from '@mikro-orm/migrations'

export class Migration20260523120000_crm_2027_meetings extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "crm_2027_deal_risk_flags" ("id" uuid not null default gen_random_uuid(), "tenant_id" uuid not null, "organization_id" uuid not null, "deal_id" uuid not null, "deal_title" text not null, "risk_level" text not null, "reasons_json" text not null, "sentiment_label" text null, "days_since_last_activity" int null, "last_scanned_at" timestamptz not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "crm_2027_deal_risk_flags_pkey" primary key ("id"));`,
    )
    this.addSql(
      `create unique index if not exists "crm_2027_deal_risk_flags_tenant_org_deal_uidx" on "crm_2027_deal_risk_flags" ("tenant_id", "organization_id", "deal_id");`,
    )

    this.addSql(
      `create table if not exists "crm_2027_deal_meetings" ("id" uuid not null default gen_random_uuid(), "tenant_id" uuid not null, "organization_id" uuid not null, "deal_id" uuid not null, "title" text null, "source" text null, "transcript" text not null, "sentiment_json" text not null, "progression_json" text not null, "risk_json" text null, "ingested_at" timestamptz not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "crm_2027_deal_meetings_pkey" primary key ("id"));`,
    )
    this.addSql(
      `create index if not exists "crm_2027_deal_meetings_scope_deal_idx" on "crm_2027_deal_meetings" ("tenant_id", "organization_id", "deal_id", "ingested_at");`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "crm_2027_deal_meetings" cascade;`)
    this.addSql(`drop table if exists "crm_2027_deal_risk_flags" cascade;`)
  }
}
