import { Entity, PrimaryKey, Property } from '@mikro-orm/decorators/legacy'

export type MesWorkOrderStatus =
  | 'draft'
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

@Entity({ tableName: 'mes_work_orders' })
export class MesWorkOrder {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid' })
  organizationId!: string

  @Property({ name: 'order_number', type: 'text' })
  orderNumber!: string

  @Property({ name: 'product_code', type: 'text' })
  productCode!: string

  @Property({ type: 'int' })
  quantity!: number

  @Property({ type: 'text' })
  status!: MesWorkOrderStatus

  @Property({ name: 'deal_id', type: 'uuid', nullable: true })
  dealId?: string | null

  @Property({ name: 'sales_order_id', type: 'uuid', nullable: true })
  salesOrderId?: string | null

  @Property({ type: 'text', nullable: true })
  notes?: string | null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date() })
  updatedAt: Date = new Date()
}

export type MesWorkOrderOperationStatus =
  | 'pending'
  | 'ready'
  | 'in_progress'
  | 'completed'
  | 'skipped'
  | 'cancelled'

@Entity({ tableName: 'mes_routing_templates' })
export class MesRoutingTemplate {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid' })
  organizationId!: string

  @Property({ type: 'text' })
  code!: string

  @Property({ type: 'text' })
  name!: string

  @Property({ name: 'product_code', type: 'text' })
  productCode!: string

  @Property({ type: 'int', default: 1 })
  version: number = 1

  @Property({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean = true

  @Property({ type: 'text', nullable: true })
  notes?: string | null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date() })
  updatedAt: Date = new Date()
}

@Entity({ tableName: 'mes_routing_template_steps' })
export class MesRoutingTemplateStep {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'routing_template_id', type: 'uuid' })
  routingTemplateId!: string

  @Property({ type: 'int' })
  sequence!: number

  @Property({ name: 'operation_code', type: 'text' })
  operationCode!: string

  @Property({ name: 'operation_name', type: 'text' })
  operationName!: string

  @Property({ name: 'work_center_code', type: 'text', nullable: true })
  workCenterCode?: string | null

  @Property({ name: 'setup_minutes', type: 'int', nullable: true })
  setupMinutes?: number | null

  @Property({ name: 'run_minutes_per_unit', type: 'float', nullable: true })
  runMinutesPerUnit?: number | null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date() })
  updatedAt: Date = new Date()
}

@Entity({ tableName: 'mes_work_order_operations' })
export class MesWorkOrderOperation {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid' })
  organizationId!: string

  @Property({ name: 'work_order_id', type: 'uuid' })
  workOrderId!: string

  @Property({ type: 'int' })
  sequence!: number

  @Property({ name: 'operation_code', type: 'text' })
  operationCode!: string

  @Property({ name: 'operation_name', type: 'text' })
  operationName!: string

  @Property({ name: 'work_center_code', type: 'text', nullable: true })
  workCenterCode?: string | null

  @Property({ type: 'text' })
  status!: MesWorkOrderOperationStatus

  @Property({ name: 'routing_template_step_id', type: 'uuid', nullable: true })
  routingTemplateStepId?: string | null

  @Property({ name: 'planned_qty', type: 'int' })
  plannedQty!: number

  @Property({ name: 'completed_qty', type: 'int', default: 0 })
  completedQty: number = 0

  @Property({ name: 'scrap_qty', type: 'int', default: 0 })
  scrapQty: number = 0

  @Property({ name: 'started_at', type: Date, nullable: true })
  startedAt?: Date | null

  @Property({ name: 'completed_at', type: Date, nullable: true })
  completedAt?: Date | null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date() })
  updatedAt: Date = new Date()
}

@Entity({ tableName: 'mes_operation_confirmations' })
export class MesOperationConfirmation {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid' })
  organizationId!: string

  @Property({ name: 'work_order_operation_id', type: 'uuid' })
  workOrderOperationId!: string

  @Property({ name: 'confirmation_type', type: 'text' })
  confirmationType!: 'start' | 'complete' | 'partial'

  @Property({ name: 'good_qty', type: 'int', default: 0 })
  goodQty: number = 0

  @Property({ name: 'scrap_qty', type: 'int', default: 0 })
  scrapQty: number = 0

