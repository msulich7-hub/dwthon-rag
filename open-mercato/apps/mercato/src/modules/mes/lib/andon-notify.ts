import type { EntityManager } from '@mikro-orm/postgresql'
import { MesAndonState } from '../data/entities'
import { emitMesEvent } from '../events'
import type { PulseEscalation } from './pulse-escalation'

export type MesScope = { tenantId: string; organizationId: string }

const NOTIFY_COOLDOWN_MS = 30 * 60 * 1000

export async function maybeNotifyAndonCritical(
  em: EntityManager,
  scope: MesScope,
  escalation: PulseEscalation,
): Promise<boolean> {
  if (escalation.escalationLevel < 3) {
    const state = await em.findOne(MesAndonState, {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
    })
    if (state && state.lastEscalationLevel >= 3) {
      state.lastEscalationLevel = escalation.escalationLevel
      state.updatedAt = new Date()
      await em.flush()
    }
    return false
  }

  const now = new Date()
  let state = await em.findOne(MesAndonState, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })

  if (
    state?.lastNotifiedAt &&
    now.getTime() - state.lastNotifiedAt.getTime() < NOTIFY_COOLDOWN_MS
  ) {
    return false
  }

  if (!state) {
    state = em.create(MesAndonState, {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      lastEscalationLevel: escalation.escalationLevel,
      lastNotifiedAt: now,
    })
  } else {
    state.lastEscalationLevel = escalation.escalationLevel
    state.lastNotifiedAt = now
    state.updatedAt = now
  }

  await em.flush()

  const primaryAlert = escalation.alerts.find((a) => a.level === 'critical') ?? escalation.alerts[0]

  await emitMesEvent('mes.andon.critical', {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    escalationLevel: escalation.escalationLevel,
    alertCode: primaryAlert?.code ?? 'ANDON_CRITICAL',
    andon: escalation.andon,
  })

  return true
}
