import type { PageMetadata } from '@open-mercato/shared/modules/registry'

export const metadata: PageMetadata = {
  requireAuth: true,
  requireFeatures: ['crm_2027.view', 'customers.people.view'],
}

export default metadata
