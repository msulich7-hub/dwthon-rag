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
  {
    id: 'mes.routing_template.created',
    label: 'Routing template created',
    entity: 'routing_template',
    category: 'crud',
  },
  {
    id: 'mes.routing_template.updated',
    label: 'Routing template updated',
    entity: 'routing_template',
    category: 'crud',
  },
  {
    id: 'mes.work_order.operations_applied',
    label: 'Routing applied to work order',
    entity: 'work_order',
    category: 'crud',
  },
  {
    id: 'mes.operation.status_changed',
    label: 'Operation status changed',
    entity: 'work_order_operation',
    category: 'crud',
  },
  {
    id: 'mes.operation.confirmed',
    label: 'Operation confirmed',
    entity: 'work_order_operation',
    category: 'crud',
  },
] as const

export const eventsConfig = createModuleEvents({ moduleId: 'mes', events })
export const emitMesEvent = eventsConfig.emit
export type MesEventId = (typeof events)[number]['id']
export default eventsConfig
