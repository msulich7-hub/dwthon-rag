import type { SentimentAnalysis } from './sentiment'

export type DealProgressionInput = {
  dealId: string
  title: string
  status: string
  pipelineStage: string | null
  probability: number | null
  daysSinceLastActivity: number | null
  recentActivitySnippets: string[]
  sentiment?: SentimentAnalysis
}

export type DealFieldSuggestion = {
  field: string
  currentValue: unknown
  suggestedValue: unknown
  reason: string
}

export type DealProgressionSuggestion = {
  dealId: string
  summary: string
  suggestedStageChange: string | null
  fieldUpdates: DealFieldSuggestion[]
  followUpActions: string[]
  riskLevel: 'low' | 'medium' | 'high'
}

export function suggestDealProgression(input: DealProgressionInput): DealProgressionSuggestion {
  const followUpActions: string[] = []
  const fieldUpdates: DealFieldSuggestion[] = []
  let suggestedStageChange: string | null = null
  let riskLevel: 'low' | 'medium' | 'high' = 'low'

  const stalled =
    input.daysSinceLastActivity != null && input.daysSinceLastActivity >= 14 && input.status === 'open'
  const atRiskSentiment = input.sentiment?.atRisk === true

  if (atRiskSentiment) {
    riskLevel = 'high'
    followUpActions.push('Notify account owner and manager about negative sentiment.')
    followUpActions.push('Schedule recovery call within 48 hours.')
    fieldUpdates.push({
      field: 'probability',
      currentValue: input.probability,
      suggestedValue: Math.max(5, (input.probability ?? 30) - 15),
      reason: 'Negative sentiment detected in recent communication.',
    })
  } else if (stalled) {
    riskLevel = 'medium'
    followUpActions.push('Log a follow-up activity and re-engage the buyer.')
    if (input.pipelineStage && !/negotiation|proposal/i.test(input.pipelineStage)) {
      suggestedStageChange = 'qualification'
    }
  }

  const positiveMomentum =
    input.sentiment?.label === 'positive' &&
    input.daysSinceLastActivity != null &&
    input.daysSinceLastActivity <= 7

  if (positiveMomentum && input.status === 'open') {
    followUpActions.push('Send tailored follow-up email while momentum is high.')
    if (input.pipelineStage && /qualification|discovery/i.test(input.pipelineStage)) {
      suggestedStageChange = 'proposal'
      fieldUpdates.push({
        field: 'probability',
        currentValue: input.probability,
        suggestedValue: Math.min(90, (input.probability ?? 40) + 10),
        reason: 'Recent positive engagement within 7 days.',
      })
    }
  }

  const summaryParts = [
    `Deal "${input.title}" (${input.dealId.slice(0, 8)}…).`,
    `Status: ${input.status}, stage: ${input.pipelineStage ?? 'n/a'}.`,
  ]
  if (input.daysSinceLastActivity != null) {
    summaryParts.push(`Last activity ${input.daysSinceLastActivity} day(s) ago.`)
  }
  if (input.sentiment) {
    summaryParts.push(`Sentiment: ${input.sentiment.label} (atRisk=${input.sentiment.atRisk}).`)
  }

  return {
    dealId: input.dealId,
    summary: summaryParts.join(' '),
    suggestedStageChange,
    fieldUpdates,
    followUpActions,
    riskLevel,
  }
}
