import type { ModuleSetupConfig } from '@open-mercato/shared/modules/setup'

export const setup: ModuleSetupConfig = {
  defaultRoleFeatures: {
    superadmin: ['helpdesk.*', 'customers.*'],
    admin: ['helpdesk.*', 'customers.companies.view', 'customers.people.view'],
    employee: [
      'helpdesk.submit',
      'helpdesk.view',
      'customers.companies.view',
      'customers.people.view',
    ],
  },
}

export default setup
