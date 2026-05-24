import type { InjectionWidgetModule } from '@open-mercato/shared/modules/widgets/injection'
import DealRiskChipsWidget from './widget.client'

const widget: InjectionWidgetModule<Record<string, unknown>, Record<string, unknown>> = {
  metadata: {
    id: 'crm_2027.injection.deal-risk-chips',
    title: 'CRM 2027 deal risk chips',
    description: 'Shows at-risk sentiment/stall chips on deal detail status badges.',
    features: ['crm_2027.view', 'customers.deals.view'],
    requiredModules: ['crm_2027', 'customers'],
    priority: 85,
    enabled: true,
  },
  Widget: DealRiskChipsWidget,
}

export default widget
