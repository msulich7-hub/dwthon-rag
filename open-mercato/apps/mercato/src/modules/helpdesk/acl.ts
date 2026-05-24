export const features = [
  {
    id: 'helpdesk.agent',
    title: 'Service desk agent (queues, assign, resolve)',
    module: 'helpdesk',
  },
  {
    id: 'helpdesk.view',
    title: 'View service desk queues (read-only collaborator)',
    module: 'helpdesk',
  },
  {
    id: 'helpdesk.submit',
    title: 'Submit internal support requests',
    module: 'helpdesk',
  },
  {
    id: 'helpdesk.ingest',
    title: 'Ingest customer-channel tickets (email, integrations)',
    module: 'helpdesk',
  },
  {
    id: 'helpdesk.voice',
    title: 'Voice commands for service desk (transcript → action)',
    module: 'helpdesk',
  },
  /** @deprecated Use helpdesk.agent — kept for backward compatibility in existing grants */
  {
    id: 'helpdesk.manage',
    title: 'Manage helpdesk tickets (legacy alias for agent)',
    module: 'helpdesk',
  },
]

export default features
