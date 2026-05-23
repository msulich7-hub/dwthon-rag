/**
 * Twenty-inspired MCP tool catalog for CRM 2027 agents.
 * Surfaces Open Mercato customers APIs without duplicating Twenty's metadata engine.
 */
export const CRM_2027_MCP_SURFACE = {
  module: 'crm_2027',
  objects: [
    {
      id: 'people',
      label: 'People',
      listApi: 'GET /api/customers/people',
      detailRoute: '/backend/customers/people-v2/{id}',
      aiTools: ['customers.list_people', 'customers.get_person'],
    },
    {
      id: 'companies',
      label: 'Companies',
      listApi: 'GET /api/customers/companies',
      detailRoute: '/backend/customers/companies-v2/{id}',
      aiTools: ['customers.list_companies', 'customers.get_company'],
    },
    {
      id: 'deals',
      label: 'Deals',
      listApi: 'GET /api/customers/deals',
      kanbanRoute: '/backend/customers/deals/pipeline',
      detailRoute: '/backend/customers/deals/{id}',
      aiTools: ['customers.list_deals', 'customers.get_deal', 'customers.update_deal_stage'],
    },
  ],
  crm2027Tools: [
    'crm_2027.search_records',
    'crm_2027.describe_crm_surface',
    'crm_2027.analyze_text_sentiment',
    'crm_2027.suggest_deal_updates',
    'crm_2027.list_at_risk_deals',
    'crm_2027.execute_voice_intent',
  ],
  platformMcp: {
    serve: 'yarn mercato ai_assistant mcp:serve-http',
    metaTools: ['api_discover', 'api_execute', 'api_schema'],
  },
} as const
