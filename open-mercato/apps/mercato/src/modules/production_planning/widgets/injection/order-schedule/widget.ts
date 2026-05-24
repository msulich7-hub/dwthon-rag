import type { InjectionWidgetModule } from '@open-mercato/shared/modules/widgets/injection'
import OrderScheduleWidget from './widget.client'

const widget: InjectionWidgetModule<Record<string, unknown>, Record<string, unknown>> = {
  metadata: {
    id: 'production_planning.injection.order-schedule',
    title: 'Production schedule tab on sales order',
    description: 'Lists and creates production orders linked to the sales order.',
    features: ['production_planning.view', 'sales.orders.view'],
    requiredModules: ['production_planning', 'sales'],
    priority: 50,
    enabled: true,
  },
  Widget: OrderScheduleWidget,
}

export default widget
