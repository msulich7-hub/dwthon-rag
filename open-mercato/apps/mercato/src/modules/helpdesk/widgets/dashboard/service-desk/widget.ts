import { lazyDashboardWidget, type DashboardWidgetModule } from '@open-mercato/shared/modules/dashboard/widgets'
import { DEFAULT_SETTINGS, hydrateServiceDeskSettings, type ServiceDeskWidgetSettings } from './config'

const WidgetClient = lazyDashboardWidget(() => import('./widget.client'))

const widget: DashboardWidgetModule<ServiceDeskWidgetSettings> = {
  metadata: {
    id: 'helpdesk.dashboard.service-desk',
    title: 'Service desk',
    description: 'Open tickets, SLA breaches, and quick link to the Kanban board.',
    features: ['helpdesk.agent', 'helpdesk.view', 'dashboards.view'],
    defaultSize: 'md',
    defaultEnabled: true,
    defaultSettings: DEFAULT_SETTINGS,
  },
  Widget: WidgetClient,
  hydrateSettings: hydrateServiceDeskSettings,
  dehydrateSettings: (value) => ({ showSla: value.showSla }),
}

export default widget
