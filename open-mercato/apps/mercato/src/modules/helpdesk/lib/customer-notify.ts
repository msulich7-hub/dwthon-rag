import React from 'react'
import { sendEmail } from '@open-mercato/shared/lib/email/send'
import type { TicketDetail } from './tickets'

export async function notifyReporterOnPublicReply(
  ticket: TicketDetail,
  commentBody: string,
  portalUrl?: string | null,
): Promise<void> {
  if (ticket.visibility !== 'customer') return
  const email = ticket.reporterEmail?.trim()
  if (!email) return

  const preview = commentBody.trim().slice(0, 500)
  const linkBlock = portalUrl
    ? `View your request: ${portalUrl}`
    : `Reference: ${ticket.ticketKey}`

  try {
    await sendEmail({
      to: email,
      subject: `[${ticket.ticketKey}] Update on your request`,
      react: React.createElement(
        'div',
        null,
        React.createElement('p', null, `Hello${ticket.reporterName ? ` ${ticket.reporterName}` : ''},`),
        React.createElement('p', null, `We posted an update on "${ticket.subject}":`),
        React.createElement('p', { style: { whiteSpace: 'pre-wrap' } }, preview),
        React.createElement('p', null, linkBlock),
      ),
    })
  } catch (err) {
    console.error('[helpdesk] reporter email failed:', err)
  }
}
