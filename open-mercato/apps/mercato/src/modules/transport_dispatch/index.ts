import './commands'
import type { ModuleInfo } from '@open-mercato/shared/modules/registry'

export const metadata: ModuleInfo = {
  name: 'transport_dispatch',
  title: 'Transport Dispatch',
  version: '0.1.0',
  description: 'IFS/AFSU consignments → kiosk split → dual transport lists (Format A & B).',
  author: 'dwthon-rag',
  license: 'MIT',
}

export default metadata
