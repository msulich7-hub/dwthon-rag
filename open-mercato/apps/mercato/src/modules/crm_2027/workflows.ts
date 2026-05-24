import { defineWorkflow, createWorkflowsModuleConfig } from '@open-mercato/shared/modules/workflows'

const highRiskFollowUp = defineWorkflow({
  workflowId: 'crm_2027.high-risk-follow-up',
  workflowName: 'CRM 2027 High-Risk Deal Follow-Up',
  description:
    'Creates a follow-up task when CRM 2027 flags a deal as high risk after a meeting or scan.',
  metadata: { category: 'CRM 2027', tags: ['crm', 'risk', 'sales'], icon: 'alert-triangle' },
  steps: [
    { stepId: 'start', stepName: 'Start', stepType: 'START', description: 'Risk signal received' },
    {
      stepId: 'review',
      stepName: 'Review at-risk deal',
      stepType: 'USER_TASK',
      description: 'Account owner reviews sentiment and next steps',
      userTaskConfig: {
        formSchema: {
          type: 'object',
          required: ['acknowledged'],
          properties: {
            acknowledged: {
              type: 'boolean',
              title: 'Acknowledged',
              description: 'Confirm you reviewed the high-risk deal',
            },
            notes: { type: 'string', title: 'Notes' },
          },
        },
        slaDuration: 'PT48H',
      },
    },
    { stepId: 'end', stepName: 'Complete', stepType: 'END', description: 'Follow-up recorded' },
  ] as const,
  transitions: [
    {
      transitionId: 'start_to_review',
      transitionName: 'Open review task',
      fromStepId: 'start',
      toStepId: 'review',
      trigger: 'auto',
      priority: 100,
    },
    {
      transitionId: 'review_to_end',
      transitionName: 'Complete',
      fromStepId: 'review',
      toStepId: 'end',
      trigger: 'auto',
      priority: 100,
    },
  ],
  triggers: [
    {
      triggerId: 'crm_2027_high_risk_trigger',
      name: 'High-risk deal detected',
      description: 'Starts when CRM 2027 emits a high-risk deal event',
      eventPattern: 'crm_2027.deal.high_risk',
      enabled: true,
      priority: 0,
    },
  ],
})

const meetingIngestedReview = defineWorkflow({
  workflowId: 'crm_2027.meeting-ingested-review',
  workflowName: 'CRM 2027 Meeting Review',
  description: 'Optional review after a meeting transcript is ingested with negative sentiment.',
  metadata: { category: 'CRM 2027', tags: ['crm', 'meetings'], icon: 'video' },
  steps: [
    { stepId: 'start', stepName: 'Start', stepType: 'START' },
    {
      stepId: 'review',
      stepName: 'Review meeting notes',
      stepType: 'USER_TASK',
      userTaskConfig: {
        formSchema: {
          type: 'object',
          properties: {
            summary: { type: 'string', title: 'Summary' },
          },
        },
      },
    },
    { stepId: 'end', stepName: 'Complete', stepType: 'END' },
  ] as const,
  transitions: [
    {
      transitionId: 'start_to_review',
      fromStepId: 'start',
      toStepId: 'review',
      trigger: 'auto',
      priority: 100,
    },
    {
      transitionId: 'review_to_end',
      fromStepId: 'review',
      toStepId: 'end',
      trigger: 'auto',
      priority: 100,
    },
  ],
  triggers: [
    {
      triggerId: 'crm_2027_meeting_ingested_trigger',
      name: 'Meeting ingested',
      eventPattern: 'crm_2027.deal.meeting.ingested',
      enabled: false,
      priority: 0,
    },
  ],
})

export const workflowsConfig = createWorkflowsModuleConfig({
  moduleId: 'crm_2027',
  workflows: [highRiskFollowUp, meetingIngestedReview],
})

export default workflowsConfig
