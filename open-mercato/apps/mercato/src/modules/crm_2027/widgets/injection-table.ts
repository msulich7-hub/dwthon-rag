import type { ModuleInjectionTable } from '@open-mercato/shared/modules/widgets/injection'

export const injectionTable: ModuleInjectionTable = {
  'detail:customers.deal:header': [
    { widgetId: 'crm_2027.injection.deal-quick-links', priority: 95 },
    { widgetId: 'crm_2027.injection.deal-copilot', priority: 110 },
  ],
  'detail:customers.deal:status-badges': {
    widgetId: 'crm_2027.injection.deal-risk-chips',
    priority: 80,
  },
  'menu:sidebar:main': [
    { widgetId: 'crm_2027.injection.sidebar-nav', priority: 60 },
    { widgetId: 'crm_2027.injection.crm-cmdk', priority: 55 },
  ],
  'admin.page:backend:crm_2027:before': {
    widgetId: 'crm_2027.injection.crm-cmdk',
    priority: 50,
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
  'detail:customers.deal:tabs': [
    {
      widgetId: 'crm_2027.injection.deal-meetings',
      kind: 'tab',
      groupId: 'crm-2027-meetings',
      groupLabel: 'crm_2027.dealMeetings.tabLabel',
      priority: 45,
    },
  ],
}

export default injectionTable
