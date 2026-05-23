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
  const url = portalUrl ?? ticket.portalPublicUrl ?? null

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
        url
          ? React.createElement(
              'p',
              null,
              'View status and reply: ',
              React.createElement('a', { href: url }, url),
            )
          : React.createElement('p', null, `Reference: ${ticket.ticketKey}`),
      ),
    })
  } catch (err) {
    console.error('[helpdesk] reporter email failed:', err)
  }
}
