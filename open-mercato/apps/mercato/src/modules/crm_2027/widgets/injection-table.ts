import type { ModuleInjectionTable } from '@open-mercato/shared/modules/widgets/injection'

export const injectionTable: ModuleInjectionTable = {
  'detail:customers.deal:header': [
    { widgetId: 'crm_2027.injection.deal-quick-links', priority: 95 },
    { widgetId: 'crm_2027.injection.deal-copilot', priority: 110 },
  ],
  'menu:sidebar:main': {
    widgetId: 'crm_2027.injection.sidebar-nav',
    priority: 60,
  },
  'data-table:customers.people.list:search-trailing': {
    widgetId: 'crm_2027.injection.list-context-bar',
    priority: 40,
  },
  'data-table:customers.companies.list:search-trailing': {
    widgetId: 'crm_2027.injection.list-context-bar',
    priority: 40,
  },
  'data-table:customers.deals.list:search-trailing': {
    widgetId: 'crm_2027.injection.list-context-bar',
    priority: 35,
  },
}

export default injectionTable
