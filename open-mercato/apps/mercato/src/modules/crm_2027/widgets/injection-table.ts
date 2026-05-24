import type { ModuleInjectionTable } from '@open-mercato/shared/modules/widgets/injection'

export const injectionTable: ModuleInjectionTable = {
  'detail:customers.deal:header': {
    widgetId: 'crm_2027.injection.deal-copilot',
    priority: 110,
  },
  'menu:sidebar:main': {
    widgetId: 'crm_2027.injection.sidebar-nav',
    priority: 60,
  },
}

export default injectionTable
