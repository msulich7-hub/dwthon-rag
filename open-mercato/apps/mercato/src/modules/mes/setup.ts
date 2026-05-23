import type { ModuleSetupConfig } from '@open-mercato/shared/modules/setup'

export const setup: ModuleSetupConfig = {
  defaultRoleFeatures: {
    superadmin: ['mes.*', 'customers.*', 'catalog.products.view'],
    admin: [
      'mes.*',
      'customers.deals.view',
      'customers.deals.manage',
      'catalog.products.view',
    ],
    employee: ['mes.view', 'customers.deals.view', 'catalog.products.view'],
  },
}

export default setup
