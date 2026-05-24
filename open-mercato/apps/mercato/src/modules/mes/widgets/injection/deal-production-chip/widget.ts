import type { InjectionWidgetModule } from '@open-mercato/shared/modules/widgets/injection'
import DealProductionChipWidget from './widget.client'

const widget: InjectionWidgetModule<Record<string, unknown>, Record<string, unknown>> = {
  metadata: {
    id: 'mes.injection.deal-production-chip',
    title: 'MES deal production status',
    description: 'Shows active work order count on deal detail header.',
    features: ['mes.view', 'customers.deals.view'],
    requiredModules: ['mes', 'customers'],
    priority: 75,
    enabled: true,
  },
  Widget: DealProductionChipWidget,
}

export default widget
