import { createModuleEvents } from '@open-mercato/shared/modules/events'

const events = [
  {
    id: 'crm_2027.deal.meeting.ingested',
    label: 'Deal meeting ingested',
    entity: 'deal',
    category: 'crud',
  },
  {
    id: 'crm_2027.deal.high_risk',
    label: 'Deal flagged high risk',
    entity: 'deal',
    category: 'custom',
  },
  {
    id: 'crm_2027.email.sync.completed',
    label: 'CRM 2027 email sync completed',
    category: 'system',
  },
] as const

export const eventsConfig = createModuleEvents({ moduleId: 'crm_2027', events })
export const emitCrm2027Event = eventsConfig.emit
export type Crm2027EventId = (typeof events)[number]['id']
export default eventsConfig
