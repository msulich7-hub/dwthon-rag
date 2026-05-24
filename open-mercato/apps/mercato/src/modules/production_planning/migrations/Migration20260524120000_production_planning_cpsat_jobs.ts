import { Migration } from '@mikro-orm/migrations'

export class Migration20260524120000_production_planning_cpsat_jobs extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "production_planning_optimize_jobs" (
        "id" uuid not null,
        "tenant_id" uuid not null,
        "organization_id" uuid not null,
        "status" text not null default 'queued',
        "production_order_ids_json" text not null,
        "horizon_hours" int not null default 168,
        "objective" text not null default 'minimize_lateness',
        "apply_sync" boolean not null default true,
        "dry_run" boolean not null default false,
        "chunk_count" int not null default 1,
        "chunks_completed" int not null default 0,
        "queue_job_id" text null,
        "requested_by_user_id" uuid null,
        "solver_status" text null,
        "objective_value" numeric(18,4) null,
        "message" text null,
        "operation_count" int null,
        "schedule_json" text null,
        "apply_result_json" text null,
        "started_at" timestamptz null,
        "completed_at" timestamptz null,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null,
        constraint "production_planning_optimize_jobs_pkey" primary key ("id")
      );`,
    )
    this.addSql(
      `create index if not exists "production_planning_optimize_jobs_scope_status_idx"
        on "production_planning_optimize_jobs" ("tenant_id", "organization_id", "status", "created_at");`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "production_planning_optimize_jobs" cascade;`)
  }
}
