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

export type NettingRunStatus = 'queued' | 'running' | 'completed' | 'failed'
export type GenesisRootStatus = 'pending' | 'exploded' | 'netted' | 'released' | 'error'

@Entity({ tableName: 'production_planning_ifs_staging_batches' })
export class ProductionPlanningIfsStagingBatch {
  @PrimaryKey({ type: 'uuid' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid' })
  organizationId!: string

  @Property({ name: 'source_system', type: 'text', default: 'ifs9_pilot' })
  sourceSystem: string = 'ifs9_pilot'

  @Property({ name: 'batch_type', type: 'text' })
  batchType!: string

  @Property({ type: 'text', default: 'completed' })
  status: string = 'completed'

  @Property({ name: 'row_count', type: 'int', default: 0 })
  rowCount: number = 0

  @Property({ name: 'watermark_at', type: Date, nullable: true })
  watermarkAt?: Date | null

  @Property({ name: 'stats_json', type: 'text', nullable: true })
  statsJson?: string | null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date() })
  updatedAt: Date = new Date()
}

@Entity({ tableName: 'production_planning_netting_runs' })
export class ProductionPlanningNettingRun {
  @PrimaryKey({ type: 'uuid' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid' })
  organizationId!: string

  @Property({ type: 'text', default: 'full' })
  mode: string = 'full'

  @Property({ type: 'text', default: 'queued' })
  status: NettingRunStatus = 'queued'

  @Property({ name: 'roots_processed', type: 'int', default: 0 })
  rootsProcessed: number = 0

  @Property({ name: 'pool_mo_created', type: 'int', default: 0 })
  poolMoCreated: number = 0

  @Property({ name: 'pegging_links_created', type: 'int', default: 0 })
  peggingLinksCreated: number = 0

  @Property({ name: 'naive_mo_count', type: 'int', default: 0 })
  naiveMoCount: number = 0

  @Property({ name: 'consolidated_mo_count', type: 'int', default: 0 })
  consolidatedMoCount: number = 0

  @Property({ type: 'text', nullable: true })
  message?: string | null

  @Property({ name: 'stats_json', type: 'text', nullable: true })
  statsJson?: string | null

  @Property({ name: 'started_at', type: Date, nullable: true })
  startedAt?: Date | null

  @Property({ name: 'completed_at', type: Date, nullable: true })
  completedAt?: Date | null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date() })
  updatedAt: Date = new Date()
}

