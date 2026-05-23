import type { PageMetadata } from '@open-mercato/shared/modules/registry'

export const metadata: PageMetadata = {
  requireAuth: true,
  requireFeatures: ['helpdesk.agent', 'helpdesk.view'],
}

export default metadata
