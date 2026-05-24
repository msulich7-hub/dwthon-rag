import { InjectionPosition } from '@open-mercato/shared/modules/widgets/injection-position'
import type { InjectionMenuItemWidget } from '@open-mercato/shared/modules/widgets/injection'
import { MES_ROUTES } from '../../../lib/mes-routes'

const widget: InjectionMenuItemWidget = {
  metadata: { id: 'mes.injection.sidebar-nav' },
  menuItems: [
    {
      id: 'mes-home',
      label: 'MES',
      icon: 'Factory',
      href: MES_ROUTES.hub,
      features: ['mes.view'],
      groupId: 'mes.nav.group',
      groupLabel: 'Manufacturing',
      placement: { position: InjectionPosition.First },
    },
    {
      id: 'mes-work-orders',
      label: 'Work orders',
      icon: 'ClipboardList',
      href: MES_ROUTES.workOrders,
      features: ['mes.view'],
      groupId: 'mes.nav.group',
      placement: { position: InjectionPosition.After, relativeTo: 'mes-home' },
    },
    {
      id: 'mes-operator',
      label: 'Operator queue',
      icon: 'Play',
      href: MES_ROUTES.operator,
      features: ['mes.view', 'mes.execute'],
      groupId: 'mes.nav.group',
      placement: { position: InjectionPosition.After, relativeTo: 'mes-work-orders' },
    },
    {
      id: 'mes-pulse',
      label: 'Pulse',
      icon: 'Activity',
      href: MES_ROUTES.pulse,
      features: ['mes.view'],
      groupId: 'mes.nav.group',
      placement: { position: InjectionPosition.After, relativeTo: 'mes-operator' },
    },
    {
      id: 'mes-routing',
      label: 'Routing',
      icon: 'GitBranch',
      href: MES_ROUTES.routing,
      features: ['mes.view'],
      groupId: 'mes.nav.group',
      placement: { position: InjectionPosition.After, relativeTo: 'mes-pulse' },
    },
    {
      id: 'mes-trace',
      label: 'Trace',
      icon: 'Search',
      href: MES_ROUTES.trace,
      features: ['mes.trace.view'],
      groupId: 'mes.nav.group',
      placement: { position: InjectionPosition.After, relativeTo: 'mes-routing' },
    },
    {
      id: 'mes-quality',
      label: 'Quality',
      icon: 'ShieldCheck',
      href: MES_ROUTES.quality,
      features: ['mes.quality.view'],
      groupId: 'mes.nav.group',
      placement: { position: InjectionPosition.After, relativeTo: 'mes-trace' },
    },
  ],
}

export default widget
