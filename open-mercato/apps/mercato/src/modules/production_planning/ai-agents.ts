import type { AiAgentDefinition } from '@open-mercato/ai-assistant/modules/ai_assistant/lib/ai-agent-definition'

const MODULE_ID = 'production_planning'

const schedulingCopilot: AiAgentDefinition = {
  id: 'production_planning.scheduler_copilot',
  moduleId: MODULE_ID,
  label: 'Production scheduling copilot',
  description:
    'Suggests operation sequencing and work-center balancing. Heavy optimization runs via Hexaly bridge when configured.',
  systemPrompt: [
    'You assist production planners on Open Mercato.',
    'Use production_planning.capacity_snapshot before recommending changes.',
    'For mathematical optimization, explain that HEXALY_BRIDGE_URL must point to a Python/Java Hexaly worker.',
    'Respond in the user language (Polish or English).',
  ].join('\n\n'),
  allowedTools: ['production_planning.capacity_snapshot'],
  requiredFeatures: ['production_planning.ai', 'production_planning.view'],
  readOnly: true,
  starterSuggestions: [
    'Pokaż obciążenie gniazd roboczych',
    'Które zlecenia są opóźnione?',
    'Jak podłączyć Hexaly do harmonogramu?',
  ],
}

export const aiAgents = [schedulingCopilot]
export default aiAgents
