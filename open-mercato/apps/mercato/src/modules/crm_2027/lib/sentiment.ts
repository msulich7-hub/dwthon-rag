export type SentimentLabel = 'positive' | 'neutral' | 'negative' | 'frustrated'

export type SentimentAnalysis = {
  label: SentimentLabel
  score: number
  confidence: number
  signals: string[]
  atRisk: boolean
}

const POSITIVE = [
  'dziękuję',
  'dziekuje',
  'super',
  'świetnie',
  'swietnie',
  'great',
  'thanks',
  'thank you',
  'excellent',
  'happy',
  'zadowolony',
  'potwierdzam',
]

const NEGATIVE = [
  'rozczarowany',
  'nie działa',
  'nie dziala',
  'problem',
  'reklamacja',
  'cancel',
  'anuluj',
  'unhappy',
  'disappointed',
  'frustrated',
  'angry',
]

const FRUSTRATED = [
  'jak mówiłem',
  'jak mowilem',
  'po raz kolejny',
  'again',
  'still waiting',
  'nadal czekam',
  'nie odpowiadacie',
  'no response',
  'escalate',
  'eskalacja',
]

/**
 * Lightweight heuristic sentiment scorer for Phase 1.
 * Agents can interpret nuance; this tool returns deterministic signals for workflows.
 */
export function analyzeSentiment(text: string): SentimentAnalysis {
  const normalized = text.trim().toLowerCase()
  if (!normalized) {
    return {
      label: 'neutral',
      score: 0,
      confidence: 0.2,
      signals: ['empty_text'],
      atRisk: false,
    }
  }

  const signals: string[] = []
  let score = 0

  for (const token of FRUSTRATED) {
    if (normalized.includes(token)) {
      signals.push(`frustrated:${token}`)
      score -= 2
    }
  }
  for (const token of NEGATIVE) {
    if (normalized.includes(token)) {
      signals.push(`negative:${token}`)
      score -= 1
    }
  }
  for (const token of POSITIVE) {
    if (normalized.includes(token)) {
      signals.push(`positive:${token}`)
      score += 1
    }
  }

  const exclamations = (normalized.match(/!/g) ?? []).length
  if (exclamations >= 2) {
    signals.push('high_exclamation')
    score -= 0.5
  }

  let label: SentimentLabel = 'neutral'
  if (signals.some((s) => s.startsWith('frustrated:'))) {
    label = 'frustrated'
  } else if (score <= -2) {
    label = 'negative'
  } else if (score >= 2) {
    label = 'positive'
  } else if (score < 0) {
    label = 'negative'
  } else if (score > 0) {
    label = 'positive'
  }

  const confidence = Math.min(0.95, 0.45 + signals.length * 0.12)
  const atRisk = label === 'frustrated' || label === 'negative' || score <= -2

  return { label, score, confidence, signals, atRisk }
}
