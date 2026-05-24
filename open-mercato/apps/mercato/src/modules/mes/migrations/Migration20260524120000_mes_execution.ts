import { Migration } from '@mikro-orm/migrations'

export class Migration20260524120000_mes_execution extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "mes_routing_templates" ("id" uuid not null default gen_random_uuid(), "tenant_id" uuid not null, "organization_id" uuid not null, "code" text not null, "name" text not null, "product_code" text not null, "version" int not null default 1, "is_active" boolean not null default true, "notes" text null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "mes_routing_templates_pkey" primary key ("id"));`,
    )
    this.addSql(
      `create unique index if not exists "mes_routing_templates_scope_code_uidx" on "mes_routing_templates" ("tenant_id", "organization_id", "code");`,
    )
    this.addSql(
      `create index if not exists "mes_routing_templates_scope_product_idx" on "mes_routing_templates" ("tenant_id", "organization_id", "product_code", "is_active");`,
    )

    this.addSql(
      `create table if not exists "mes_routing_template_steps" ("id" uuid not null default gen_random_uuid(), "routing_template_id" uuid not null, "sequence" int not null, "operation_code" text not null, "operation_name" text not null, "work_center_code" text null, "setup_minutes" int null, "run_minutes_per_unit" real null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "mes_routing_template_steps_pkey" primary key ("id"));`,
    )
    this.addSql(
      `create unique index if not exists "mes_routing_template_steps_template_seq_uidx" on "mes_routing_template_steps" ("routing_template_id", "sequence");`,
    )

    this.addSql(
      `create table if not exists "mes_work_order_operations" ("id" uuid not null default gen_random_uuid(), "tenant_id" uuid not null, "organization_id" uuid not null, "work_order_id" uuid not null, "sequence" int not null, "operation_code" text not null, "operation_name" text not null, "work_center_code" text null, "status" text not null, "routing_template_step_id" uuid null, "planned_qty" int not null, "completed_qty" int not null default 0, "scrap_qty" int not null default 0, "started_at" timestamptz null, "completed_at" timestamptz null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "mes_work_order_operations_pkey" primary key ("id"));`,
    )
    this.addSql(
      `create index if not exists "mes_work_order_operations_scope_wo_idx" on "mes_work_order_operations" ("tenant_id", "organization_id", "work_order_id", "sequence");`,
    )
    this.addSql(
      `create index if not exists "mes_work_order_operations_dispatch_idx" on "mes_work_order_operations" ("tenant_id", "organization_id", "status", "work_center_code");`,
    )

    this.addSql(
      `create table if not exists "mes_operation_confirmations" ("id" uuid not null default gen_random_uuid(), "tenant_id" uuid not null, "organization_id" uuid not null, "work_order_operation_id" uuid not null, "confirmation_type" text not null, "good_qty" int not null default 0, "scrap_qty" int not null default 0, "operator_id" uuid null, "notes" text null, "confirmed_at" timestamptz not null, constraint "mes_operation_confirmations_pkey" primary key ("id"));`,
    )
    this.addSql(
      `create index if not exists "mes_operation_confirmations_op_idx" on "mes_operation_confirmations" ("work_order_operation_id", "confirmed_at");`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "mes_operation_confirmations" cascade;`)
    this.addSql(`drop table if exists "mes_work_order_operations" cascade;`)
    this.addSql(`drop table if exists "mes_routing_template_steps" cascade;`)
    this.addSql(`drop table if exists "mes_routing_templates" cascade;`)
  }
}
