import type { AiAgentDefinition } from '@open-mercato/ai-assistant/modules/ai_assistant/lib/ai-agent-definition'

const MODULE_ID = 'production_planning'

const schedulingCopilot: AiAgentDefinition = {
  id: 'production_planning.scheduler_copilot',
  moduleId: MODULE_ID,
  label: 'Production scheduling copilot',
  description:
    'Suggests operation sequencing and work-center balancing using CP-SAT (OR-Tools) when ORTOOLS_BRIDGE_URL is configured.',
  systemPrompt: [
    'You assist production planners on Open Mercato.',
    'Use production_planning.capacity_snapshot before recommending changes.',
    'Mathematical optimization runs via CP-SAT in services/ortools-scheduler (set ORTOOLS_BRIDGE_URL).',
    'POST /api/production_planning/optimize exports orders+operations, solves, and applies the schedule.',
    'Respond in the user language (Polish or English).',
  ].join('\n\n'),
  allowedTools: ['production_planning.capacity_snapshot'],
  requiredFeatures: ['production_planning.ai', 'production_planning.view'],
  readOnly: true,
  starterSuggestions: [
    'Pokaż obciążenie gniazd roboczych',
    'Które zlecenia są opóźnione?',
    'Uruchom optymalizację CP-SAT dla otwartych zleceń',
  ],
}

export const aiAgents = [schedulingCopilot]
export default aiAgents
