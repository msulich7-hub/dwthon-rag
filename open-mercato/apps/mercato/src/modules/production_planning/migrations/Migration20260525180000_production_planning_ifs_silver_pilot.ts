import { Migration } from '@mikro-orm/migrations'

export class Migration20260525180000_production_planning_ifs_silver_pilot extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "production_planning_ifs_silver_customer_order_lines" (
        "id" uuid not null,
        "tenant_id" uuid not null,
        "organization_id" uuid not null,
        "contract" text not null default 'MAIN',
        "order_no" text not null,
        "line_no" int not null,
        "part_no" text not null,
        "buy_qty_due" numeric(14,4) not null default 1,
        "wanted_delivery_date" timestamptz null,
        "objstate" text not null default 'Released',
        "sales_order_id" uuid null,
        "source_system" text not null default 'mercato_pilot',
        "extract_batch_id" uuid not null,
        "extracted_at" timestamptz not null,
        "is_deleted" boolean not null default false,
        "last_seen_at" timestamptz not null,
        constraint "pp_ifs_silver_co_lines_pkey" primary key ("id")
      );`,
    )
    this.addSql(
      `create unique index if not exists "pp_ifs_silver_co_lines_natural_uidx" on "production_planning_ifs_silver_customer_order_lines" ("tenant_id", "organization_id", "contract", "order_no", "line_no");`,
    )

    this.addSql(
      `create table if not exists "production_planning_ifs_silver_shop_orders" (
        "id" uuid not null,
        "tenant_id" uuid not null,
        "organization_id" uuid not null,
        "contract" text not null default 'MAIN',
        "order_no" text not null,
        "part_no" text not null,
        "revised_qty_due" numeric(14,4) not null default 1,
        "revised_due_date" timestamptz null,
        "objstate" text not null default 'Released',
        "order_code" text null,
        "schedule_no" text null,
        "production_order_id" uuid null,
        "source_system" text not null default 'mercato_pilot',
        "extract_batch_id" uuid not null,
        "extracted_at" timestamptz not null,
        "is_deleted" boolean not null default false,
        "last_seen_at" timestamptz not null,
        constraint "pp_ifs_silver_shop_orders_pkey" primary key ("id")
      );`,
    )
    this.addSql(
      `create unique index if not exists "pp_ifs_silver_shop_orders_natural_uidx" on "production_planning_ifs_silver_shop_orders" ("tenant_id", "organization_id", "contract", "order_no");`,
    )

    this.addSql(
      `create table if not exists "production_planning_ifs_silver_shop_order_operations" (
        "id" uuid not null,
        "tenant_id" uuid not null,
        "organization_id" uuid not null,
        "contract" text not null default 'MAIN',
        "order_no" text not null,
        "release_no" int not null default 1,
        "sequence_no" int not null,
        "operation_no" int not null,
        "work_center_no" text not null,
        "run_time_minutes" int not null,
        "operation_id" uuid null,
        "source_system" text not null default 'mercato_pilot',
        "extract_batch_id" uuid not null,
        "extracted_at" timestamptz not null,
        "is_deleted" boolean not null default false,
        "last_seen_at" timestamptz not null,
        constraint "pp_ifs_silver_shop_ops_pkey" primary key ("id")
      );`,
    )
    this.addSql(
      `create unique index if not exists "pp_ifs_silver_shop_ops_natural_uidx" on "production_planning_ifs_silver_shop_order_operations" ("tenant_id", "organization_id", "contract", "order_no", "release_no", "sequence_no", "operation_no");`,
    )

    this.addSql(
      `create table if not exists "production_planning_ifs_silver_supply_demand_pegs" (
        "id" uuid not null,
        "tenant_id" uuid not null,
        "organization_id" uuid not null,
        "contract" text not null default 'MAIN',
        "demand_code" text not null,
        "supply_code" text not null,
        "demand_order_no" text not null,
        "supply_order_no" text not null,
        "demand_sequence" int not null default 1,
        "supply_sequence" int not null default 1,
        "qty_pegged" numeric(14,4) not null default 1,
        "demand_silver_id" uuid null,
        "supply_silver_id" uuid null,
        "unresolved_ref_json" text null,
        "source_system" text not null default 'mercato_pilot',
        "extract_batch_id" uuid not null,
        "extracted_at" timestamptz not null,
        "is_deleted" boolean not null default false,
        "last_seen_at" timestamptz not null,
        constraint "pp_ifs_silver_sd_pegs_pkey" primary key ("id")
      );`,
    )

    this.addSql(
      `create table if not exists "production_planning_ifs_silver_work_centers" (
        "id" uuid not null,
        "tenant_id" uuid not null,
        "organization_id" uuid not null,
        "contract" text not null default 'MAIN',
        "work_center_no" text not null,
        "description" text null,
        "department" text null,
        "source_system" text not null default 'mercato_pilot',
        "extract_batch_id" uuid not null,
        "extracted_at" timestamptz not null,
        "is_deleted" boolean not null default false,
        "last_seen_at" timestamptz not null,
        constraint "pp_ifs_silver_wc_pkey" primary key ("id")
      );`,
    )
    this.addSql(
      `create unique index if not exists "pp_ifs_silver_wc_natural_uidx" on "production_planning_ifs_silver_work_centers" ("tenant_id", "organization_id", "contract", "work_center_no");`,
    )

    this.addSql(
      `create table if not exists "production_planning_ifs_silver_extract_watermarks" (
        "id" uuid not null,
        "tenant_id" uuid not null,
        "organization_id" uuid not null,
        "entity_name" text not null,
        "watermark_column" text not null default 'last_seen_at',
        "watermark_value" text null,
        "last_extract_batch_id" uuid null,
        "last_success_at" timestamptz null,
        "row_count" int not null default 0,
        "lag_seconds" int not null default 0,
        "source_system" text not null default 'mercato_pilot',
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null,
        constraint "pp_ifs_silver_watermarks_pkey" primary key ("id")
      );`,
    )
    this.addSql(
      `create unique index if not exists "pp_ifs_silver_watermarks_entity_uidx" on "production_planning_ifs_silver_extract_watermarks" ("tenant_id", "organization_id", "entity_name");`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "production_planning_ifs_silver_extract_watermarks" cascade;`)
    this.addSql(`drop table if exists "production_planning_ifs_silver_work_centers" cascade;`)
    this.addSql(`drop table if exists "production_planning_ifs_silver_supply_demand_pegs" cascade;`)
    this.addSql(`drop table if exists "production_planning_ifs_silver_shop_order_operations" cascade;`)
    this.addSql(`drop table if exists "production_planning_ifs_silver_shop_orders" cascade;`)
    this.addSql(`drop table if exists "production_planning_ifs_silver_customer_order_lines" cascade;`)
  }
}
