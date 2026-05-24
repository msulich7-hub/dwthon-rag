import { registerCommand } from '@open-mercato/shared/lib/commands'
import type { CommandHandler } from '@open-mercato/shared/lib/commands'
import type { EntityManager } from '@mikro-orm/postgresql'
import { z } from 'zod'
import { Crm2027DealRiskFlag } from '../data/entities'

export const riskFlagUpsertSchema = z.object({
  tenantId: z.string().uuid(),
  organizationId: z.string().uuid(),
  dealId: z.string().uuid(),
  dealTitle: z.string().min(1),
  riskLevel: z.enum(['medium', 'high']),
  reasons: z.array(z.string()),
  sentimentLabel: z.string().nullable().optional(),
  daysSinceLastActivity: z.number().int().nullable().optional(),
  lastScannedAt: z.coerce.date().optional(),
})

export type RiskFlagUpsertInput = z.infer<typeof riskFlagUpsertSchema>

const upsertRiskFlagCommand: CommandHandler<RiskFlagUpsertInput, { id: string }> = {
  id: 'crm_2027.risk_flags.upsert',
  async execute(rawInput, ctx) {
    const input = riskFlagUpsertSchema.parse(rawInput)
    const em = ctx.container.resolve<EntityManager>('em')

    let record = await em.findOne(Crm2027DealRiskFlag, {
      tenantId: input.tenantId,
      organizationId: input.organizationId,
      dealId: input.dealId,
    })

    if (!record) {
      record = em.create(Crm2027DealRiskFlag, {
        tenantId: input.tenantId,
        organizationId: input.organizationId,
        dealId: input.dealId,
        dealTitle: input.dealTitle,
        riskLevel: input.riskLevel,
        reasonsJson: JSON.stringify(input.reasons),
        sentimentLabel: input.sentimentLabel ?? null,
        daysSinceLastActivity: input.daysSinceLastActivity ?? null,
        lastScannedAt: input.lastScannedAt ?? new Date(),
      })
      await em.persistAndFlush(record)
      return { id: record.id }
    }

    record.dealTitle = input.dealTitle
    record.riskLevel = input.riskLevel
    record.reasonsJson = JSON.stringify(input.reasons)
    record.sentimentLabel = input.sentimentLabel ?? null
    record.daysSinceLastActivity = input.daysSinceLastActivity ?? null
    record.lastScannedAt = input.lastScannedAt ?? new Date()
    await em.flush()

    return { id: record.id }
  },
}

registerCommand(upsertRiskFlagCommand)

export default upsertRiskFlagCommand
