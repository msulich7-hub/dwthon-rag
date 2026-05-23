import { InjectionPosition } from '@open-mercato/shared/modules/widgets/injection-position'
import type { InjectionMenuItemWidget } from '@open-mercato/shared/modules/widgets/injection'
import { CRM_ROUTES } from '../../../lib/crm-routes'

const widget: InjectionMenuItemWidget = {
  metadata: { id: 'crm_2027.injection.sidebar-nav' },
  menuItems: [
    { id: 'crm-2027-home', label: 'CRM 2027 Home', icon: 'LayoutDashboard', href: CRM_ROUTES.hub, features: ['crm_2027.view'], groupId: 'crm_2027.nav.group', groupLabel: 'CRM 2027', placement: { position: InjectionPosition.First } },
    { id: 'crm-2027-dashboard', label: 'Dashboard', icon: 'BarChart3', href: CRM_ROUTES.dashboard, features: ['crm_2027.view'], groupId: 'crm_2027.nav.group', placement: { position: InjectionPosition.After, relativeTo: 'crm-2027-home' } },
    { id: 'crm-2027-search', label: 'Search', icon: 'Search', href: CRM_ROUTES.search, features: ['crm_2027.view'], groupId: 'crm_2027.nav.group', placement: { position: InjectionPosition.After, relativeTo: 'crm-2027-dashboard' } },
    { id: 'crm-2027-people', label: 'People', icon: 'Users', href: CRM_ROUTES.peopleShell, features: ['crm_2027.view', 'customers.people.view'], groupId: 'crm_2027.nav.group', placement: { position: InjectionPosition.After, relativeTo: 'crm-2027-search' } },
    { id: 'crm-2027-companies', label: 'Companies', icon: 'Building2', href: CRM_ROUTES.companiesShell, features: ['crm_2027.view', 'customers.companies.view'], groupId: 'crm_2027.nav.group', placement: { position: InjectionPosition.After, relativeTo: 'crm-2027-people' } },
    { id: 'crm-2027-deals', label: 'Deals', icon: 'Handshake', href: CRM_ROUTES.dealsShell, features: ['crm_2027.view', 'customers.deals.view'], groupId: 'crm_2027.nav.group', placement: { position: InjectionPosition.After, relativeTo: 'crm-2027-companies' } },
    { id: 'crm-2027-pipeline', label: 'Pipeline', icon: 'Kanban', href: CRM_ROUTES.dealsKanban, features: ['crm_2027.view', 'customers.deals.view'], groupId: 'crm_2027.nav.group', placement: { position: InjectionPosition.After, relativeTo: 'crm-2027-deals' } },
    { id: 'crm-2027-at-risk', label: 'At risk', icon: 'AlertTriangle', href: CRM_ROUTES.atRisk, features: ['crm_2027.view'], groupId: 'crm_2027.nav.group', placement: { position: InjectionPosition.Last } },
  ],
}
export default widget
