import { Migration } from '@mikro-orm/migrations'

export class Migration20260526120000_mes_genealogy extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "mes_serials" ("id" uuid not null default gen_random_uuid(), "tenant_id" uuid not null, "organization_id" uuid not null, "serial_number" text not null, "product_code" text not null, "work_order_id" uuid null, "output_lot_id" uuid null, "status" text not null default 'active', "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "mes_serials_pkey" primary key ("id"));`,
    )
    this.addSql(
      `create unique index if not exists "mes_serials_scope_serial_uidx" on "mes_serials" ("tenant_id", "organization_id", "serial_number");`,
    )

    this.addSql(
      `create table if not exists "mes_production_outputs" ("id" uuid not null default gen_random_uuid(), "tenant_id" uuid not null, "organization_id" uuid not null, "work_order_id" uuid not null, "work_order_operation_id" uuid null, "output_lot_id" uuid not null, "serial_id" uuid null, "product_code" text not null, "quantity" int not null, "produced_at" timestamptz not null, constraint "mes_production_outputs_pkey" primary key ("id"));`,
    )
    this.addSql(
      `create index if not exists "mes_production_outputs_wo_idx" on "mes_production_outputs" ("tenant_id", "organization_id", "work_order_id");`,
    )
    this.addSql(
      `create unique index if not exists "mes_production_outputs_wo_uidx" on "mes_production_outputs" ("tenant_id", "organization_id", "work_order_id");`,
    )

    this.addSql(
      `create table if not exists "mes_genealogy_edges" ("id" uuid not null default gen_random_uuid(), "tenant_id" uuid not null, "organization_id" uuid not null, "relation" text not null, "parent_type" text not null, "parent_id" uuid not null, "child_type" text not null, "child_id" uuid not null, "work_order_id" uuid null, "quantity" int null, "created_at" timestamptz not null, constraint "mes_genealogy_edges_pkey" primary key ("id"));`,
    )
    this.addSql(
      `create index if not exists "mes_genealogy_edges_parent_idx" on "mes_genealogy_edges" ("tenant_id", "organization_id", "parent_type", "parent_id");`,
    )
    this.addSql(
      `create index if not exists "mes_genealogy_edges_child_idx" on "mes_genealogy_edges" ("tenant_id", "organization_id", "child_type", "child_id");`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "mes_genealogy_edges" cascade;`)
    this.addSql(`drop table if exists "mes_production_outputs" cascade;`)
    this.addSql(`drop table if exists "mes_serials" cascade;`)
  }
}
