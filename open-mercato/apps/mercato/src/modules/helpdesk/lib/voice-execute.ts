import type { EntityManager } from '@mikro-orm/postgresql'
import { parseHelpdeskVoiceIntent, type HelpdeskVoiceIntentResult } from './voice-intent'
import { createTicket, addTicketComment, updateTicket, getTicketDetail } from './tickets'
import { searchKbArticles } from './kb'
import type { TicketDetail } from './tickets'

export type HelpdeskVoiceExecuteInput = {
  transcript: string
  ticketId?: string
  userId: string | null
}

export type HelpdeskVoiceExecuteResult = {
  intent: HelpdeskVoiceIntentResult
  executed: boolean
  message: string
  ticket?: TicketDetail | null
  kbMatches?: Array<{ id: string; title: string; slug: string }>
}

export async function executeHelpdeskVoiceIntent(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
  input: HelpdeskVoiceExecuteInput,
): Promise<HelpdeskVoiceExecuteResult> {
  const intent = parseHelpdeskVoiceIntent(input.transcript)

  if (intent.intent === 'unknown') {
    return {
      intent,
      executed: false,
      message: 'Nie rozpoznano komendy. Spróbuj: „przypisz do mnie”, „notatka wewnętrzna: …”, „ustaw status resolved”.',
    }
  }

  if (intent.intent === 'search_kb') {
    const articles = await searchKbArticles(em, scope, intent.parameters.query ?? input.transcript, 5)
    return {
      intent,
      executed: true,
      message: articles.length ? `Znaleziono ${articles.length} artykuł(ów) KB.` : 'Brak pasujących artykułów KB.',
      kbMatches: articles.map((a) => ({ id: a.id, title: a.title, slug: a.slug })),
    }
  }

  if (intent.intent === 'create_ticket') {
    const ticket = await createTicket(em, scope, {
      subject: intent.parameters.subject || 'Voice ticket',
      body: intent.parameters.body || input.transcript,
      source: 'manual',
    }, {
      visibility: 'internal',
      requesterType: 'staff',
      requesterUserId: input.userId,
    })
    return {
      intent,
      executed: true,
      message: `Utworzono ticket ${ticket.ticketKey}.`,
      ticket,
    }
  }

  const ticketId = input.ticketId
  if (!ticketId) {
    return {
      intent,
      executed: false,
      message: 'Otwórz ticket lub podaj ticketId, aby wykonać tę komendę.',
    }
  }

  if (intent.intent === 'assign_to_me') {
    if (!input.userId) {
      return { intent, executed: false, message: 'Brak identyfikatora użytkownika do przypisania.' }
    }
    const ticket = await updateTicket(em, scope, ticketId, { assigneeUserId: input.userId })
    return {
      intent,
      executed: Boolean(ticket),
      message: ticket ? 'Ticket przypisany do Ciebie.' : 'Nie znaleziono ticketu.',
      ticket,
    }
  }

  if (intent.intent === 'set_status') {
    const status = intent.parameters.status as 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed'
    const ticket = await updateTicket(em, scope, ticketId, { status })
    return {
      intent,
      executed: Boolean(ticket),
      message: ticket ? `Status ustawiony na ${status}.` : 'Nie znaleziono ticketu.',
      ticket,
    }
  }

  if (intent.intent === 'add_internal_note' || intent.intent === 'add_public_reply') {
    const body = intent.parameters.body || input.transcript
    const ticket = await addTicketComment(
      em,
      scope,
      ticketId,
      { body, isInternal: intent.intent === 'add_internal_note' },
      input.userId,
    )
    return {
      intent,
      executed: Boolean(ticket),
      message: ticket
        ? intent.intent === 'add_internal_note'
          ? 'Dodano notatkę wewnętrzną.'
          : 'Wysłano odpowiedź do zgłaszającego.'
        : 'Nie znaleziono ticketu.',
      ticket,
    }
  }

  return { intent, executed: false, message: 'Komenda nieobsługiwana.' }
}
