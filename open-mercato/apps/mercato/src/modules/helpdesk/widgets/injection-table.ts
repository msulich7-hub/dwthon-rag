import type { ModuleInjectionTable } from '@open-mercato/shared/modules/widgets/injection'

export const injectionTable: ModuleInjectionTable = {
  'menu:sidebar:main': {
    widgetId: 'helpdesk.injection.sidebar-nav',
    priority: 55,
  },
  'detail:customers.company:tabs': [
    {
      widgetId: 'helpdesk.injection.customer-tickets',
      kind: 'tab',
      groupId: 'helpdesk-company-tickets',
      groupLabel: 'helpdesk.customerTickets.tabLabel',
      priority: 50,
    },
  ],
  'detail:customers.person:tabs': [
    {
      widgetId: 'helpdesk.injection.customer-tickets',
      kind: 'tab',
      groupId: 'helpdesk-person-tickets',
      groupLabel: 'helpdesk.customerTickets.tabLabel',
      priority: 50,
    },
  ],
}

export default injectionTable
