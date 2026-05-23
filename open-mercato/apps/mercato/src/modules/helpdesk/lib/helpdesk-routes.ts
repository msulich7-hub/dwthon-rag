export const HELPDESK_ROUTES = {
  hub: '/backend/helpdesk',
  tickets: '/backend/helpdesk/tickets',
  ticket: (id: string) => `/backend/helpdesk/tickets/${encodeURIComponent(id)}`,
} as const
