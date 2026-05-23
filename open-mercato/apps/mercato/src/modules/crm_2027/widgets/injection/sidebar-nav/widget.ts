import { InjectionPosition } from '@open-mercato/shared/modules/widgets/injection-position'
import type { InjectionMenuItemWidget } from '@open-mercato/shared/modules/widgets/injection'

const widget: InjectionMenuItemWidget = {
  metadata: {
    id: 'crm_2027.injection.sidebar-nav',
  },
  menuItems: [
    {
      id: 'crm-2027-at-risk',
      label: 'CRM 2027 — At risk',
      icon: 'AlertTriangle',
      href: '/backend/crm_2027/at-risk',
      features: ['crm_2027.view'],
      groupId: 'crm_2027.nav.group',
      groupLabel: 'CRM 2027',
      placement: { position: InjectionPosition.Last },
    },
  ],
}

export default widget
