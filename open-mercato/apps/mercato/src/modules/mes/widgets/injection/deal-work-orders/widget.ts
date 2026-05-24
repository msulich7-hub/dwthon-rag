import type { InjectionWidgetModule } from '@open-mercato/shared/modules/widgets/injection'
import DealWorkOrdersWidget from './widget.client'

const widget: InjectionWidgetModule<Record<string, unknown>, Record<string, unknown>> = {
  metadata: {
    id: 'mes.injection.deal-work-orders',
    title: 'MES deal work orders',
    description: 'List and create manufacturing work orders linked to a CRM deal.',
    features: ['mes.view', 'customers.deals.view'],
    requiredModules: ['mes', 'customers'],
    priority: 50,
    enabled: true,
  },
  Widget: DealWorkOrdersWidget,
}

export default widget
