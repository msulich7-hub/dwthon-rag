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
      id: 'mes-operator',
      label: 'Operator queue',
      icon: 'Play',
      href: MES_ROUTES.operator,
      features: ['mes.view', 'mes.execute'],
      groupId: 'mes.nav.group',
      placement: { position: InjectionPosition.After, relativeTo: 'mes-home' },
    },
  ],
}

export default widget
