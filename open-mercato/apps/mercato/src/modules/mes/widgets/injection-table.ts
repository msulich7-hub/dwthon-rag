import type { ModuleInjectionTable } from '@open-mercato/shared/modules/widgets/injection'

export const injectionTable: ModuleInjectionTable = {
  'menu:sidebar:main': {
    widgetId: 'mes.injection.sidebar-nav',
    priority: 58,
  },
  'detail:customers.deal:tabs': [
    {
      widgetId: 'mes.injection.deal-work-orders',
      kind: 'tab',
      groupId: 'mes-deal-work-orders',
      groupLabel: 'mes.dealWorkOrders.tabLabel',
      priority: 50,
    },
  ],
  'detail:customers.deal:status-badges': {
    widgetId: 'mes.injection.deal-production-chip',
    priority: 75,
  },
  'sales.document.detail.order:tabs': [
    {
      widgetId: 'mes.injection.order-work-orders',
      kind: 'tab',
      groupId: 'mes-order-work-orders',
      groupLabel: 'mes.orderWorkOrders.tabLabel',
      priority: 48,
    },
  ],
  'sales.document.detail.order:details': {
    widgetId: 'mes.injection.order-production-summary',
    kind: 'stack',
    priority: 35,
  },
}

export default injectionTable
