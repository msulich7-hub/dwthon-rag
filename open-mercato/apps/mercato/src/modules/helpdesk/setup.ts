import type { ModuleSetupConfig } from '@open-mercato/shared/modules/setup'

export const setup: ModuleSetupConfig = {
  defaultRoleFeatures: {
    superadmin: ['helpdesk.*', 'customers.*'],
    admin: ['helpdesk.*', 'helpdesk.voice', 'customers.companies.view', 'customers.people.view'],
    employee: [
      'helpdesk.submit',
      'helpdesk.view',
      'helpdesk.voice',
      'customers.companies.view',
      'customers.people.view',
    ],
  },
}

export default setup
