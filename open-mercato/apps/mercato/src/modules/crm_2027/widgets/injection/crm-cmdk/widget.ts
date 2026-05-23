import type { InjectionWidgetModule } from '@open-mercato/shared/modules/widgets/injection'
import CrmCmdkHotkeyWidget from './widget.client'

const widget: InjectionWidgetModule<Record<string, unknown>, Record<string, unknown>> = {
  metadata: {
    id: 'crm_2027.injection.crm-cmdk',
    title: 'CRM 2027 Cmd+K hotkey',
    description: 'Opens the CRM 2027 command palette with Cmd+K / Ctrl+K on supported pages.',
    features: ['crm_2027.view'],
    requiredModules: ['crm_2027'],
    priority: 30,
    enabled: true,
  },
  Widget: CrmCmdkHotkeyWidget,
}

export default widget
