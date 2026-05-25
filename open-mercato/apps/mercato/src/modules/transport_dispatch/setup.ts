import type { ModuleSetupConfig } from '@open-mercato/shared/modules/setup'

export const setup: ModuleSetupConfig = {
  defaultRoleFeatures: {
    superadmin: ['transport_dispatch.*'],
    admin: [
      'transport_dispatch.view',
      'transport_dispatch.format_a',
      'transport_dispatch.format_b',
      'transport_dispatch.manage',
    ],
    employee: [
      'transport_dispatch.view',
      'transport_dispatch.format_a',
      'transport_dispatch.format_b',
    ],
  },
}

export default setup
