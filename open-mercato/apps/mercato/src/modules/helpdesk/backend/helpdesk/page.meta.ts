import type { PageMetadata } from '@open-mercato/shared/modules/registry'

export const metadata: PageMetadata = {
  requireAuth: true,
  requireFeatures: ['helpdesk.view', 'helpdesk.submit', 'helpdesk.agent'],
}

export default metadata
