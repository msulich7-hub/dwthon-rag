import type { InjectionWidgetModule } from '@open-mercato/shared/modules/widgets/injection'
import OrderProductionSummaryWidget from './widget.client'

const widget: InjectionWidgetModule<Record<string, unknown>, Record<string, unknown>> = {
  metadata: {
    id: 'mes.injection.order-production-summary',
    title: 'MES order production summary',
    description: 'Summarizes manufacturing work orders for a sales order.',
    features: ['mes.view', 'sales.orders.view'],
    requiredModules: ['mes', 'sales'],
    priority: 40,
    enabled: true,
  },
  Widget: OrderProductionSummaryWidget,
}

export default widget
