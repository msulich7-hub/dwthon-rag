import type { AiAgentDefinition } from '@open-mercato/ai-assistant/modules/ai_assistant/lib/ai-agent-definition'

const MODULE_ID = 'crm_2027'

const DISCOVERY_TOOLS = [
  'crm_2027.describe_crm_surface',
  'crm_2027.search_records',
] as const

const READ_TOOLS = [
  'crm_2027.analyze_text_sentiment',
  'crm_2027.get_deal_context',
  'crm_2027.suggest_deal_updates',
  'crm_2027.list_at_risk_deals',
  ...DISCOVERY_TOOLS,
  'customers.list_deals',
  'customers.get_deal',
  'customers.list_activities',
  'customers.list_deal_comments',
  'search.hybrid_search',
] as const

const MUTATION_TOOLS = ['customers.update_deal_stage', 'crm_2027.execute_voice_intent'] as const

const basePrompt = [
  'You are a CRM 2027 assistant on Open Mercato.',
  'Prioritize proactive, agent-based sales workflows: surface at-risk deals, analyze sentiment,',
  'and suggest deal progression — always call tools before answering.',
  'For stage changes, use customers.update_deal_stage only after explicit operator confirmation.',
  'Respond in the user language (Polish or English).',
].join('\n')

const copilot: AiAgentDefinition = {
  id: 'crm_2027.copilot',
  moduleId: MODULE_ID,
  label: 'CRM 2027 Copilot',
  description:
    'Unified deal copilot: sentiment, progression suggestions, and pipeline hygiene on the current deal.',
  systemPrompt: [
    basePrompt,
    'SCOPE: Current deal from pageContext when present; otherwise tenant-wide deal search.',
    'Start with crm_2027.get_deal_context or crm_2027.suggest_deal_updates for deal detail views.',
  ].join('\n\n'),
  allowedTools: [...READ_TOOLS, ...MUTATION_TOOLS],
  requiredFeatures: ['crm_2027.ai', 'customers.deals.view', 'ai_assistant.view'],
  readOnly: false,
  mutationPolicy: 'confirm-required',
  starterSuggestions: [
    'Podsumuj ryzyko tej transakcji',
    'Zasugeruj następny krok w lejku',
    'Przeanalizuj sentyment ostatniej wiadomości',
  ],
}

const dealProgressionAgent: AiAgentDefinition = {
  id: 'crm_2027.deal_progression_agent',
  moduleId: MODULE_ID,
  label: 'Smart Deal Progression',
  description: 'HubSpot-style suggestions for stage, probability, and follow-ups after interactions.',
  systemPrompt: [
    basePrompt,
    'FOCUS: Smart Deal Progression (trend D). Use crm_2027.suggest_deal_updates and explain fieldUpdates clearly.',
    'Never mutate without approval card.',
  ].join('\n\n'),
  allowedTools: [
    'crm_2027.get_deal_context',
    'crm_2027.suggest_deal_updates',
    'crm_2027.analyze_text_sentiment',
    'customers.get_deal',
    'customers.list_activities',
    ...MUTATION_TOOLS,
  ],
  requiredFeatures: ['crm_2027.ai', 'customers.deals.view'],
  readOnly: false,
  mutationPolicy: 'confirm-required',
}

const sentimentMonitorAgent: AiAgentDefinition = {
  id: 'crm_2027.sentiment_monitor_agent',
  moduleId: MODULE_ID,
  label: 'Sentiment Monitor',
  description: 'Detect frustration and negative tone; flag at-risk deals for managers.',
  systemPrompt: [
    basePrompt,
    'FOCUS: Sentiment & emotional AI (trend C). Use crm_2027.analyze_text_sentiment on provided text.',
    'Use crm_2027.list_at_risk_deals for portfolio scans.',
  ].join('\n\n'),
  allowedTools: [
    'crm_2027.analyze_text_sentiment',
    'crm_2027.list_at_risk_deals',
  ...DISCOVERY_TOOLS,
    'crm_2027.get_deal_context',
    'customers.list_deals',
    'customers.get_deal',
  ],
  requiredFeatures: ['crm_2027.ai', 'customers.deals.view'],
  readOnly: true,
  mutationPolicy: 'read-only',
}

const salesAutonomyAgent: AiAgentDefinition = {
  id: 'crm_2027.sales_autonomy_agent',
  moduleId: MODULE_ID,
  label: 'Sales Autonomy',
  description: 'Agent-based CRM hygiene: stalled deals, renewal windows, and proactive follow-ups.',
  systemPrompt: [
    basePrompt,
    'FOCUS: Agent-based CRM (trend A). Prioritize crm_2027.list_at_risk_deals, then propose concrete tasks.',
    'Recommend creating activities; use customers.update_deal_stage only with approval.',
  ].join('\n\n'),
  allowedTools: [...READ_TOOLS, ...MUTATION_TOOLS],
  requiredFeatures: ['crm_2027.ai', 'customers.deals.view'],
  readOnly: false,
  mutationPolicy: 'confirm-required',
}


const crmCopilot: AiAgentDefinition = {
  ...copilot,
  id: 'crm_2027.crm_copilot',
  label: 'CRM Copilot (Twenty parity)',
  description: 'Primary CRM workspace agent with search, sentiment, and deal progression.',
  allowedTools: [...READ_TOOLS, ...DISCOVERY_TOOLS, ...MUTATION_TOOLS],
  starterSuggestions: [
    'Search for Acme in CRM',
    'Which deals are at risk?',
    'Suggest next step for this deal',
    'Analyze sentiment of this email',
  ],
}

export const aiAgents = [crmCopilot, copilot, dealProgressionAgent, sentimentMonitorAgent, salesAutonomyAgent]
export default aiAgents
