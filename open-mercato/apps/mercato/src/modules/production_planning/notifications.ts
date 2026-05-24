import type { NotificationTypeDefinition } from '@open-mercato/shared/modules/notifications/types'

export const notificationTypes: NotificationTypeDefinition[] = [
  {
    type: 'production_planning.order.late',
    module: 'production_planning',
    titleKey: 'production_planning.notifications.orderLate.title',
    bodyKey: 'production_planning.notifications.orderLate.body',
    icon: 'clock',
    severity: 'warning',
    actions: [
      {
        id: 'view',
        labelKey: 'common.view',
        variant: 'outline',
        href: '/backend/production_planning/orders/{sourceEntityId}',
        icon: 'external-link',
      },
    ],
    primaryActionId: 'view',
    linkHref: '/backend/production_planning/orders/{sourceEntityId}',
    expiresAfterHours: 168,
  },
  {
    type: 'production_planning.netting.completed',
    module: 'production_planning',
    titleKey: 'production_planning.notifications.nettingCompleted.title',
    bodyKey: 'production_planning.notifications.nettingCompleted.body',
    icon: 'layers',
    severity: 'info',
    linkHref: '/backend/production_planning/genesis',
    expiresAfterHours: 72,
  },
  {
    type: 'production_planning.optimize.completed',
    module: 'production_planning',
    titleKey: 'production_planning.notifications.optimizeCompleted.title',
    bodyKey: 'production_planning.notifications.optimizeCompleted.body',
    icon: 'cpu',
    severity: 'info',
    linkHref: '/backend/production_planning/schedule',
    expiresAfterHours: 72,
  },
]

export default notificationTypes
