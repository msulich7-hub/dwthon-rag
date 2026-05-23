import type { NotificationTypeDefinition } from '@open-mercato/shared/modules/notifications/types'

export const notificationTypes: NotificationTypeDefinition[] = [
  {
    type: 'helpdesk.ticket.comment',
    module: 'helpdesk',
    titleKey: 'helpdesk.notifications.comment.title',
    bodyKey: 'helpdesk.notifications.comment.body',
    icon: 'message-square',
    severity: 'info',
    actions: [
      {
        id: 'view',
        labelKey: 'common.view',
        variant: 'outline',
        href: '/backend/helpdesk/tickets/{sourceEntityId}',
        icon: 'external-link',
      },
    ],
    primaryActionId: 'view',
    linkHref: '/backend/helpdesk/tickets/{sourceEntityId}',
    expiresAfterHours: 72,
  },
  {
    type: 'helpdesk.ticket.assigned',
    module: 'helpdesk',
    titleKey: 'helpdesk.notifications.assigned.title',
    bodyKey: 'helpdesk.notifications.assigned.body',
    icon: 'user-check',
    severity: 'info',
    actions: [
      {
        id: 'view',
        labelKey: 'common.view',
        variant: 'outline',
        href: '/backend/helpdesk/tickets/{sourceEntityId}',
        icon: 'external-link',
      },
    ],
    primaryActionId: 'view',
    linkHref: '/backend/helpdesk/tickets/{sourceEntityId}',
    expiresAfterHours: 72,
  },
  {
    type: 'helpdesk.ticket.status_changed',
    module: 'helpdesk',
    titleKey: 'helpdesk.notifications.status.title',
    bodyKey: 'helpdesk.notifications.status.body',
    icon: 'refresh-cw',
    severity: 'info',
    linkHref: '/backend/helpdesk/tickets/{sourceEntityId}',
    expiresAfterHours: 48,
  },
]

export default notificationTypes
