import type { ModuleSetupConfig } from '@open-mercato/shared/modules/setup'

export const setup: ModuleSetupConfig = {
  defaultRoleFeatures: {
    superadmin: ['mes.*', 'customers.*', 'sales.orders.view', 'catalog.products.view'],
    admin: [
      'mes.*',
      'customers.deals.view',
      'customers.deals.manage',
      'sales.orders.view',
      'catalog.products.view',
    ],
    employee: [
      'mes.view',
      'mes.execute',
      'customers.deals.view',
      'sales.orders.view',
      'catalog.products.view',
    ],
  },
}

export default setup
