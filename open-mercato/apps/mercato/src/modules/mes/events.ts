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
  {
    id: 'mes.andon.critical',
    label: 'Andon critical escalation',
    entity: 'andon',
    category: 'alert',
  },
  {
    id: 'mes.lot.created',
    label: 'Lot created',
    entity: 'lot',
    category: 'crud',
  },
  {
    id: 'mes.material.consumed',
    label: 'Material consumed',
    entity: 'lot',
    category: 'crud',
  },
  {
    id: 'mes.serial.created',
    label: 'Serial number created',
    entity: 'serial',
    category: 'crud',
  },
  {
    id: 'mes.production.output_recorded',
    label: 'Production output recorded',
    entity: 'work_order',
    category: 'crud',
  },
  {
    id: 'mes.quality.hold_created',
    label: 'Quality hold created',
    entity: 'quality_hold',
    category: 'alert',
  },
  {
    id: 'mes.quality.hold_released',
    label: 'Quality hold released',
    entity: 'quality_hold',
    category: 'crud',
  },
  {
    id: 'mes.checklist.template_created',
    label: 'Checklist template created',
    entity: 'checklist_template',
    category: 'crud',
  },
  {
    id: 'mes.checklist.run_started',
    label: 'Checklist run started',
    entity: 'checklist_run',
    category: 'crud',
  },
  {
    id: 'mes.checklist.run_completed',
    label: 'Checklist run completed',
    entity: 'checklist_run',
    category: 'crud',
  },
  {
    id: 'mes.downtime.started',
    label: 'Downtime started',
    entity: 'downtime',
    category: 'alert',
  },
  {
    id: 'mes.downtime.ended',
    label: 'Downtime ended',
    entity: 'downtime',
    category: 'crud',
  },
] as const

export const eventsConfig = createModuleEvents({ moduleId: 'mes', events })
export const emitMesEvent = eventsConfig.emit
export type MesEventId = (typeof events)[number]['id']
export default eventsConfig
