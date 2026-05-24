import type { InjectionWidgetModule } from '@open-mercato/shared/modules/widgets/injection'
import OrderProductionStatusWidget from './widget.client'

const widget: InjectionWidgetModule<Record<string, unknown>, Record<string, unknown>> = {
  metadata: {
    id: 'production_planning.injection.order-status',
    title: 'Production status on sales order',
    description: 'Shows linked production orders and late flags on the order stage bar.',
    features: ['production_planning.view', 'sales.orders.view'],
    requiredModules: ['production_planning', 'sales'],
    priority: 50,
    enabled: true,
  },
  Widget: OrderProductionStatusWidget,
}

export default widget
