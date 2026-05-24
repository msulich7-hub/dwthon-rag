import type { ModuleInjectionTable } from '@open-mercato/shared/modules/widgets/injection'

export const injectionTable: ModuleInjectionTable = {
  'menu:sidebar:main': {
    widgetId: 'production_planning.injection.sidebar-nav',
    priority: 58,
  },
  'admin.page:backend:production_planning:before': {
    widgetId: 'production_planning.injection.sidebar-nav',
    priority: 50,
  },
  'detail:sales.order:stage-bar': {
    widgetId: 'production_planning.injection.order-status',
    priority: 70,
  },
  'sales.document.detail.order:tabs': [
    {
      widgetId: 'production_planning.injection.order-schedule',
      kind: 'tab',
      groupId: 'production-planning-order-schedule',
      groupLabel: 'production_planning.orderSchedule.tabLabel',
      priority: 42,
    },
  ],
}

export default injectionTable
