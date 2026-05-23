import type { ModuleSetupConfig } from '@open-mercato/shared/modules/setup'
import { seedHelpdeskDefaults } from './lib/seed-defaults'

export const setup: ModuleSetupConfig = {
  defaultRoleFeatures: {
    superadmin: ['helpdesk.*', 'customers.*'],
    admin: ['helpdesk.*', 'helpdesk.voice', 'helpdesk.ingest', 'customers.companies.view', 'customers.people.view'],
    employee: [
      'helpdesk.submit',
      'helpdesk.view',
      'helpdesk.voice',
      'customers.companies.view',
      'customers.people.view',
    ],
  },
  async seedDefaults({ container, tenantId, organizationId }) {
    const em = container.resolve<{ fork: () => import('@mikro-orm/postgresql').EntityManager }>('em').fork()
    await seedHelpdeskDefaults(em, { tenantId, organizationId })
  },
}

export default setup
