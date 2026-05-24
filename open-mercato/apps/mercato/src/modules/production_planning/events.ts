import { createModuleEvents } from '@open-mercato/shared/modules/events'

const events = [
  {
    id: 'production_planning.order.created',
    label: 'Production order created',
    entity: 'production_order',
    category: 'crud',
  },
  {
    id: 'production_planning.order.late',
    label: 'Production order flagged late',
    entity: 'production_order',
    category: 'custom',
  },
  {
    id: 'production_planning.schedule.refreshed',
    label: 'Capacity schedule refreshed',
    category: 'system',
  },
  {
    id: 'production_planning.optimize.requested',
    label: 'CP-SAT optimization requested',
    category: 'system',
  },
  {
    id: 'production_planning.optimize.completed',
    label: 'CP-SAT optimization completed',
    category: 'system',
  },
  {
    id: 'production_planning.optimize.failed',
    label: 'CP-SAT optimization failed',
    category: 'system',
  },
  {
    id: 'production_planning.optimize.chunk.completed',
    label: 'CP-SAT optimization chunk completed',
    category: 'system',
  },
  {
    id: 'production_planning.schedule.applied',
    label: 'CP-SAT schedule applied to operations',
    entity: 'production_order',
    category: 'crud',
  },
  {
    id: 'production_planning.netting.completed',
    label: 'MRP netting run completed',
    category: 'system',
  },
] as const

export const eventsConfig = createModuleEvents({ moduleId: 'production_planning', events })
export const emitProductionPlanningEvent = eventsConfig.emit
export type ProductionPlanningEventId = (typeof events)[number]['id']
export default eventsConfig
