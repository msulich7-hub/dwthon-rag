import type { NotificationTypeDefinition } from '@open-mercato/shared/modules/notifications/types'

export const notificationTypes: NotificationTypeDefinition[] = [
  {
    type: 'crm_2027.deal.high_risk',
    module: 'crm_2027',
    titleKey: 'crm_2027.notifications.dealHighRisk.title',
    bodyKey: 'crm_2027.notifications.dealHighRisk.body',
    icon: 'alert-triangle',
    severity: 'warning',
    actions: [
      {
        id: 'view',
        labelKey: 'common.view',
        variant: 'outline',
        href: '/backend/customers/deals/{sourceEntityId}',
        icon: 'external-link',
      },
      {
        id: 'board',
        labelKey: 'crm_2027.notifications.dealHighRisk.board',
        variant: 'ghost',
        href: '/backend/crm_2027/at-risk',
      },
    ],
    primaryActionId: 'view',
    linkHref: '/backend/customers/deals/{sourceEntityId}',
    expiresAfterHours: 168,
  },
]

export default notificationTypes