@Entity({ tableName: 'production_planning_genesis_roots' })
@Unique({ properties: ['tenantId', 'organizationId', 'demandSourceType', 'demandSourceId'] })
export class ProductionPlanningGenesisRoot {
  @PrimaryKey({ type: 'uuid' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid' })
  organizationId!: string

  @Property({ name: 'demand_source_type', type: 'text' })
  demandSourceType!: string

  @Property({ name: 'demand_source_id', type: 'text' })
  demandSourceId!: string

  @Property({ name: 'sales_order_id', type: 'uuid', nullable: true })
  salesOrderId?: string | null

  @Property({ name: 'product_sku', type: 'text' })
  productSku!: string

  @Property({ type: 'numeric', precision: 14, scale: 4, default: 1 })
  quantity: number = 1

  @Property({ name: 'due_at', type: Date, nullable: true })
  dueAt?: Date | null

  @Property({ name: 'variant_code', type: 'text', nullable: true })
  variantCode?: string | null

  @Property({ type: 'text', default: 'pending' })
  status: GenesisRootStatus = 'pending'

  @Property({ name: 'netting_run_id', type: 'uuid', nullable: true })
  nettingRunId?: string | null

  @Property({ name: 'content_hash', type: 'text', nullable: true })
  contentHash?: string | null

  @Property({ name: 'resolution_json', type: 'text', nullable: true })
  resolutionJson?: string | null

  @Property({ name: 'error_code', type: 'text', nullable: true })
  errorCode?: string | null

  @Property({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string | null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date() })
  updatedAt: Date = new Date()
}

@Entity({ tableName: 'production_planning_genesis_nodes' })
@Unique({ properties: ['genesisRootId', 'nodeKey'] })
export class ProductionPlanningGenesisNode {
  @PrimaryKey({ type: 'uuid' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid' })
  organizationId!: string

  @Property({ name: 'genesis_root_id', type: 'uuid' })
  genesisRootId!: string

  @Property({ name: 'parent_node_id', type: 'uuid', nullable: true })
  parentNodeId?: string | null

  @Property({ name: 'node_key', type: 'text' })
  nodeKey!: string

  @Property({ type: 'int', default: 0 })
  level: number = 0

  @Property({ name: 'node_type', type: 'text' })
  nodeType!: string

  @Property({ name: 'product_sku', type: 'text' })
  productSku!: string

  @Property({ name: 'extended_qty', type: 'numeric', precision: 14, scale: 4, default: 1 })
  extendedQty: number = 1

  @Property({ name: 'time_bucket_key', type: 'text', nullable: true })
  timeBucketKey?: string | null

  @Property({ name: 'gross_req_qty', type: 'numeric', precision: 14, scale: 4, nullable: true })
  grossReqQty?: number | null

  @Property({ name: 'net_req_qty', type: 'numeric', precision: 14, scale: 4, nullable: true })
  netReqQty?: number | null

  @Property({ name: 'pool_order_id', type: 'uuid', nullable: true })
  poolOrderId?: string | null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date() })
  updatedAt: Date = new Date()
}

@Entity({ tableName: 'production_planning_pegging_links' })
export class ProductionPlanningPeggingLink {
  @PrimaryKey({ type: 'uuid' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid' })
  organizationId!: string

  @Property({ name: 'genesis_root_id', type: 'uuid' })
  genesisRootId!: string

  @Property({ name: 'production_order_id', type: 'uuid' })
  productionOrderId!: string

  @Property({ name: 'netting_run_id', type: 'uuid', nullable: true })
  nettingRunId?: string | null

  @Property({ type: 'numeric', precision: 14, scale: 4, default: 1 })
  quantity: number = 1

  @Property({ name: 'link_type', type: 'text', default: 'pool' })
  linkType: string = 'pool'

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()
}

@Entity({ tableName: 'production_planning_ifs_silver_customer_order_lines' })
@Unique({ properties: ['tenantId', 'organizationId', 'contract', 'orderNo', 'lineNo'] })
export class ProductionPlanningIfsSilverCustomerOrderLine {
  @PrimaryKey({ type: 'uuid' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid' })
  organizationId!: string

  @Property({ type: 'text', default: 'MAIN' })
  contract: string = 'MAIN'

  @Property({ name: 'order_no', type: 'text' })
  orderNo!: string

  @Property({ name: 'line_no', type: 'int' })
  lineNo!: number

  @Property({ name: 'part_no', type: 'text' })
  partNo!: string

  @Property({ name: 'buy_qty_due', type: 'numeric', precision: 14, scale: 4, default: 1 })
  buyQtyDue: number = 1

  @Property({ name: 'wanted_delivery_date', type: Date, nullable: true })
  wantedDeliveryDate?: Date | null

  @Property({ type: 'text', default: 'Released' })
  objstate: string = 'Released'

  @Property({ name: 'sales_order_id', type: 'uuid', nullable: true })
  salesOrderId?: string | null

  @Property({ name: 'source_system', type: 'text', default: 'mercato_pilot' })
  sourceSystem: string = 'mercato_pilot'

  @Property({ name: 'extract_batch_id', type: 'uuid' })
  extractBatchId!: string

  @Property({ name: 'extracted_at', type: Date })
  extractedAt!: Date

  @Property({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted: boolean = false

  @Property({ name: 'last_seen_at', type: Date })
  lastSeenAt!: Date
}

@Entity({ tableName: 'production_planning_ifs_silver_shop_orders' })
@Unique({ properties: ['tenantId', 'organizationId', 'contract', 'orderNo'] })
export class ProductionPlanningIfsSilverShopOrder {
  @PrimaryKey({ type: 'uuid' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid' })
  organizationId!: string

  @Property({ type: 'text', default: 'MAIN' })
  contract: string = 'MAIN'

  @Property({ name: 'order_no', type: 'text' })
  orderNo!: string

  @Property({ name: 'part_no', type: 'text' })
  partNo!: string

  @Property({ name: 'revised_qty_due', type: 'numeric', precision: 14, scale: 4, default: 1 })
  revisedQtyDue: number = 1

  @Property({ name: 'revised_due_date', type: Date, nullable: true })
  revisedDueDate?: Date | null

  @Property({ type: 'text', default: 'Released' })
  objstate: string = 'Released'

  @Property({ name: 'order_code', type: 'text', nullable: true })
  orderCode?: string | null

  @Property({ name: 'schedule_no', type: 'text', nullable: true })
  scheduleNo?: string | null

  @Property({ name: 'production_order_id', type: 'uuid', nullable: true })
  productionOrderId?: string | null

  @Property({ name: 'source_system', type: 'text', default: 'mercato_pilot' })
  sourceSystem: string = 'mercato_pilot'

  @Property({ name: 'extract_batch_id', type: 'uuid' })
  extractBatchId!: string

  @Property({ name: 'extracted_at', type: Date })
  extractedAt!: Date

  @Property({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted: boolean = false

  @Property({ name: 'last_seen_at', type: Date })
  lastSeenAt!: Date
}

@Entity({ tableName: 'production_planning_ifs_silver_shop_order_operations' })
@Unique({
  properties: ['tenantId', 'organizationId', 'contract', 'orderNo', 'releaseNo', 'sequenceNo', 'operationNo'],
})
export class ProductionPlanningIfsSilverShopOrderOperation {
  @PrimaryKey({ type: 'uuid' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid' })
  organizationId!: string

  @Property({ type: 'text', default: 'MAIN' })
  contract: string = 'MAIN'

  @Property({ name: 'order_no', type: 'text' })
  orderNo!: string

  @Property({ name: 'release_no', type: 'int', default: 1 })
  releaseNo: number = 1

  @Property({ name: 'sequence_no', type: 'int' })
  sequenceNo!: number

  @Property({ name: 'operation_no', type: 'int' })
  operationNo!: number

  @Property({ name: 'work_center_no', type: 'text' })
  workCenterNo!: string

  @Property({ name: 'run_time_minutes', type: 'int' })
  runTimeMinutes!: number

  @Property({ name: 'operation_id', type: 'uuid', nullable: true })
  operationId?: string | null

  @Property({ name: 'source_system', type: 'text', default: 'mercato_pilot' })
  sourceSystem: string = 'mercato_pilot'

  @Property({ name: 'extract_batch_id', type: 'uuid' })
  extractBatchId!: string

  @Property({ name: 'extracted_at', type: Date })
  extractedAt!: Date

  @Property({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted: boolean = false

  @Property({ name: 'last_seen_at', type: Date })
  lastSeenAt!: Date
}

@Entity({ tableName: 'production_planning_ifs_silver_supply_demand_pegs' })
export class ProductionPlanningIfsSilverSupplyDemandPeg {
  @PrimaryKey({ type: 'uuid' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid' })
  organizationId!: string

  @Property({ type: 'text', default: 'MAIN' })
  contract: string = 'MAIN'

  @Property({ name: 'demand_code', type: 'text' })
  demandCode!: string

  @Property({ name: 'supply_code', type: 'text' })
  supplyCode!: string

  @Property({ name: 'demand_order_no', type: 'text' })
  demandOrderNo!: string

  @Property({ name: 'supply_order_no', type: 'text' })
  supplyOrderNo!: string

  @Property({ name: 'demand_sequence', type: 'int', default: 1 })
  demandSequence: number = 1

  @Property({ name: 'supply_sequence', type: 'int', default: 1 })
  supplySequence: number = 1

  @Property({ name: 'qty_pegged', type: 'numeric', precision: 14, scale: 4, default: 1 })
  qtyPegged: number = 1

  @Property({ name: 'demand_silver_id', type: 'uuid', nullable: true })
  demandSilverId?: string | null

  @Property({ name: 'supply_silver_id', type: 'uuid', nullable: true })
  supplySilverId?: string | null

  @Property({ name: 'unresolved_ref_json', type: 'text', nullable: true })
  unresolvedRefJson?: string | null

  @Property({ name: 'source_system', type: 'text', default: 'mercato_pilot' })
  sourceSystem: string = 'mercato_pilot'

  @Property({ name: 'extract_batch_id', type: 'uuid' })
  extractBatchId!: string

  @Property({ name: 'extracted_at', type: Date })
  extractedAt!: Date

  @Property({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted: boolean = false

  @Property({ name: 'last_seen_at', type: Date })
  lastSeenAt!: Date
}

@Entity({ tableName: 'production_planning_ifs_silver_work_centers' })
@Unique({ properties: ['tenantId', 'organizationId', 'contract', 'workCenterNo'] })
export class ProductionPlanningIfsSilverWorkCenter {
  @PrimaryKey({ type: 'uuid' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid' })
  organizationId!: string

  @Property({ type: 'text', default: 'MAIN' })
  contract: string = 'MAIN'

  @Property({ name: 'work_center_no', type: 'text' })
  workCenterNo!: string

  @Property({ type: 'text', nullable: true })
  description?: string | null

  @Property({ type: 'text', nullable: true })
  department?: string | null

  @Property({ name: 'source_system', type: 'text', default: 'mercato_pilot' })
  sourceSystem: string = 'mercato_pilot'

  @Property({ name: 'extract_batch_id', type: 'uuid' })
  extractBatchId!: string

  @Property({ name: 'extracted_at', type: Date })
  extractedAt!: Date

  @Property({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted: boolean = false

  @Property({ name: 'last_seen_at', type: Date })
  lastSeenAt!: Date
}

@Entity({ tableName: 'production_planning_ifs_silver_extract_watermarks' })
@Unique({ properties: ['tenantId', 'organizationId', 'entityName'] })
export class ProductionPlanningIfsSilverExtractWatermark {
  @PrimaryKey({ type: 'uuid' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid' })
  organizationId!: string

  @Property({ name: 'entity_name', type: 'text' })
  entityName!: string

  @Property({ name: 'watermark_column', type: 'text', default: 'last_seen_at' })
  watermarkColumn: string = 'last_seen_at'

  @Property({ name: 'watermark_value', type: 'text', nullable: true })
  watermarkValue?: string | null

  @Property({ name: 'last_extract_batch_id', type: 'uuid', nullable: true })
  lastExtractBatchId?: string | null

  @Property({ name: 'last_success_at', type: Date, nullable: true })
  lastSuccessAt?: Date | null

  @Property({ name: 'row_count', type: 'int', default: 0 })
  rowCount: number = 0

  @Property({ name: 'lag_seconds', type: 'int', default: 0 })
  lagSeconds: number = 0

  @Property({ name: 'source_system', type: 'text', default: 'mercato_pilot' })
  sourceSystem: string = 'mercato_pilot'

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date() })
  updatedAt: Date = new Date()
}
