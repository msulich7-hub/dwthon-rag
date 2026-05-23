import type { ModuleSetupConfig } from '@open-mercato/shared/modules/setup'

export const setup: ModuleSetupConfig = {
  defaultRoleFeatures: {
    superadmin: ['crm_2027.*', 'customers.*', 'ai_assistant.*'],
    admin: ['crm_2027.*', 'customers.deals.view', 'customers.deals.manage', 'ai_assistant.view'],
    employee: ['crm_2027.view', 'crm_2027.ai', 'customers.deals.view', 'ai_assistant.view'],
  },
}

export default setup
