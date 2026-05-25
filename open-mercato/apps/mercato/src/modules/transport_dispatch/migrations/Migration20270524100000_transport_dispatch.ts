import { Migration } from '@mikro-orm/migrations'

export class Migration20270524100000_transport_dispatch extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "transport_source_consignments" ("id" uuid not null default gen_random_uuid(), "tenant_id" uuid not null, "organization_id" uuid not null, "ifs_ref" text not null, "recipient_name" text null, "address_line" text null, "complement_raw" text null, "complement_status" text null, "default_expeditor" text null, "ifs_packages_text" text null, "ifs_pallets_text" text null, "load_mix" text not null default 'unknown', "status" text not null default 'pending_a', "processing_format" text null, "processed_at" timestamptz null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "transport_source_consignments_pkey" primary key ("id"));`,
    )
    this.addSql(
      `create unique index if not exists "transport_source_consignments_tenant_ifs_uidx" on "transport_source_consignments" ("tenant_id", "ifs_ref");`,
    )

    this.addSql(
      `create table if not exists "transport_load_unit_lines" ("id" uuid not null default gen_random_uuid(), "tenant_id" uuid not null, "organization_id" uuid not null, "consignment_id" uuid not null, "kind" text not null, "type_code" text not null, "quantity" int not null, "source" text not null default 'operator', constraint "transport_load_unit_lines_pkey" primary key ("id"));`,
    )
    this.addSql(
      `create index if not exists "transport_load_unit_lines_consignment_idx" on "transport_load_unit_lines" ("consignment_id");`,
    )

    this.addSql(
      `create table if not exists "transport_dispatch_orders" ("id" uuid not null default gen_random_uuid(), "tenant_id" uuid not null, "organization_id" uuid not null, "consignment_id" uuid not null, "expedition_code" text not null, "origin_format" text not null, "lines_json" text not null, "created_at" timestamptz not null, constraint "transport_dispatch_orders_pkey" primary key ("id"));`,
    )

    this.addSql(
      `create table if not exists "transport_manifests" ("id" uuid not null default gen_random_uuid(), "tenant_id" uuid not null, "organization_id" uuid not null, "consignment_id" uuid not null, "dispatch_order_id" uuid null, "list_number" int not null, "format" text not null, "expedition_code" text not null, "payload_json" text not null, "external_ref" text null, "created_at" timestamptz not null, constraint "transport_manifests_pkey" primary key ("id"));`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "transport_manifests" cascade;`)
    this.addSql(`drop table if exists "transport_dispatch_orders" cascade;`)
    this.addSql(`drop table if exists "transport_load_unit_lines" cascade;`)
    this.addSql(`drop table if exists "transport_source_consignments" cascade;`)
  }
}
