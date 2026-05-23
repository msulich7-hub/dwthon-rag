import { createModuleEvents } from '@open-mercato/shared/modules/events'

const events = [
  {
    id: 'mes.work_order.created',
    label: 'Work order created',
    entity: 'work_order',
    category: 'crud',
  },
  {
    id: 'mes.work_order.status_changed',
    label: 'Work order status changed',
    entity: 'work_order',
    category: 'crud',
  },
] as const

export const eventsConfig = createModuleEvents({ moduleId: 'mes', events })
export const emitMesEvent = eventsConfig.emit
export type MesEventId = (typeof events)[number]['id']
export default eventsConfig
