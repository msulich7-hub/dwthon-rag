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
  {
    type: 'mes.andon.critical',
    module: 'mes',
    titleKey: 'mes.notifications.andonCritical.title',
    bodyKey: 'mes.notifications.andonCritical.body',
    icon: 'alert-triangle',
    severity: 'error',
    actions: [
      {
        id: 'pulse',
        labelKey: 'mes.notifications.andonCritical.pulse',
        variant: 'default',
        href: '/backend/mes/pulse',
        icon: 'activity',
      },
      {
        id: 'operator',
        labelKey: 'mes.notifications.andonCritical.operator',
        variant: 'outline',
        href: '/backend/mes/operator',
        icon: 'play',
      },
    ],
    primaryActionId: 'pulse',
    linkHref: '/backend/mes/pulse',
    expiresAfterHours: 24,
  },
]

export default notificationTypes
