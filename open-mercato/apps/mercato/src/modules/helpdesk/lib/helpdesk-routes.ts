export const HELPDESK_ROUTES = {
  hub: '/backend/helpdesk',
  workspace: '/backend/helpdesk/workspace',
  kanban: '/backend/helpdesk/workspace?view=board',
  report: '/backend/helpdesk/report',
  tickets: '/backend/helpdesk/tickets',
  ticket: (id: string) => `/backend/helpdesk/tickets/${encodeURIComponent(id)}`,
} as const
