import type { EntityManager } from '@mikro-orm/postgresql'
import {
  MesChecklistRun,
  MesChecklistRunAnswer,
  MesChecklistTemplate,
  MesChecklistTemplateItem,
  MesWorkOrder,
} from '../data/entities'
import type { CompleteChecklistRunBody, StartChecklistRunBody } from '../data/validators'
import { emitMesEvent } from '../events'

export type MesScope = { tenantId: string; organizationId: string }

export type ChecklistRunDto = {
  id: string
  templateId: string
  workOrderId: string
  workOrderOperationId: string | null
  status: string
  completedAt: string | null
}

export async function startChecklistRun(
  em: EntityManager,
  scope: MesScope,
  body: StartChecklistRunBody,
): Promise<ChecklistRunDto> {
  const template = await em.findOne(MesChecklistTemplate, {
    id: body.templateId,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    isActive: true,
  })
  if (!template) throw new Error('CHECKLIST_TEMPLATE_NOT_FOUND')

  const workOrder = await em.findOne(MesWorkOrder, {
    id: body.workOrderId,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })
  if (!workOrder) throw new Error('WORK_ORDER_NOT_FOUND')

  const run = em.create(MesChecklistRun, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    templateId: template.id,
    workOrderId: workOrder.id,
    workOrderOperationId: body.workOrderOperationId ?? null,
    status: 'in_progress',
  })
  await em.persistAndFlush(run)

  await emitMesEvent('mes.checklist.run_started', {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    runId: run.id,
    workOrderId: workOrder.id,
  })

  return {
    id: run.id,
    templateId: run.templateId,
    workOrderId: run.workOrderId,
    workOrderOperationId: run.workOrderOperationId ?? null,
    status: run.status,
    completedAt: null,
  }
}

export async function completeChecklistRun(
  em: EntityManager,
  scope: MesScope,
  runId: string,
  body: CompleteChecklistRunBody,
): Promise<ChecklistRunDto> {
  const run = await em.findOne(MesChecklistRun, {
    id: runId,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })
  if (!run) throw new Error('CHECKLIST_RUN_NOT_FOUND')
  if (run.status !== 'in_progress') throw new Error('CHECKLIST_RUN_NOT_IN_PROGRESS')

  const templateItems = await em.find(MesChecklistTemplateItem, { templateId: run.templateId })
  const itemIds = new Set(templateItems.map((item) => item.id))

  let allPassed = true
  for (const answer of body.answers) {
    if (!itemIds.has(answer.templateItemId)) throw new Error('INVALID_CHECKLIST_ITEM')
    const passed = answer.passed ?? true
    if (!passed) allPassed = false

    const row = em.create(MesChecklistRunAnswer, {
      runId: run.id,
      templateItemId: answer.templateItemId,
      value: answer.value?.trim() ?? null,
      passed,
    })
    await em.persist(row)
  }

  run.status = allPassed ? 'passed' : 'failed'
  run.completedAt = new Date()
  await em.flush()

  await emitMesEvent('mes.checklist.run_completed', {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    runId: run.id,
    status: run.status,
    workOrderId: run.workOrderId,
  })

  return {
    id: run.id,
    templateId: run.templateId,
    workOrderId: run.workOrderId,
    workOrderOperationId: run.workOrderOperationId ?? null,
    status: run.status,
    completedAt: run.completedAt?.toISOString() ?? null,
  }
}

export async function countFailedChecklistRunsToday(
  em: EntityManager,
  scope: MesScope,
): Promise<{ failed: number; total: number }> {
  const start = new Date()
  start.setHours(0, 0, 0, 0)

  const runs = await em.find(MesChecklistRun, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    completedAt: { $gte: start },
    status: { $in: ['passed', 'failed'] },
  })

  const failed = runs.filter((r) => r.status === 'failed').length
  return { failed, total: runs.length }
}
