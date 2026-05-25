import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/decorators/legacy'

export type ConsignmentStatus = 'pending_a' | 'pending_b' | 'completed' | 'skipped'
export type ProcessingFormat = 'format_a' | 'format_b' | null
export type LoadUnitKind = 'package' | 'pallet'
export type ManifestFormat = 'FORMAT_A' | 'FORMAT_B'

@Entity({ tableName: 'transport_source_consignments' })
@Unique({ properties: ['tenantId', 'ifsRef'] })
export class TransportSourceConsignment {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid' })
  organizationId!: string

  @Property({ name: 'ifs_ref', type: 'text' })
  ifsRef!: string

  @Property({ name: 'recipient_name', type: 'text', nullable: true })
  recipientName?: string | null

  @Property({ name: 'address_line', type: 'text', nullable: true })
  addressLine?: string | null

  @Property({ name: 'complement_raw', type: 'text', nullable: true })
  complementRaw?: string | null

  @Property({ name: 'complement_status', type: 'text', nullable: true })
  complementStatus?: string | null

  @Property({ name: 'default_expeditor', type: 'text', nullable: true })
  defaultExpeditor?: string | null

  @Property({ name: 'ifs_packages_text', type: 'text', nullable: true })
  ifsPackagesText?: string | null

  @Property({ name: 'ifs_pallets_text', type: 'text', nullable: true })
  ifsPalletsText?: string | null

  @Property({ name: 'load_mix', type: 'text', default: 'unknown' })
  loadMix: string = 'unknown'

  @Property({ name: 'status', type: 'text', default: 'pending_a' })
  status: ConsignmentStatus = 'pending_a'

  @Property({ name: 'processing_format', type: 'text', nullable: true })
  processingFormat?: ProcessingFormat | null

  @Property({ name: 'processed_at', type: Date, nullable: true })
  processedAt?: Date | null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date() })
  updatedAt: Date = new Date()
}

@Entity({ tableName: 'transport_load_unit_lines' })
export class TransportLoadUnitLine {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid' })
  organizationId!: string

  @Property({ name: 'consignment_id', type: 'uuid' })
  consignmentId!: string

  @Property({ type: 'text' })
  kind!: LoadUnitKind

  @Property({ name: 'type_code', type: 'text' })
  typeCode!: string

  @Property({ type: 'int' })
  quantity!: number

  @Property({ name: 'source', type: 'text', default: 'operator' })
  source: string = 'operator'
}

@Entity({ tableName: 'transport_dispatch_orders' })
export class TransportDispatchOrder {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid' })
  organizationId!: string

  @Property({ name: 'consignment_id', type: 'uuid' })
  consignmentId!: string

  @Property({ name: 'expedition_code', type: 'text' })
  expeditionCode!: string

  @Property({ name: 'origin_format', type: 'text' })
  originFormat!: ManifestFormat

  @Property({ name: 'lines_json', type: 'text' })
  linesJson!: string

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()
}

@Entity({ tableName: 'transport_manifests' })
export class TransportManifest {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid' })
  organizationId!: string

  @Property({ name: 'consignment_id', type: 'uuid' })
  consignmentId!: string

  @Property({ name: 'dispatch_order_id', type: 'uuid', nullable: true })
  dispatchOrderId?: string | null

  @Property({ name: 'list_number', type: 'int' })
  listNumber!: number

  @Property({ type: 'text' })
  format!: ManifestFormat

  @Property({ name: 'expedition_code', type: 'text' })
  expeditionCode!: string

  @Property({ name: 'payload_json', type: 'text' })
  payloadJson!: string

  @Property({ name: 'external_ref', type: 'text', nullable: true })
  externalRef?: string | null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()
}
