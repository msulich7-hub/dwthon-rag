import type { NotificationTypeDefinition } from '@open-mercato/shared/modules/notifications/types'

export const notificationTypes: NotificationTypeDefinition[] = [
  {
    type: 'mes.work_order.completed',
    module: 'mes',
    titleKey: 'mes.notifications.workOrderCompleted.title',
    bodyKey: 'mes.notifications.workOrderCompleted.body',
    icon: 'check-circle',
    severity: 'info',
    actions: [
      {
        id: 'view',
        labelKey: 'common.view',
        variant: 'outline',
        href: '/backend/mes',
        icon: 'external-link',
      },
    ],
    primaryActionId: 'view',
    linkHref: '/backend/mes',
    expiresAfterHours: 72,
  },
]

export default notificationTypes