  @Property({ name: 'operator_id', type: 'uuid', nullable: true })
  operatorId?: string | null

  @Property({ type: 'text', nullable: true })
  notes?: string | null

  @Property({ name: 'confirmed_at', type: Date, onCreate: () => new Date() })
  confirmedAt: Date = new Date()
}

export type MesLotStatus = 'active' | 'consumed' | 'quarantine'

@Entity({ tableName: 'mes_lots' })
export class MesLot {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid' })
  organizationId!: string

  @Property({ name: 'lot_number', type: 'text' })
  lotNumber!: string

  @Property({ name: 'product_code', type: 'text' })
  productCode!: string

  @Property({ type: 'int' })
  quantity!: number

  @Property({ type: 'text' })
  status!: MesLotStatus

  @Property({ name: 'work_order_id', type: 'uuid', nullable: true })
  workOrderId?: string | null

  @Property({ type: 'text', nullable: true })
  notes?: string | null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date() })
  updatedAt: Date = new Date()
}

@Entity({ tableName: 'mes_material_consumptions' })
export class MesMaterialConsumption {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid' })
  organizationId!: string

  @Property({ name: 'work_order_operation_id', type: 'uuid' })
  workOrderOperationId!: string

  @Property({ name: 'lot_id', type: 'uuid' })
  lotId!: string

  @Property({ type: 'int' })
  quantity!: number

  @Property({ name: 'consumed_at', type: Date, onCreate: () => new Date() })
  consumedAt: Date = new Date()
}

export type MesGenealogyNodeType = 'lot' | 'serial' | 'work_order'
export type MesGenealogyRelation = 'consume' | 'produce'

@Entity({ tableName: 'mes_serials' })
export class MesSerial {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid' })
  organizationId!: string

  @Property({ name: 'serial_number', type: 'text' })
  serialNumber!: string

  @Property({ name: 'product_code', type: 'text' })
  productCode!: string

  @Property({ name: 'work_order_id', type: 'uuid', nullable: true })
  workOrderId?: string | null

  @Property({ name: 'output_lot_id', type: 'uuid', nullable: true })
  outputLotId?: string | null

  @Property({ type: 'text' })
  status!: 'active' | 'shipped' | 'scrapped'

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date() })
  updatedAt: Date = new Date()
}

@Entity({ tableName: 'mes_production_outputs' })
export class MesProductionOutput {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid' })
  organizationId!: string

  @Property({ name: 'work_order_id', type: 'uuid' })
  workOrderId!: string

  @Property({ name: 'work_order_operation_id', type: 'uuid', nullable: true })
  workOrderOperationId?: string | null

  @Property({ name: 'output_lot_id', type: 'uuid' })
  outputLotId!: string

  @Property({ name: 'serial_id', type: 'uuid', nullable: true })
  serialId?: string | null

  @Property({ name: 'product_code', type: 'text' })
  productCode!: string

  @Property({ type: 'int' })
  quantity!: number

  @Property({ name: 'produced_at', type: Date, onCreate: () => new Date() })
  producedAt: Date = new Date()
}

@Entity({ tableName: 'mes_genealogy_edges' })
export class MesGenealogyEdge {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid' })
  organizationId!: string

  @Property({ type: 'text' })
  relation!: MesGenealogyRelation

  @Property({ name: 'parent_type', type: 'text' })
  parentType!: MesGenealogyNodeType

  @Property({ name: 'parent_id', type: 'uuid' })
  parentId!: string

  @Property({ name: 'child_type', type: 'text' })
  childType!: MesGenealogyNodeType

  @Property({ name: 'child_id', type: 'uuid' })
  childId!: string

  @Property({ name: 'work_order_id', type: 'uuid', nullable: true })
  workOrderId?: string | null

  @Property({ type: 'int', nullable: true })
  quantity?: number | null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()
}

@Entity({ tableName: 'mes_andon_state' })
export class MesAndonState {
  @PrimaryKey({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @PrimaryKey({ name: 'organization_id', type: 'uuid' })
  organizationId!: string

  @Property({ name: 'last_escalation_level', type: 'int', default: 0 })
  lastEscalationLevel: number = 0

  @Property({ name: 'last_notified_at', type: Date, nullable: true })
  lastNotifiedAt?: Date | null

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date() })
  updatedAt: Date = new Date()
}
