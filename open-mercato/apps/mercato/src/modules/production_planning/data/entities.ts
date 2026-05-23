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
