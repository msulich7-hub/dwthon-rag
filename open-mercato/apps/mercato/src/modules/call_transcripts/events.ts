import { createModuleEvents } from '@open-mercato/shared/modules/events'

const events = [
  {
    id: 'call_transcripts.transcript.ingested',
    label: 'Call transcript ingested',
    category: 'crud',
  },
  {
    id: 'call_transcripts.transcript.unmatched',
    label: 'Call transcript unmatched',
    category: 'custom',
  },
  {
    id: 'call_transcripts.transcript.matched',
    label: 'Call transcript matched to CRM',
    category: 'crud',
  },
] as const

export const eventsConfig = createModuleEvents({ moduleId: 'call_transcripts', events })
export const emitCallTranscriptsEvent = eventsConfig.emit
export type CallTranscriptsEventId = (typeof events)[number]['id']
export default eventsConfig
