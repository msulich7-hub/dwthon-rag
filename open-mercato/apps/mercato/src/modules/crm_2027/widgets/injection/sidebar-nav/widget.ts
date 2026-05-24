import { InjectionPosition } from '@open-mercato/shared/modules/widgets/injection-position'
import type { InjectionMenuItemWidget } from '@open-mercato/shared/modules/widgets/injection'

const widget: InjectionMenuItemWidget = {
  metadata: {
    id: 'crm_2027.injection.sidebar-nav',
  },
  menuItems: [
    {
      id: 'crm-2027-home',
      label: 'CRM 2027 Home',
      icon: 'LayoutDashboard',
      href: '/backend/crm_2027',
      features: ['crm_2027.view'],
      groupId: 'crm_2027.nav.group',
      groupLabel: 'CRM 2027',
      placement: { position: InjectionPosition.First },
    },
    {
      id: 'crm-2027-search',
      label: 'Search',
      icon: 'Search',
      href: '/backend/crm_2027/search',
      features: ['crm_2027.view'],
      groupId: 'crm_2027.nav.group',
      placement: { position: InjectionPosition.After, relativeTo: 'crm-2027-home' },
    },
    {
      id: 'crm-2027-people',
      label: 'People',
      icon: 'Users',
      href: '/backend/customers/people',
      features: ['crm_2027.view', 'customers.people.view'],
      groupId: 'crm_2027.nav.group',
      placement: { position: InjectionPosition.After, relativeTo: 'crm-2027-search' },
    },
    {
      id: 'crm-2027-companies',
      label: 'Companies',
      icon: 'Building2',
      href: '/backend/customers/companies',
      features: ['crm_2027.view', 'customers.companies.view'],
      groupId: 'crm_2027.nav.group',
      placement: { position: InjectionPosition.After, relativeTo: 'crm-2027-people' },
    },
    {
      id: 'crm-2027-deals',
      label: 'Deals',
      icon: 'Handshake',
      href: '/backend/crm_2027/deals',
      features: ['crm_2027.view', 'customers.deals.view'],
      groupId: 'crm_2027.nav.group',
      placement: { position: InjectionPosition.After, relativeTo: 'crm-2027-companies' },
    },
    {
      id: 'crm-2027-pipeline',
      label: 'Pipeline',
      icon: 'Kanban',
      href: '/backend/customers/deals/pipeline',
      features: ['crm_2027.view', 'customers.deals.view'],
      groupId: 'crm_2027.nav.group',
      placement: { position: InjectionPosition.After, relativeTo: 'crm-2027-deals' },
    },
    {
      id: 'crm-2027-at-risk',
      label: 'At risk',
      icon: 'AlertTriangle',
      href: '/backend/crm_2027/at-risk',
      features: ['crm_2027.view'],
      groupId: 'crm_2027.nav.group',
      placement: { position: InjectionPosition.Last },
    },
  ],
}

export default widget
