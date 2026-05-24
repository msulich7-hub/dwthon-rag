export type HelpdeskTriageResult = {
  priority: 'low' | 'medium' | 'high' | 'urgent'
  category: string
  labels: string[]
  summary: string
}

const URGENT_PATTERNS = [
  /\burgent\b/i,
  /\basap\b/i,
  /\boutage\b/i,
  /\bdown\b/i,
  /\bcritical\b/i,
  /\bprodukcj/i,
  /\bnie działa\b/i,
  /\bblocker\b/i,
]

const HIGH_PATTERNS = [
  /\bbug\b/i,
  /\berror\b/i,
  /\bbłąd\b/i,
  /\bawaria\b/i,
  /\bcan't\b/i,
  /\bnie mogę\b/i,
  /\bpilne\b/i,
]

const BILLING_PATTERNS = [/\binvoice\b/i, /\bfaktur/i, /\bpayment\b/i, /\bpłatno/i, /\bbilling\b/i]
const ACCESS_PATTERNS = [/\blogin\b/i, /\bpassword\b/i, /\bhasło\b/i, /\baccess\b/i, /\bdostęp\b/i]
const FEATURE_PATTERNS = [/\bfeature\b/i, /\brequest\b/i, /\bprośba\b/i, /\benhancement\b/i]

function matchAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text))
}

export function triageHelpdeskMessage(subject: string, body: string): HelpdeskTriageResult {
  const combined = `${subject}\n${body}`.trim()
  const labels: string[] = []

  let priority: HelpdeskTriageResult['priority'] = 'medium'
  if (matchAny(combined, URGENT_PATTERNS)) {
    priority = 'urgent'
    labels.push('urgent_language')
  } else if (matchAny(combined, HIGH_PATTERNS)) {
    priority = 'high'
    labels.push('incident_language')
  } else if (combined.length < 80) {
    priority = 'low'
    labels.push('short_message')
  }

  let category = 'general'
  if (matchAny(combined, BILLING_PATTERNS)) {
    category = 'billing'
    labels.push('billing')
  } else if (matchAny(combined, ACCESS_PATTERNS)) {
    category = 'access'
    labels.push('access')
  } else if (matchAny(combined, FEATURE_PATTERNS)) {
    category = 'feature_request'
    labels.push('feature_request')
  }

  const firstLine = body.split('\n').map((line) => line.trim()).find(Boolean) ?? subject
  const summary =
    firstLine.length > 160 ? `${firstLine.slice(0, 157)}…` : firstLine || subject.slice(0, 160)

  return { priority, category, labels, summary }
}
