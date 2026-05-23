import { InjectionPosition } from '@open-mercato/shared/modules/widgets/injection-position'
import type { InjectionMenuItemWidget } from '@open-mercato/shared/modules/widgets/injection'
import { HELPDESK_ROUTES } from '../../../lib/helpdesk-routes'

const widget: InjectionMenuItemWidget = {
  metadata: { id: 'helpdesk.injection.sidebar-nav' },
  menuItems: [
    {
      id: 'helpdesk-home',
      label: 'Helpdesk',
      icon: 'LifeBuoy',
      href: HELPDESK_ROUTES.hub,
      features: ['helpdesk.view'],
      groupId: 'helpdesk.nav.group',
      groupLabel: 'Helpdesk',
      placement: { position: InjectionPosition.First },
    },
    {
      id: 'helpdesk-tickets',
      label: 'Tickets',
      icon: 'Ticket',
      href: HELPDESK_ROUTES.tickets,
      features: ['helpdesk.view'],
      groupId: 'helpdesk.nav.group',
      placement: { position: InjectionPosition.After, relativeTo: 'helpdesk-home' },
    },
  ],
}

export default widget
