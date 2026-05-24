import { Migration } from '@mikro-orm/migrations'

export class Migration20260527120000_mes_quality_pulse extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "mes_quality_holds" ("id" uuid not null default gen_random_uuid(), "tenant_id" uuid not null, "organization_id" uuid not null, "target_type" text not null, "target_id" uuid not null, "reason_code" text not null, "reason_text" text null, "status" text not null default 'active', "created_by" uuid null, "released_at" timestamptz null, "released_by" uuid null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "mes_quality_holds_pkey" primary key ("id"));`,
    )
    this.addSql(
      `create index if not exists "mes_quality_holds_target_idx" on "mes_quality_holds" ("tenant_id", "organization_id", "target_type", "target_id", "status");`,
    )

    this.addSql(
      `create table if not exists "mes_checklist_templates" ("id" uuid not null default gen_random_uuid(), "tenant_id" uuid not null, "organization_id" uuid not null, "code" text not null, "name" text not null, "product_code" text null, "is_active" boolean not null default true, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "mes_checklist_templates_pkey" primary key ("id"));`,
    )
    this.addSql(
      `create unique index if not exists "mes_checklist_templates_code_uidx" on "mes_checklist_templates" ("tenant_id", "organization_id", "code");`,
    )

    this.addSql(
      `create table if not exists "mes_checklist_template_items" ("id" uuid not null default gen_random_uuid(), "template_id" uuid not null, "sequence" int not null, "label" text not null, "requires_value" boolean not null default false, constraint "mes_checklist_template_items_pkey" primary key ("id"));`,
    )
    this.addSql(
      `create index if not exists "mes_checklist_template_items_tpl_idx" on "mes_checklist_template_items" ("template_id", "sequence");`,
    )

    this.addSql(
      `create table if not exists "mes_checklist_runs" ("id" uuid not null default gen_random_uuid(), "tenant_id" uuid not null, "organization_id" uuid not null, "template_id" uuid not null, "work_order_id" uuid not null, "work_order_operation_id" uuid null, "status" text not null default 'in_progress', "completed_at" timestamptz null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "mes_checklist_runs_pkey" primary key ("id"));`,
    )
    this.addSql(
      `create index if not exists "mes_checklist_runs_wo_idx" on "mes_checklist_runs" ("tenant_id", "organization_id", "work_order_id");`,
    )

    this.addSql(
      `create table if not exists "mes_checklist_run_answers" ("id" uuid not null default gen_random_uuid(), "run_id" uuid not null, "template_item_id" uuid not null, "value" text null, "passed" boolean not null default true, constraint "mes_checklist_run_answers_pkey" primary key ("id"));`,
    )
    this.addSql(
      `create unique index if not exists "mes_checklist_run_answers_uidx" on "mes_checklist_run_answers" ("run_id", "template_item_id");`,
    )

    this.addSql(
      `create table if not exists "mes_downtime_segments" ("id" uuid not null default gen_random_uuid(), "tenant_id" uuid not null, "organization_id" uuid not null, "work_center_code" text not null, "reason_code" text not null, "reason_label" text not null, "started_at" timestamptz not null, "ended_at" timestamptz null, "notes" text null, constraint "mes_downtime_segments_pkey" primary key ("id"));`,
    )
    this.addSql(
      `create index if not exists "mes_downtime_segments_active_idx" on "mes_downtime_segments" ("tenant_id", "organization_id", "work_center_code", "ended_at");`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "mes_downtime_segments" cascade;`)
    this.addSql(`drop table if exists "mes_checklist_run_answers" cascade;`)
    this.addSql(`drop table if exists "mes_checklist_runs" cascade;`)
    this.addSql(`drop table if exists "mes_checklist_template_items" cascade;`)
    this.addSql(`drop table if exists "mes_checklist_templates" cascade;`)
    this.addSql(`drop table if exists "mes_quality_holds" cascade;`)
  }
}
