"use client"

import * as React from 'react'
import { AiIcon } from '@open-mercato/ui/ai/AiIcon'
import { AiChat } from '@open-mercato/ui/ai/AiChat'
import { Button } from '@open-mercato/ui/primitives/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@open-mercato/ui/primitives/dialog'
import { cn } from '@open-mercato/shared/lib/utils'

export const CRM_2027_COPILOT_AGENT_ID = 'crm_2027.copilot'

export interface Crm2027DealPageContext {
  view: 'crm_2027.deal.detail'
  recordType: 'deal'
  recordId: string
  extra: {
    stage: string | null
    pipelineStageId: string | null
  }
}

interface HostInjectionContext {
  dealId?: string
  recordId?: string
  stage?: string | null
  pipelineStageId?: string | null
  data?: {
    deal?: {
      id?: string
      status?: string | null
      pipelineStage?: string | null
      pipelineStageId?: string | null
    }
  }
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function buildPageContext(
  context: HostInjectionContext | undefined,
  data: HostInjectionContext['data'] | undefined,
): Crm2027DealPageContext | null {
  const dealRecord = data?.deal ?? context?.data?.deal
  const dealId =
    readString(context?.dealId) ??
    readString(context?.recordId) ??
    readString(dealRecord?.id) ??
    null
  if (!dealId) return null

  const stage =
    readString(context?.stage) ??
    readString(dealRecord?.status) ??
    readString(dealRecord?.pipelineStage) ??
    null
  const pipelineStageId =
    readString(context?.pipelineStageId) ??
    readString(dealRecord?.pipelineStageId) ??
    null

  return {
    view: 'crm_2027.deal.detail',
    recordType: 'deal',
    recordId: dealId,
    extra: { stage, pipelineStageId },
  }
}

export default function Crm2027DealCopilotWidget({
  context,
  data,
}: {
  context?: HostInjectionContext
  data?: HostInjectionContext['data']
}) {
  const [open, setOpen] = React.useState(false)
  const pageContext = React.useMemo(() => buildPageContext(context, data), [context, data])

  if (!pageContext) return null

  return (
    <>
      <Button
        type="button"
        variant="default"
        size="sm"
        onClick={() => setOpen(true)}
        data-crm-2027-deal-trigger=""
        aria-label="Open CRM 2027 copilot for this deal"
      >
        <AiIcon className="size-4" />
        <span>CRM 2027</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={cn(
            'sm:max-w-xl sm:top-0 sm:bottom-0 sm:right-0 sm:left-auto sm:translate-x-0 sm:translate-y-0',
            'sm:h-screen sm:max-h-screen sm:rounded-none sm:rounded-l-2xl',
            'flex flex-col gap-3 p-4 z-[70]',
          )}
        >
          <DialogHeader>
            <DialogTitle>CRM 2027 Copilot</DialogTitle>
            <DialogDescription>
              Sentiment analysis, smart deal progression, and at-risk scanning — built on Open
              Mercato. Stage changes require your approval.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1">
            <AiChat
              agent={CRM_2027_COPILOT_AGENT_ID}
              pageContext={pageContext as unknown as Record<string, unknown>}
              className="h-full"
              placeholder="Np. „Przeanalizuj sentyment” lub „Co zrobić dalej w lejku?”"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
