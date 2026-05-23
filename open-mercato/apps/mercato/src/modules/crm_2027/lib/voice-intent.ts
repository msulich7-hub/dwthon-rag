export type VoiceIntentKind =
  | 'create_task'
  | 'update_deal'
  | 'log_note'
  | 'search_contact'
  | 'unknown'

export type VoiceIntentResult = {
  intent: VoiceIntentKind
  confidence: number
  parameters: Record<string, string>
  raw: string
}

const TASK_PATTERNS = [
  /utwórz zadanie|utworz zadanie|create task|add task|zadanie na/i,
  /skontaktuj się|skontaktuj sie|contact .+ on/i,
]

const DEAL_PATTERNS = [
  /zaktualizuj transakcj|update deal|zmień etap|zmien etap|move deal/i,
  /etap sprzedaży|pipeline stage/i,
]

const NOTE_PATTERNS = [/zapisz notatk|log note|dodaj notatk/i]

const CONTACT_PATTERNS = [/znajdź kontakt|znajdz kontakt|find contact|search for/i]

function extractPersonName(text: string): string | undefined {
  const pl = text.match(
    /(?:skontaktuj się|skontaktuj sie|contact)\s+(?:z\s+)?([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+(?:\s+[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)?)/i,
  )
  if (pl?.[1]) return pl[1].trim()

  const en = text.match(/contact\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i)
  return en?.[1]?.trim()
}

function extractDueHint(text: string): string | undefined {
  const dayMatch = text.match(
    /\b(pn|wt|śr|sr|czw|pt|sob|niedz|monday|tuesday|wednesday|thursday|friday|saturday|sunday|jutro|tomorrow|dziś|dzis|today)\b/i,
  )
  return dayMatch?.[1]
}

export function parseVoiceIntent(transcript: string): VoiceIntentResult {
  const raw = transcript.trim()
  if (!raw) {
    return { intent: 'unknown', confidence: 0, parameters: {}, raw }
  }

  for (const pattern of TASK_PATTERNS) {
    if (pattern.test(raw)) {
      return {
        intent: 'create_task',
        confidence: 0.82,
        parameters: {
          title: raw,
          contactName: extractPersonName(raw) ?? '',
          dueHint: extractDueHint(raw) ?? '',
        },
        raw,
      }
    }
  }

  for (const pattern of DEAL_PATTERNS) {
    if (pattern.test(raw)) {
      return {
        intent: 'update_deal',
        confidence: 0.8,
        parameters: { instruction: raw },
        raw,
      }
    }
  }

  for (const pattern of NOTE_PATTERNS) {
    if (pattern.test(raw)) {
      return {
        intent: 'log_note',
        confidence: 0.78,
        parameters: { body: raw },
        raw,
      }
    }
  }

  for (const pattern of CONTACT_PATTERNS) {
    if (pattern.test(raw)) {
      return {
        intent: 'search_contact',
        confidence: 0.75,
        parameters: { query: raw },
        raw,
      }
    }
  }

  return { intent: 'unknown', confidence: 0.3, parameters: { text: raw }, raw }
}
