"use client"

import { useParams } from 'next/navigation'
import { CrmRedirectPage } from '../../../../components/CrmRedirectPage'
import { CRM_ROUTES } from '../../../../lib/crm-routes'

export default function Crm2027DealDetailPage() {
  const params = useParams()
  const id = typeof params?.id === 'string' ? params.id : ''
  return <CrmRedirectPage target={CRM_ROUTES.dealDetail(id)} label="deal" />
}
