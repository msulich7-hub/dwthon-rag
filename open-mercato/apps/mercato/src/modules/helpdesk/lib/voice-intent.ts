export type HelpdeskVoiceIntentKind =
  | 'create_ticket'
  | 'add_internal_note'
  | 'add_public_reply'
  | 'assign_to_me'
  | 'set_status'
  | 'search_kb'
  | 'unknown'

export type HelpdeskVoiceIntentResult = {
  intent: HelpdeskVoiceIntentKind
  confidence: number
  parameters: Record<string, string>
  raw: string
}

const CREATE_TICKET = [/utwórz ticket|utworz ticket|create ticket|nowe zgłoszenie|nowe zgloszenie|open ticket/i]
const INTERNAL_NOTE = [/notatka wewnętrzna|internal note|dodaj notatkę wewn|dodaj notatke wewn/i]
const PUBLIC_REPLY = [/odpowiedz klientowi|reply to customer|wyślij odpowiedź|wyslij odpowiedz|public reply/i]
const ASSIGN_ME = [/przypisz do mnie|assign to me|take this ticket|weź ticket|wez ticket/i]
const SET_STATUS = [
  /ustaw status|set status|oznacz jako|mark as/i,
  /\b(open|otwarty|in progress|w toku|waiting|oczekuje|resolved|rozwiązany|rozwiązane|closed|zamknięty)\b/i,
]
const SEARCH_KB = [/szukaj w bazie|search knowledge|znajdź artykuł|znajdz artykul|kb article/i]

function extractStatus(text: string): string | undefined {
  const lower = text.toLowerCase()
  if (/\b(open|otwarty)\b/.test(lower)) return 'open'
  if (/\b(in progress|w toku)\b/.test(lower)) return 'in_progress'
  if (/\b(waiting|oczekuje)\b/.test(lower)) return 'waiting'
  if (/\b(resolved|rozwiązan)/.test(lower)) return 'resolved'
  if (/\b(closed|zamknięty|zamkniety)\b/.test(lower)) return 'closed'
  return undefined
}

function extractBody(text: string): string {
  const colon = text.split(':')
  if (colon.length > 1) return colon.slice(1).join(':').trim()
  return text.trim()
}

export function parseHelpdeskVoiceIntent(transcript: string): HelpdeskVoiceIntentResult {
  const raw = transcript.trim()
  if (!raw) {
    return { intent: 'unknown', confidence: 0, parameters: {}, raw }
  }

  for (const p of ASSIGN_ME) {
    if (p.test(raw)) {
      return { intent: 'assign_to_me', confidence: 0.88, parameters: {}, raw }
    }
  }

  for (const p of SET_STATUS) {
    if (p.test(raw)) {
      const status = extractStatus(raw) ?? 'in_progress'
      return {
        intent: 'set_status',
        confidence: 0.85,
        parameters: { status },
        raw,
      }
    }
  }

  for (const p of INTERNAL_NOTE) {
    if (p.test(raw)) {
      return {
        intent: 'add_internal_note',
        confidence: 0.86,
        parameters: { body: extractBody(raw) },
        raw,
      }
    }
  }

  for (const p of PUBLIC_REPLY) {
    if (p.test(raw)) {
      return {
        intent: 'add_public_reply',
        confidence: 0.86,
        parameters: { body: extractBody(raw) },
        raw,
      }
    }
  }

  for (const p of CREATE_TICKET) {
    if (p.test(raw)) {
      return {
        intent: 'create_ticket',
        confidence: 0.84,
        parameters: { subject: extractBody(raw).slice(0, 200) || raw.slice(0, 200), body: raw },
        raw,
      }
    }
  }

  for (const p of SEARCH_KB) {
    if (p.test(raw)) {
      return {
        intent: 'search_kb',
        confidence: 0.8,
        parameters: { query: extractBody(raw) || raw },
        raw,
      }
    }
  }

  if (raw.length > 20) {
    return {
      intent: 'add_internal_note',
      confidence: 0.55,
      parameters: { body: raw },
      raw,
    }
  }

  return { intent: 'unknown', confidence: 0, parameters: {}, raw }
}
