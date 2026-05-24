import { registerCommand } from '@open-mercato/shared/lib/commands'
import type { CommandBus, CommandHandler } from '@open-mercato/shared/lib/commands'
import type { EntityManager } from '@mikro-orm/postgresql'
import { callTranscriptIngestSchema, type CallTranscriptIngestInput } from '../data/validators'
import { ingestTranscript, type IngestTranscriptResult } from '../lib/ingest-transcript'

const ingestCommand: CommandHandler<CallTranscriptIngestInput, IngestTranscriptResult> = {
  id: 'call_transcripts.ingest',
  async execute(rawInput, ctx) {
    const input = callTranscriptIngestSchema.parse(rawInput)
    const em = ctx.container.resolve<EntityManager>('em')
    const commandBus = ctx.container.resolve<CommandBus>('commandBus')
    return ingestTranscript(
      em,
      ctx.container,
      commandBus,
      {
        container: ctx.container,
        auth: {
          tenantId: input.tenantId,
          orgId: input.organizationId,
        },
        organizationScope: null,
        selectedOrganizationId: input.organizationId,
        organizationIds: [input.organizationId],
      },
      input,
    )
  },
}

registerCommand(ingestCommand)

export default ingestCommand
