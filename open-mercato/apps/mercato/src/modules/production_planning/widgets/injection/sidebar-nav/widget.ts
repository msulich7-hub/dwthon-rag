import { InjectionPosition } from '@open-mercato/shared/modules/widgets/injection-position'
import type { InjectionMenuItemWidget } from '@open-mercato/shared/modules/widgets/injection'
import { PP_ROUTES } from '../../../lib/routes'

const widget: InjectionMenuItemWidget = {
  metadata: { id: 'production_planning.injection.sidebar-nav' },
  menuItems: [
    {
      id: 'pp-hub',
      label: 'Planowanie produkcji',
      icon: 'Factory',
      href: PP_ROUTES.hub,
      features: ['production_planning.view'],
      groupId: 'production_planning.nav.group',
      groupLabel: 'Planowanie produkcji',
      placement: { position: InjectionPosition.First },
    },
    {
      id: 'pp-orders',
      label: 'Zlecenia produkcyjne',
      icon: 'ClipboardList',
      href: PP_ROUTES.orders,
      features: ['production_planning.view'],
      groupId: 'production_planning.nav.group',
      placement: { position: InjectionPosition.After, relativeTo: 'pp-hub' },
    },
    {
      id: 'pp-schedule',
      label: 'Harmonogram',
      icon: 'CalendarRange',
      href: PP_ROUTES.schedule,
      features: ['production_planning.view'],
      groupId: 'production_planning.nav.group',
      placement: { position: InjectionPosition.After, relativeTo: 'pp-orders' },
    },
    {
      id: 'pp-scenarios',
      label: 'Scenario Lab',
      icon: 'FlaskConical',
      href: PP_ROUTES.scenarios,
      features: ['production_planning.view'],
      groupId: 'production_planning.nav.group',
      placement: { position: InjectionPosition.After, relativeTo: 'pp-schedule' },
    },
    {
      id: 'pp-gantt',
      label: 'Gantt',
      icon: 'GanttChart',
      href: PP_ROUTES.gantt,
      features: ['production_planning.view'],
      groupId: 'production_planning.nav.group',
      placement: { position: InjectionPosition.After, relativeTo: 'pp-scenarios' },
    },
    {
      id: 'pp-control-tower',
      label: 'Control tower',
      icon: 'Radar',
      href: PP_ROUTES.controlTower,
      features: ['production_planning.view'],
      groupId: 'production_planning.nav.group',
      placement: { position: InjectionPosition.Last },
    },
  ],
}

export default widget
