/** CRM 2027 route map — composes Open Mercato customers module (Twenty-style namespace). */
export const CRM_ROUTES = {
  hub: '/backend/crm_2027',
  search: '/backend/crm_2027/search',
  atRisk: '/backend/crm_2027/at-risk',
  calendar: '/backend/crm_2027/calendar',
  dashboard: '/backend/crm_2027/dashboard',
  peopleShell: '/backend/crm_2027/people',
  companiesShell: '/backend/crm_2027/companies',
  dealsShell: '/backend/crm_2027/deals',
  peopleList: '/backend/customers/people',
  peopleDetail: (id: string) => `/backend/customers/people-v2/${id}`,
  companiesList: '/backend/customers/companies',
  companyDetail: (id: string) => `/backend/customers/companies-v2/${id}`,
  dealsList: '/backend/customers/deals',
  dealsKanban: '/backend/customers/deals/pipeline',
  dealDetail: (id: string) => `/backend/customers/deals/${id}`,
  tasksList: '/backend/customers/deals',
  interactionsApi: '/api/customers/interactions',
} as const

export const CRM_OBJECTS = [
  { id: 'people', label: 'People', href: CRM_ROUTES.peopleShell, icon: 'Users' },
  { id: 'companies', label: 'Companies', href: CRM_ROUTES.companiesShell, icon: 'Building2' },
  { id: 'deals', label: 'Deals', href: CRM_ROUTES.dealsShell, icon: 'Handshake' },
  { id: 'pipeline', label: 'Pipeline', href: CRM_ROUTES.dealsKanban, icon: 'Kanban' },
] as const
