import { Migration } from '@mikro-orm/migrations'

export class Migration20260524140000_mes_sales_order_link extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table "mes_work_orders" add column if not exists "sales_order_id" uuid null;`,
    )
    this.addSql(
      `create index if not exists "mes_work_orders_scope_sales_order_idx" on "mes_work_orders" ("tenant_id", "organization_id", "sales_order_id");`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "mes_work_orders_scope_sales_order_idx";`)
    this.addSql(`alter table "mes_work_orders" drop column if exists "sales_order_id";`)
  }
}
