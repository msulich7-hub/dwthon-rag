import type { InjectionWidgetModule } from '@open-mercato/shared/modules/widgets/injection'
import OrderWorkOrdersWidget from './widget.client'

const widget: InjectionWidgetModule<Record<string, unknown>, Record<string, unknown>> = {
  metadata: {
    id: 'mes.injection.order-work-orders',
    title: 'MES sales order work orders',
    description: 'Manufacturing work orders linked to a sales order.',
    features: ['mes.view', 'sales.orders.view'],
    requiredModules: ['mes', 'sales'],
    priority: 50,
    enabled: true,
  },
  Widget: OrderWorkOrdersWidget,
}

export default widget
