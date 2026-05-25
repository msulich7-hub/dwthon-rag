import { registerCommand } from '@open-mercato/shared/lib/commands'
import type { CommandHandler } from '@open-mercato/shared/lib/commands'
import type { EntityManager } from '@mikro-orm/postgresql'
import { z } from 'zod'
import { formatACompleteSchema, formatBCompleteSchema } from '../data/validators'
import { completeFormatA, completeFormatB } from '../lib/complete-format'

const formatACommand: CommandHandler<
  { tenantId: string; organizationId: string; consignmentId: string; input: unknown },
  Awaited<ReturnType<typeof completeFormatA>>
> = {
  id: 'transport_dispatch.format_a.complete',
  async execute(raw, ctx) {
    const parsed = z
      .object({
        tenantId: z.string().uuid(),
        organizationId: z.string().uuid(),
        consignmentId: z.string().uuid(),
        input: formatACompleteSchema,
      })
      .parse(raw)
    const em = ctx.container.resolve<EntityManager>('em')
    return completeFormatA(em, parsed, parsed.consignmentId, parsed.input)
  },
}

const formatBCommand: CommandHandler<
  { tenantId: string; organizationId: string; consignmentId: string; input: unknown },
  Awaited<ReturnType<typeof completeFormatB>>
> = {
  id: 'transport_dispatch.format_b.complete',
  async execute(raw, ctx) {
    const parsed = z
      .object({
        tenantId: z.string().uuid(),
        organizationId: z.string().uuid(),
        consignmentId: z.string().uuid(),
        input: formatBCompleteSchema,
      })
      .parse(raw)
    const em = ctx.container.resolve<EntityManager>('em')
    return completeFormatB(em, parsed, parsed.consignmentId, parsed.input)
  },
}

registerCommand(formatACommand)
registerCommand(formatBCommand)
