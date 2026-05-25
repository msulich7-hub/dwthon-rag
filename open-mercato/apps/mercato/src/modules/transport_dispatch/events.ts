import { createModuleEvents } from '@open-mercato/shared/modules/events'

const events = [
  { id: 'transport_dispatch.ifs.imported', label: 'IFS consignments imported', category: 'system' },
  { id: 'transport_dispatch.format_a.completed', label: 'Format A completed', category: 'crud' },
  { id: 'transport_dispatch.format_b.completed', label: 'Format B completed', category: 'crud' },
  { id: 'transport_dispatch.manifest.generated', label: 'Transport list generated', category: 'crud' },
] as const

export const eventsConfig = createModuleEvents({ moduleId: 'transport_dispatch', events })
export const emitTransportDispatchEvent = eventsConfig.emit
export default eventsConfig
