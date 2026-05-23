import { z } from 'zod'
import { defineAiTool } from '@open-mercato/ai-assistant'
import { findWithDecryption } from '@open-mercato/shared/lib/encryption/find'
import {
  CustomerActivity,
  CustomerDeal,
} from '@open-mercato/core/modules/customers/data/entities'
import { loadDealContext } from './lib/deal-context'
import { analyzeSentiment } from './lib/sentiment'
import { suggestDealProgression } from './lib/deal-progression'
import { assertCrm2027Scope, daysSince, resolveEm, type Crm2027ToolContext } from './lib/tool-context'

const analyzeTextSentiment = defineAiTool({
  name: 'crm_2027.analyze_text_sentiment',
  description:
    'Analyze tone of an email snippet, chat message, or meeting note. Returns sentiment label, score, and atRisk flag.',
  isMutation: false,
  requiredFeatures: ['crm_2027.ai'],
  inputSchema: z.object({
    text: z.string().min(1).describe('Raw communication text to analyze.'),
  }),
  async handler(input) {
    return analyzeSentiment(input.text)
  },
})

const getDealContext = defineAiTool({
  name: 'crm_2027.get_deal_context',
  description:
    'Load a deal with recent activities for CRM 2027 agents. Scoped to caller tenant and organization.',
  isMutation: false,
  requiredFeatures: ['crm_2027.view', 'customers.deals.view'],
  inputSchema: z.object({
    dealId: z.string().uuid(),
    activityLimit: z.number().int().min(1).max(50).default(10),
  }),
  async handler(input, ctx) {
    assertCrm2027Scope(ctx as Crm2027ToolContext)
    const scope = ctx as Crm2027ToolContext
    const em = resolveEm(scope)
    return loadDealContext(em, scope, input.dealId, input.activityLimit)
  },
})

const suggestDealUpdates = defineAiTool({
  name: 'crm_2027.suggest_deal_updates',
  description:
    'Smart deal progression: suggest stage changes, probability tweaks, and follow-up actions based on deal context and optional sentiment.',
  isMutation: false,
  requiredFeatures: ['crm_2027.ai', 'customers.deals.view'],
  inputSchema: z.object({
    dealId: z.string().uuid(),
    communicationText: z
      .string()
      .optional()
      .describe('Optional latest email/chat/note to factor into suggestions.'),
  }),
  async handler(input, ctx) {
    assertCrm2027Scope(ctx as Crm2027ToolContext)
    const scope = ctx as Crm2027ToolContext
    const em = resolveEm(scope)
    const contextResult = await loadDealContext(em, scope, input.dealId, 15)

    if (!contextResult.found || !contextResult.deal) {
      return { found: false, dealId: input.dealId }
    }

    const sentiment = input.communicationText
      ? analyzeSentiment(input.communicationText)
      : undefined

    const combinedSnippets = [
      ...(contextResult.recentActivitySnippets ?? []),
      ...(input.communicationText ? [input.communicationText] : []),
    ]

    const suggestion = suggestDealProgression({
      dealId: contextResult.deal.id,
      title: contextResult.deal.title,
      status: contextResult.deal.status,
      pipelineStage: contextResult.deal.pipelineStage,
      probability: contextResult.deal.probability,
      daysSinceLastActivity: contextResult.daysSinceLastActivity ?? null,
      recentActivitySnippets: combinedSnippets,
      sentiment,
    })

    return {
      found: true,
      deal: contextResult.deal,
      sentiment: sentiment ?? null,
      suggestion,
      note: 'Apply stage changes via customers.update_deal_stage after operator approval.',
    }
  },
})

const listAtRiskDeals = defineAiTool({
  name: 'crm_2027.list_at_risk_deals',
  description:
    'Scan open deals for stall risk (no recent activity) or negative sentiment in recent activity text.',
  isMutation: false,
  requiredFeatures: ['crm_2027.ai', 'customers.deals.view'],
  inputSchema: z.object({
    limit: z.number().int().min(1).max(50).default(20),
    stallDays: z.number().int().min(7).max(90).default(14),
  }),
  async handler(input, ctx) {
    assertCrm2027Scope(ctx as Crm2027ToolContext)
    const em = resolveEm(ctx as Crm2027ToolContext)
    const scope = ctx as Crm2027ToolContext

    const deals = await findWithDecryption(em, CustomerDeal, {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      status: 'open',
      deletedAt: null,
    })

    const ranked: Array<{
      dealId: string
      title: string
      riskLevel: 'medium' | 'high'
      reasons: string[]
      daysSinceLastActivity: number | null
      sentimentLabel: string | null
    }> = []

    for (const deal of deals.slice(0, 200)) {
      const activities = await em.find(
        CustomerActivity,
        {
          deal: deal.id,
          tenantId: scope.tenantId,
          organizationId: scope.organizationId,
        },
        { orderBy: { occurredAt: 'DESC' }, limit: 3 },
      )

      const textBlob = activities
        .map((a) => [a.subject, a.body].filter(Boolean).join(' '))
        .join('\n')
      const sentiment = textBlob ? analyzeSentiment(textBlob) : null
      const lastAt = activities[0]?.occurredAt ?? activities[0]?.createdAt ?? null
      const idleDays = daysSince(lastAt)

      const reasons: string[] = []
      let riskLevel: 'medium' | 'high' | null = null

      if (sentiment?.atRisk) {
        reasons.push(`negative_sentiment:${sentiment.label}`)
        riskLevel = 'high'
      }
      if (idleDays != null && idleDays >= input.stallDays) {
        reasons.push(`stalled:${idleDays}d`)
        riskLevel = riskLevel ?? 'medium'
      }

      if (riskLevel) {
        ranked.push({
          dealId: deal.id,
          title: deal.title,
          riskLevel,
          reasons,
          daysSinceLastActivity: idleDays,
          sentimentLabel: sentiment?.label ?? null,
        })
      }
    }

    ranked.sort((a, b) => {
      const weight = (r: (typeof ranked)[number]) => (r.riskLevel === 'high' ? 2 : 1)
      return weight(b) - weight(a)
    })

    return {
      items: ranked.slice(0, input.limit),
      total: ranked.length,
    }
  },
})

export const aiTools = [
  analyzeTextSentiment,
  getDealContext,
  suggestDealUpdates,
  listAtRiskDeals,
]

export default aiTools
