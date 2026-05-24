import { Migration } from '@mikro-orm/migrations'

export class Migration20260525120000_mes_trace_and_andon extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "mes_lots" ("id" uuid not null default gen_random_uuid(), "tenant_id" uuid not null, "organization_id" uuid not null, "lot_number" text not null, "product_code" text not null, "quantity" int not null, "status" text not null default 'active', "work_order_id" uuid null, "notes" text null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "mes_lots_pkey" primary key ("id"));`,
    )
    this.addSql(
      `create unique index if not exists "mes_lots_scope_lot_uidx" on "mes_lots" ("tenant_id", "organization_id", "lot_number");`,
    )
    this.addSql(
      `create index if not exists "mes_lots_scope_product_idx" on "mes_lots" ("tenant_id", "organization_id", "product_code");`,
    )
    this.addSql(
      `create index if not exists "mes_lots_work_order_idx" on "mes_lots" ("tenant_id", "organization_id", "work_order_id");`,
    )

    this.addSql(
      `create table if not exists "mes_material_consumptions" ("id" uuid not null default gen_random_uuid(), "tenant_id" uuid not null, "organization_id" uuid not null, "work_order_operation_id" uuid not null, "lot_id" uuid not null, "quantity" int not null, "consumed_at" timestamptz not null, constraint "mes_material_consumptions_pkey" primary key ("id"));`,
    )
    this.addSql(
      `create index if not exists "mes_material_consumptions_lot_idx" on "mes_material_consumptions" ("tenant_id", "organization_id", "lot_id");`,
    )
    this.addSql(
      `create index if not exists "mes_material_consumptions_op_idx" on "mes_material_consumptions" ("work_order_operation_id");`,
    )

    this.addSql(
      `create table if not exists "mes_andon_state" ("tenant_id" uuid not null, "organization_id" uuid not null, "last_escalation_level" int not null default 0, "last_notified_at" timestamptz null, "updated_at" timestamptz not null, constraint "mes_andon_state_pkey" primary key ("tenant_id", "organization_id"));`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "mes_andon_state" cascade;`)
    this.addSql(`drop table if exists "mes_material_consumptions" cascade;`)
    this.addSql(`drop table if exists "mes_lots" cascade;`)
  }
}
