import './commands'
import type { ModuleInfo } from '@open-mercato/shared/modules/registry'

export const metadata: ModuleInfo = {
  name: 'call_transcripts',
  title: 'Call Transcripts',
  version: '0.1.0',
  description:
    'Ingests meeting transcripts from Zoom, Gong, and other providers; matches participants to CRM; projects customer interactions.',
  author: 'dwthon-rag',
  license: 'MIT',
}

export default metadata
