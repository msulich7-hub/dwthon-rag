import { redirect } from 'next/navigation'
import { HELPDESK_ROUTES } from '../../../lib/helpdesk-routes'

/** Legacy route — agent queue lives in workspace. */
export default function HelpdeskTicketsRedirectPage() {
  redirect(HELPDESK_ROUTES.workspace)
}
