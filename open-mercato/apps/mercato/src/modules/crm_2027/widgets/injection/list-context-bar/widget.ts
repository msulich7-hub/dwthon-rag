import type { InjectionWidgetModule } from '@open-mercato/shared/modules/widgets/injection'
import ListContextBarWidget from './widget.client'

const widget: InjectionWidgetModule<Record<string, unknown>, Record<string, unknown>> = {
  metadata: {
    id: 'crm_2027.injection.list-context-bar',
    title: 'CRM 2027 list context',
    description: 'Shows CRM 2027 navigation chips on customers list toolbars (no core edits).',
    features: ['crm_2027.view'],
    requiredModules: ['crm_2027', 'customers'],
    priority: 40,
    enabled: true,
  },
  Widget: ListContextBarWidget,
}

export default widget
