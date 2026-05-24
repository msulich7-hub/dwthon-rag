import { Migration } from '@mikro-orm/migrations'

export class Migration20260523200000_mes_foundation extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "mes_work_orders" ("id" uuid not null default gen_random_uuid(), "tenant_id" uuid not null, "organization_id" uuid not null, "order_number" text not null, "product_code" text not null, "quantity" int not null, "status" text not null, "deal_id" uuid null, "notes" text null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "mes_work_orders_pkey" primary key ("id"));`,
    )
    this.addSql(
      `create index if not exists "mes_work_orders_scope_status_idx" on "mes_work_orders" ("tenant_id", "organization_id", "status", "updated_at");`,
    )
    this.addSql(
      `create index if not exists "mes_work_orders_scope_deal_idx" on "mes_work_orders" ("tenant_id", "organization_id", "deal_id");`,
    )
    this.addSql(
      `create unique index if not exists "mes_work_orders_scope_order_number_uidx" on "mes_work_orders" ("tenant_id", "organization_id", "order_number");`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "mes_work_orders" cascade;`)
  }
}
