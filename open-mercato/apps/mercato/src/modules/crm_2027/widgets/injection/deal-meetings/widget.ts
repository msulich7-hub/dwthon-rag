import type { InjectionWidgetModule } from '@open-mercato/shared/modules/widgets/injection'
import DealMeetingsWidget from './widget.client'

const widget: InjectionWidgetModule<Record<string, unknown>, Record<string, unknown>> = {
  metadata: {
    id: 'crm_2027.injection.deal-meetings',
    title: 'CRM 2027 deal meetings',
    description: 'Ingest meeting transcripts and show sentiment, progression, and risk on deal detail.',
    features: ['crm_2027.view', 'customers.deals.view'],
    requiredModules: ['crm_2027', 'customers'],
    priority: 50,
    enabled: true,
  },
  Widget: DealMeetingsWidget,
}

export default widget
