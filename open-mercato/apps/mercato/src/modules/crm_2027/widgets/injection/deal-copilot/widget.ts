import type { InjectionWidgetModule } from '@open-mercato/shared/modules/widgets/injection'
import Crm2027DealCopilotWidget from './widget.client'

const widget: InjectionWidgetModule<Record<string, unknown>, Record<string, unknown>> = {
  metadata: {
    id: 'crm_2027.injection.deal-copilot',
    title: 'CRM 2027 Deal Copilot',
    description:
      'Opens the CRM 2027 copilot on deal detail with deal-scoped page context for sentiment and progression tools.',
    features: ['crm_2027.ai', 'customers.deals.view', 'ai_assistant.view'],
    requiredModules: ['ai_assistant', 'customers', 'crm_2027'],
    priority: 110,
    enabled: true,
  },
  Widget: Crm2027DealCopilotWidget,
}

export default widget
