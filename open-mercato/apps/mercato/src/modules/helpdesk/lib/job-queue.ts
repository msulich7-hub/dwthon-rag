export const HELPDESK_SLA_SCAN_QUEUE = 'helpdesk:sla-scan'

export type HelpdeskSlaScanJobPayload = {
  tenantId: string
  organizationId: string
}
