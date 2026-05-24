import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/decorators/legacy'

export type ProductionOrderStatus = 'draft' | 'planned' | 'in_progress' | 'completed' | 'cancelled'

@Entity({ tableName: 'production_planning_orders' })
@Unique({ properties: ['tenantId', 'organizationId', 'code'] })
export class ProductionPlanningOrder {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid' })
  organizationId!: string

  @Property({ type: 'text' })
  code!: string

  @Property({ type: 'text' })
  title!: string

  @Property({ name: 'sales_order_id', type: 'uuid', nullable: true })
  salesOrderId?: string | null

  @Property({ name: 'product_sku', type: 'text', nullable: true })
  productSku?: string | null

  @Property({ type: 'numeric', precision: 14, scale: 4, default: 1 })
  quantity: number = 1

  @Property({ type: 'text' })
  status!: ProductionOrderStatus

  @Property({ name: 'work_center_code', type: 'text', nullable: true })
  workCenterCode?: string | null

  @Property({ name: 'planned_start_at', type: Date, nullable: true })
  plannedStartAt?: Date | null

  @Property({ name: 'planned_end_at', type: Date, nullable: true })
  plannedEndAt?: Date | null

  @Property({ name: 'due_at', type: Date, nullable: true })
  dueAt?: Date | null

  @Property({ name: 'notes_json', type: 'text', nullable: true })
  notesJson?: string | null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date() })
  updatedAt: Date = new Date()
}

@Entity({ tableName: 'production_planning_operations' })
export class ProductionPlanningOperation {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid' })
  organizationId!: string

  @Property({ name: 'production_order_id', type: 'uuid' })
  productionOrderId!: string

  @Property({ name: 'sequence_no', type: 'int' })
  sequenceNo!: number

  @Property({ type: 'text' })
  name!: string

  @Property({ name: 'work_center_code', type: 'text' })
  workCenterCode!: string

  @Property({ name: 'duration_minutes', type: 'int' })
  durationMinutes!: number

  @Property({ type: 'text', default: 'pending' })
  status: string = 'pending'

  @Property({ name: 'planned_start_at', type: Date, nullable: true })
  plannedStartAt?: Date | null

  @Property({ name: 'planned_end_at', type: Date, nullable: true })
  plannedEndAt?: Date | null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date() })
  updatedAt: Date = new Date()
}

export type CpsatOptimizeJobStatus =
  | 'queued'
  | 'running'
  | 'chunking'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type CpsatObjective = 'minimize_lateness' | 'minimize_changeover' | 'balance_load'

@Entity({ tableName: 'production_planning_optimize_jobs' })
export class ProductionPlanningOptimizeJob {
  @PrimaryKey({ type: 'uuid' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid' })
  organizationId!: string

  @Property({ type: 'text', default: 'queued' })
  status: CpsatOptimizeJobStatus = 'queued'

  @Property({ name: 'production_order_ids_json', type: 'text' })
  productionOrderIdsJson!: string

  @Property({ name: 'horizon_hours', type: 'int', default: 168 })
  horizonHours: number = 168

  @Property({ type: 'text', default: 'minimize_lateness' })
  objective: CpsatObjective = 'minimize_lateness'

  @Property({ name: 'apply_sync', type: 'boolean', default: true })
  applySync: boolean = true

  @Property({ name: 'dry_run', type: 'boolean', default: false })
  dryRun: boolean = false

  @Property({ name: 'chunk_count', type: 'int', default: 1 })
  chunkCount: number = 1

  @Property({ name: 'chunks_completed', type: 'int', default: 0 })
  chunksCompleted: number = 0

  @Property({ name: 'queue_job_id', type: 'text', nullable: true })
  queueJobId?: string | null

  @Property({ name: 'requested_by_user_id', type: 'uuid', nullable: true })
  requestedByUserId?: string | null

  @Property({ name: 'solver_status', type: 'text', nullable: true })
  solverStatus?: string | null

  @Property({ name: 'objective_value', type: 'numeric', precision: 18, scale: 4, nullable: true })
  objectiveValue?: number | null

  @Property({ type: 'text', nullable: true })
  message?: string | null

  @Property({ name: 'operation_count', type: 'int', nullable: true })
  operationCount?: number | null

  @Property({ name: 'schedule_json', type: 'text', nullable: true })
  scheduleJson?: string | null

  @Property({ name: 'apply_result_json', type: 'text', nullable: true })
  applyResultJson?: string | null

  @Property({ name: 'started_at', type: Date, nullable: true })
  startedAt?: Date | null

  @Property({ name: 'completed_at', type: Date, nullable: true })
  completedAt?: Date | null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date() })
  updatedAt: Date = new Date()
}

export type PlanScenarioStatus = 'draft' | 'simulating' | 'completed' | 'failed'

@Entity({ tableName: 'production_planning_plan_scenarios' })
export class ProductionPlanningPlanScenario {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid' })
  organizationId!: string

  @Property({ name: 'template_id', type: 'text', nullable: true })
  templateId?: string | null

  @Property({ name: 'bundle_id', type: 'text', nullable: true })
  bundleId?: string | null

  @Property({ name: 'scenario_label', type: 'text' })
  scenarioLabel!: string

  @Property({ name: 'parent_scenario_id', type: 'uuid', nullable: true })
  parentScenarioId?: string | null

  @Property({ name: 'baseline_scenario_id', type: 'uuid', nullable: true })
  baselineScenarioId?: string | null

  @Property({ type: 'text', default: 'draft' })
  status: PlanScenarioStatus = 'draft'

  @Property({ name: 'propose_only', type: 'boolean', default: true })
  proposeOnly: boolean = true

  @Property({ name: 'horizon_hours', type: 'int', default: 168 })
  horizonHours: number = 168

  @Property({ type: 'text', default: 'minimize_lateness' })
  objective: CpsatObjective = 'minimize_lateness'

  @Property({ name: 'objective_weights_json', type: 'text', nullable: true })
  objectiveWeightsJson?: string | null

  @Property({ name: 'overrides_json', type: 'text', nullable: true })
  overridesJson?: string | null

  @Property({ name: 'optimize_job_id', type: 'uuid', nullable: true })
  optimizeJobId?: string | null

  @Property({ name: 'production_order_ids_json', type: 'text', nullable: true })
  productionOrderIdsJson?: string | null

  @Property({ name: 'kpi_snapshot_json', type: 'text', nullable: true })
  kpiSnapshotJson?: string | null

  @Property({ name: 'schedule_json', type: 'text', nullable: true })
  scheduleJson?: string | null

  @Property({ name: 'solver_status', type: 'text', nullable: true })
  solverStatus?: string | null

  @Property({ name: 'objective_value', type: 'numeric', precision: 18, scale: 4, nullable: true })
  objectiveValue?: number | null

  @Property({ name: 'wall_ms', type: 'int', nullable: true })
  wallMs?: number | null

  @Property({ name: 'rank_in_tournament', type: 'int', nullable: true })
  rankInTournament?: number | null

  @Property({ type: 'text', nullable: true })
  message?: string | null

  @Property({ name: 'requested_by_user_id', type: 'uuid', nullable: true })
  requestedByUserId?: string | null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date() })
  updatedAt: Date = new Date()

  @Property({ name: 'completed_at', type: Date, nullable: true })
  completedAt?: Date | null
}
