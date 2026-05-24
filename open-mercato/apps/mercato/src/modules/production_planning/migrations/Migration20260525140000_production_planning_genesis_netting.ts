import { Migration } from '@mikro-orm/migrations'

export class Migration20260525140000_production_planning_genesis_netting extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "production_planning_ifs_staging_batches" (
        "id" uuid not null,
        "tenant_id" uuid not null,
        "organization_id" uuid not null,
        "source_system" text not null default 'ifs9_pilot',
        "batch_type" text not null,
        "status" text not null default 'completed',
        "row_count" int not null default 0,
        "watermark_at" timestamptz null,
        "stats_json" text null,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null,
        constraint "production_planning_ifs_staging_batches_pkey" primary key ("id")
      );`,
    )
    this.addSql(
      `create index if not exists "pp_ifs_batches_scope_idx" on "production_planning_ifs_staging_batches" ("tenant_id", "organization_id", "created_at");`,
    )

    this.addSql(
      `create table if not exists "production_planning_netting_runs" (
        "id" uuid not null,
        "tenant_id" uuid not null,
        "organization_id" uuid not null,
        "mode" text not null default 'full',
        "status" text not null default 'queued',
        "roots_processed" int not null default 0,
        "pool_mo_created" int not null default 0,
        "pegging_links_created" int not null default 0,
        "naive_mo_count" int not null default 0,
        "consolidated_mo_count" int not null default 0,
        "message" text null,
        "stats_json" text null,
        "started_at" timestamptz null,
        "completed_at" timestamptz null,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null,
        constraint "production_planning_netting_runs_pkey" primary key ("id")
      );`,
    )

    this.addSql(
      `create table if not exists "production_planning_genesis_roots" (
        "id" uuid not null,
        "tenant_id" uuid not null,
        "organization_id" uuid not null,
        "demand_source_type" text not null,
        "demand_source_id" text not null,
        "sales_order_id" uuid null,
        "product_sku" text not null,
        "quantity" numeric(14,4) not null default 1,
        "due_at" timestamptz null,
        "variant_code" text null,
        "status" text not null default 'pending',
        "netting_run_id" uuid null,
        "content_hash" text null,
        "resolution_json" text null,
        "error_code" text null,
        "error_message" text null,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null,
        constraint "production_planning_genesis_roots_pkey" primary key ("id")
      );`,
    )
    this.addSql(
      `create unique index if not exists "pp_genesis_roots_demand_uidx" on "production_planning_genesis_roots" ("tenant_id", "organization_id", "demand_source_type", "demand_source_id");`,
    )

    this.addSql(
      `create table if not exists "production_planning_genesis_nodes" (
        "id" uuid not null,
        "tenant_id" uuid not null,
        "organization_id" uuid not null,
        "genesis_root_id" uuid not null,
        "parent_node_id" uuid null,
        "node_key" text not null,
        "level" int not null default 0,
        "node_type" text not null,
        "product_sku" text not null,
        "extended_qty" numeric(14,4) not null default 1,
        "time_bucket_key" text null,
        "gross_req_qty" numeric(14,4) null,
        "net_req_qty" numeric(14,4) null,
        "pool_order_id" uuid null,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null,
        constraint "production_planning_genesis_nodes_pkey" primary key ("id")
      );`,
    )
    this.addSql(
      `create unique index if not exists "pp_genesis_nodes_root_key_uidx" on "production_planning_genesis_nodes" ("genesis_root_id", "node_key");`,
    )

    this.addSql(
      `create table if not exists "production_planning_pegging_links" (
        "id" uuid not null,
        "tenant_id" uuid not null,
        "organization_id" uuid not null,
        "genesis_root_id" uuid not null,
        "production_order_id" uuid not null,
        "netting_run_id" uuid null,
        "quantity" numeric(14,4) not null default 1,
        "link_type" text not null default 'pool',
        "created_at" timestamptz not null,
        constraint "production_planning_pegging_links_pkey" primary key ("id")
      );`,
    )
    this.addSql(
      `create index if not exists "pp_pegging_links_order_idx" on "production_planning_pegging_links" ("tenant_id", "organization_id", "production_order_id");`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "production_planning_pegging_links" cascade;`)
    this.addSql(`drop table if exists "production_planning_genesis_nodes" cascade;`)
    this.addSql(`drop table if exists "production_planning_genesis_roots" cascade;`)
    this.addSql(`drop table if exists "production_planning_netting_runs" cascade;`)
    this.addSql(`drop table if exists "production_planning_ifs_staging_batches" cascade;`)
  }
}
