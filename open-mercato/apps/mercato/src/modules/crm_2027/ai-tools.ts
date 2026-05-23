import { z } from 'zod'
import { defineAiTool } from '@open-mercato/ai-assistant'
import { loadDealContext } from './lib/deal-context'
import { scanAtRiskDeals } from './lib/at-risk-scan'
import { analyzeSentimentSmart } from './lib/sentiment-analyze'
import { suggestDealProgression } from './lib/deal-progression'
import { executeVoiceIntent } from './lib/voice-execute'
import { assertCrm2027Scope, resolveEm, type Crm2027ToolContext } from './lib/tool-context'
import type { CommandBus } from '@open-mercato/shared/lib/commands'
import { searchCrmRecords } from './lib/crm-search'
import { CRM_2027_MCP_SURFACE } from './lib/crm-mcp-surface'


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
    const result = await analyzeSentimentSmart(input.text, { preferLlm: true })
    return result
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
    const scope = ctx as Crm2027ToolContext
    const em = resolveEm(scope)
    const items = await scanAtRiskDeals(em, {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      limit: input.limit,
      stallDays: input.stallDays,
    })
    return { items, total: items.length }
  },
})


const searchRecords = defineAiTool({
  name: 'crm_2027.search_records',
  description: 'Twenty-style unified search across people, companies, and deals.',
  isMutation: false,
  requiredFeatures: ['crm_2027.view', 'customers.people.view'],
  inputSchema: z.object({
    q: z.string().min(1),
    limit: z.number().int().min(1).max(30).default(10),
  }),
  async handler(input, ctx) {
    assertCrm2027Scope(ctx as Crm2027ToolContext)
    const scope = ctx as Crm2027ToolContext
    const em = resolveEm(scope)
    const items = await searchCrmRecords(em, scope, input.q, input.limit)
    return { items, total: items.length }
  },
})

const describeCrmSurface = defineAiTool({
  name: 'crm_2027.describe_crm_surface',
  description:
    'Returns CRM object catalog and tool names (Twenty MCP get_tool_catalog equivalent for Open Mercato).',
  isMutation: false,
  requiredFeatures: ['crm_2027.ai'],
  inputSchema: z.object({}),
  async handler() {
    return CRM_2027_MCP_SURFACE
  },
})

const executeVoiceIntentTool = defineAiTool({
  name: 'crm_2027.execute_voice_intent',
  description:
    'Execute a voice or natural-language command: create task/note interactions. Deal stage changes still require approval flow.',
  isMutation: true,
  requiredFeatures: ['crm_2027.voice', 'customers.interactions.manage'],
  inputSchema: z.object({
    transcript: z.string().min(1),
    dealId: z.string().uuid().optional(),
    entityId: z.string().uuid().optional(),
  }),
  async handler(input, ctx) {
    assertCrm2027Scope(ctx as Crm2027ToolContext)
    const scope = ctx as Crm2027ToolContext
    const em = resolveEm(scope)
    const commandBus = ctx.container.resolve('commandBus') as CommandBus
    return executeVoiceIntent(em, commandBus, ctx, scope, input)
  },
})

export const aiTools = [
  describeCrmSurface,
  searchRecords,
  analyzeTextSentiment,
  getDealContext,
  suggestDealUpdates,
  listAtRiskDeals,
  executeVoiceIntentTool,
]

export default aiTools
