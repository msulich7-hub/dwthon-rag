import type { InjectionWidgetModule } from '@open-mercato/shared/modules/widgets/injection'
import DealQuickLinksWidget from './widget.client'

const widget: InjectionWidgetModule<Record<string, unknown>, Record<string, unknown>> = {
  metadata: {
    id: 'crm_2027.injection.deal-quick-links',
    title: 'CRM 2027 deal quick links',
    description: 'At-risk and dashboard shortcuts on deal detail header.',
    features: ['crm_2027.view', 'customers.deals.view'],
    requiredModules: ['crm_2027', 'customers'],
    priority: 95,
    enabled: true,
  },
  Widget: DealQuickLinksWidget,
}

export default widget
