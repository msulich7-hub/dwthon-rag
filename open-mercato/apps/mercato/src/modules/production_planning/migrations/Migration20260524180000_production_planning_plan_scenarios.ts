import { Migration } from '@mikro-orm/migrations'

export class Migration20260524180000_production_planning_plan_scenarios extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "production_planning_plan_scenarios" (
        "id" uuid not null default gen_random_uuid(),
        "tenant_id" uuid not null,
        "organization_id" uuid not null,
        "template_id" text null,
        "bundle_id" text null,
        "scenario_label" text not null,
        "parent_scenario_id" uuid null,
        "baseline_scenario_id" uuid null,
        "status" text not null default 'draft',
        "propose_only" boolean not null default true,
        "horizon_hours" int not null default 168,
        "objective" text not null default 'minimize_lateness',
        "objective_weights_json" text null,
        "overrides_json" text null,
        "optimize_job_id" uuid null,
        "production_order_ids_json" text null,
        "kpi_snapshot_json" text null,
        "schedule_json" text null,
        "solver_status" text null,
        "objective_value" numeric(18,4) null,
        "wall_ms" int null,
        "rank_in_tournament" int null,
        "message" text null,
        "requested_by_user_id" uuid null,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null,
        "completed_at" timestamptz null,
        constraint "production_planning_plan_scenarios_pkey" primary key ("id")
      );`,
    )
    this.addSql(
      `create index if not exists "production_planning_plan_scenarios_scope_idx"
        on "production_planning_plan_scenarios" ("tenant_id", "organization_id", "created_at" desc);`,
    )
    this.addSql(
      `create index if not exists "production_planning_plan_scenarios_template_idx"
        on "production_planning_plan_scenarios" ("tenant_id", "organization_id", "template_id");`,
    )
    this.addSql(
      `create index if not exists "production_planning_plan_scenarios_parent_idx"
        on "production_planning_plan_scenarios" ("parent_scenario_id");`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "production_planning_plan_scenarios" cascade;`)
  }
}
