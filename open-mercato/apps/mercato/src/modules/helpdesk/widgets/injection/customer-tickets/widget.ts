import type { InjectionWidgetModule } from '@open-mercato/shared/modules/widgets/injection'
import CustomerTicketsWidget from './widget.client'

const widget: InjectionWidgetModule<Record<string, unknown>, Record<string, unknown>> = {
  metadata: {
    id: 'helpdesk.injection.customer-tickets',
    title: 'Helpdesk customer tickets',
    description: 'List and create helpdesk tickets from company or person detail.',
    features: ['helpdesk.view'],
    requiredModules: ['helpdesk', 'customers'],
    priority: 50,
    enabled: true,
  },
  Widget: CustomerTicketsWidget,
}

export default widget
