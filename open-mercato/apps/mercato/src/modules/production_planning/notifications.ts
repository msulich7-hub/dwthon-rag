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
]

export default notificationTypes
