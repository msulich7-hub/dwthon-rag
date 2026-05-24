import type { ModuleSetupConfig } from '@open-mercato/shared/modules/setup'

export const setup: ModuleSetupConfig = {
  defaultRoleFeatures: {
    superadmin: ['call_transcripts.*', 'customers.interactions.manage'],
    admin: [
      'call_transcripts.view',
      'call_transcripts.ingest',
      'call_transcripts.manage',
      'customers.interactions.manage',
    ],
    employee: ['call_transcripts.view', 'customers.interactions.manage'],
  },
}

export default setup
