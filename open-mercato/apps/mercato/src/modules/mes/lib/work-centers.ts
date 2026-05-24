import type { EntityManager } from '@mikro-orm/postgresql'
import { MesRoutingTemplate, MesRoutingTemplateStep, MesWorkOrderOperation } from '../data/entities'
import { listDispatchQueue } from './dispatch-queue'

export type MesScope = { tenantId: string; organizationId: string }

export async function listKnownWorkCenterCodes(
  em: EntityManager,
  scope: MesScope,
): Promise<string[]> {
  const codes = new Set<string>()

  const queue = await listDispatchQueue(em, scope, { limit: 200 })
  for (const item of queue) {
    const code = item.operation.workCenterCode?.trim()
    if (code) codes.add(code)
  }

  const opRows = await em.find(
    MesWorkOrderOperation,
    { tenantId: scope.tenantId, organizationId: scope.organizationId },
    { fields: ['workCenterCode'], limit: 500 },
  )
  for (const row of opRows) {
    const code = row.workCenterCode?.trim()
    if (code) codes.add(code)
  }

  const templates = await em.find(MesRoutingTemplate, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })
  for (const template of templates) {
    const stepRows = await em.find(
      MesRoutingTemplateStep,
      { routingTemplateId: template.id },
      { fields: ['workCenterCode'] },
    )
    for (const row of stepRows) {
      const code = row.workCenterCode?.trim()
      if (code) codes.add(code)
    }
  }

  return [...codes].sort((a, b) => a.localeCompare(b))
}
