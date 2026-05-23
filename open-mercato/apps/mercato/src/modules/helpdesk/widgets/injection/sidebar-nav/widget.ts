import { InjectionPosition } from '@open-mercato/shared/modules/widgets/injection-position'
import type { InjectionMenuItemWidget } from '@open-mercato/shared/modules/widgets/injection'
import { HELPDESK_ROUTES } from '../../../lib/helpdesk-routes'

const widget: InjectionMenuItemWidget = {
  metadata: { id: 'helpdesk.injection.sidebar-nav' },
  menuItems: [
    {
      id: 'helpdesk-home',
      label: 'Service desk',
      icon: 'LifeBuoy',
      href: HELPDESK_ROUTES.hub,
      features: ['helpdesk.view', 'helpdesk.submit', 'helpdesk.agent'],
      groupId: 'helpdesk.nav.group',
      groupLabel: 'Service desk',
      placement: { position: InjectionPosition.First },
    },
    {
      id: 'helpdesk-workspace',
      label: 'Agent workspace',
      icon: 'LayoutGrid',
      href: HELPDESK_ROUTES.workspace,
      features: ['helpdesk.agent', 'helpdesk.view'],
      groupId: 'helpdesk.nav.group',
      placement: { position: InjectionPosition.After, relativeTo: 'helpdesk-home' },
    },
    {
      id: 'helpdesk-report',
      label: 'Report issue',
      icon: 'PlusCircle',
      href: HELPDESK_ROUTES.report,
      features: ['helpdesk.submit'],
      groupId: 'helpdesk.nav.group',
      placement: { position: InjectionPosition.After, relativeTo: 'helpdesk-workspace' },
    },
  ],
}

export default widget
