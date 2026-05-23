import { Migration } from '@mikro-orm/migrations'

export class Migration20260523180000_production_planning_foundation extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "production_planning_orders" ("id" uuid not null default gen_random_uuid(), "tenant_id" uuid not null, "organization_id" uuid not null, "code" text not null, "title" text not null, "sales_order_id" uuid null, "product_sku" text null, "quantity" numeric(14,4) not null default 1, "status" text not null, "work_center_code" text null, "planned_start_at" timestamptz null, "planned_end_at" timestamptz null, "due_at" timestamptz null, "notes_json" text null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "production_planning_orders_pkey" primary key ("id"));`,
    )
    this.addSql(
      `create unique index if not exists "production_planning_orders_scope_code_uidx" on "production_planning_orders" ("tenant_id", "organization_id", "code");`,
    )
    this.addSql(
      `create index if not exists "production_planning_orders_scope_status_idx" on "production_planning_orders" ("tenant_id", "organization_id", "status", "planned_start_at");`,
    )
    this.addSql(
      `create index if not exists "production_planning_orders_sales_order_idx" on "production_planning_orders" ("tenant_id", "organization_id", "sales_order_id");`,
    )

    this.addSql(
      `create table if not exists "production_planning_operations" ("id" uuid not null default gen_random_uuid(), "tenant_id" uuid not null, "organization_id" uuid not null, "production_order_id" uuid not null, "sequence_no" int not null, "name" text not null, "work_center_code" text not null, "duration_minutes" int not null, "status" text not null default 'pending', "planned_start_at" timestamptz null, "planned_end_at" timestamptz null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "production_planning_operations_pkey" primary key ("id"));`,
    )
    this.addSql(
      `create index if not exists "production_planning_operations_order_seq_idx" on "production_planning_operations" ("tenant_id", "organization_id", "production_order_id", "sequence_no");`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "production_planning_operations" cascade;`)
    this.addSql(`drop table if exists "production_planning_orders" cascade;`)
  }
}
