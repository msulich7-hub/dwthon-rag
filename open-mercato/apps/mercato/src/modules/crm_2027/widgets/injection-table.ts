import type { ModuleInjectionTable } from '@open-mercato/shared/modules/widgets/injection'

export const injectionTable: ModuleInjectionTable = {
  'detail:customers.deal:header': {
    widgetId: 'crm_2027.injection.deal-copilot',
    priority: 110,
  },
}

export default injectionTable
