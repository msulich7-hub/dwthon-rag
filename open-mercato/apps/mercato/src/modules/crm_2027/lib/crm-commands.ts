import { CRM_OBJECTS, CRM_ROUTES } from './crm-routes'

export type CrmCommandItem = {
  id: string
  label: string
  href?: string
  keywords: string[]
  group: string
}

export const CRM_COMMAND_ITEMS: CrmCommandItem[] = [
  { id: 'home', label: 'CRM 2027 Home', href: CRM_ROUTES.hub, keywords: ['home', 'start'], group: 'Navigate' },
  { id: 'search', label: 'Search CRM', href: CRM_ROUTES.search, keywords: ['find', 'search'], group: 'Navigate' },
  { id: 'at-risk', label: 'At-risk deals', href: CRM_ROUTES.atRisk, keywords: ['risk', 'danger'], group: 'Navigate' },
  { id: 'dashboard', label: 'CRM Dashboard', href: CRM_ROUTES.dashboard, keywords: ['kpi', 'stats'], group: 'Navigate' },
  {
    id: 'forecast',
    label: 'Pipeline forecast',
    href: '/backend/crm_2027/dashboard?tab=forecast',
    keywords: ['forecast', 'weighted', 'pipeline'],
    group: 'Navigate',
  },
  {
    id: 'calendar',
    label: 'Upcoming meetings',
    href: '/backend/crm_2027/calendar',
    keywords: ['calendar', 'meetings', 'calls'],
    group: 'Navigate',
  },
  ...CRM_OBJECTS.map((o) => ({
    id: o.id,
    label: o.label,
    href: o.href,
    keywords: [o.label.toLowerCase(), o.id],
    group: 'Objects',
  })),
  {
    id: 'pipeline',
    label: 'Open pipeline (kanban)',
    href: CRM_ROUTES.dealsKanban,
    keywords: ['kanban', 'board', 'pipeline'],
    group: 'Objects',
  },
  {
    id: 'create-deal',
    label: 'Create deal',
    href: '/backend/customers/deals/create',
    keywords: ['new', 'deal', 'opportunity'],
    group: 'Actions',
  },
  {
    id: 'create-person',
    label: 'Create person',
    href: '/backend/customers/people/create',
    keywords: ['new', 'contact', 'person'],
    group: 'Actions',
  },
]

export function filterCrmCommands(query: string): CrmCommandItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return CRM_COMMAND_ITEMS
  return CRM_COMMAND_ITEMS.filter(
    (item) =>
      item.label.toLowerCase().includes(q) ||
      item.keywords.some((k) => k.includes(q) || q.includes(k)),
  )
}
