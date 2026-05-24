"use client"

import { CrmRedirectPage } from '../../../components/CrmRedirectPage'
import { CRM_ROUTES } from '../../../lib/crm-routes'

export default function Crm2027PeoplePage() {
  return <CrmRedirectPage target={CRM_ROUTES.peopleList} label="people" />
}
