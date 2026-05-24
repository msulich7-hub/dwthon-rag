import type { EntityManager } from '@mikro-orm/postgresql'
import {
  MesRoutingTemplate,
  MesRoutingTemplateStep,
} from '../data/entities'
import type { CreateRoutingTemplateBody } from '../data/validators'
import { emitMesEvent } from '../events'

export type MesScope = { tenantId: string; organizationId: string }

export type RoutingTemplateStepDto = {
  id: string
  sequence: number
  operationCode: string
  operationName: string
  workCenterCode: string | null
  setupMinutes: number | null
  runMinutesPerUnit: number | null
}

export type RoutingTemplateDto = {
  id: string
  code: string
  name: string
  productCode: string
  version: number
  isActive: boolean
  notes: string | null
  steps: RoutingTemplateStepDto[]
}

function toStepDto(step: MesRoutingTemplateStep): RoutingTemplateStepDto {
  return {
    id: step.id,
    sequence: step.sequence,
    operationCode: step.operationCode,
    operationName: step.operationName,
    workCenterCode: step.workCenterCode ?? null,
    setupMinutes: step.setupMinutes ?? null,
    runMinutesPerUnit: step.runMinutesPerUnit ?? null,
  }
}

export async function listRoutingTemplates(
  em: EntityManager,
  scope: MesScope,
  filters: { productCode?: string; isActive?: boolean },
): Promise<RoutingTemplateDto[]> {
  const where: Record<string, unknown> = {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  }
  if (filters.productCode) where.productCode = filters.productCode
  if (filters.isActive !== undefined) where.isActive = filters.isActive

  const templates = await em.find(MesRoutingTemplate, where, { orderBy: { code: 'ASC' } })
  const result: RoutingTemplateDto[] = []

  for (const template of templates) {
    const steps = await em.find(
      MesRoutingTemplateStep,
      { routingTemplateId: template.id },
      { orderBy: { sequence: 'ASC' } },
    )
    result.push({
      id: template.id,
      code: template.code,
      name: template.name,
      productCode: template.productCode,
      version: template.version,
      isActive: template.isActive,
      notes: template.notes ?? null,
      steps: steps.map(toStepDto),
    })
  }

  return result
}

export async function getRoutingTemplate(
  em: EntityManager,
  scope: MesScope,
  templateId: string,
): Promise<RoutingTemplateDto | null> {
  const template = await em.findOne(MesRoutingTemplate, {
    id: templateId,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })
  if (!template) return null

  const steps = await em.find(
    MesRoutingTemplateStep,
    { routingTemplateId: template.id },
    { orderBy: { sequence: 'ASC' } },
  )

  return {
    id: template.id,
    code: template.code,
    name: template.name,
    productCode: template.productCode,
    version: template.version,
    isActive: template.isActive,
    notes: template.notes ?? null,
    steps: steps.map(toStepDto),
  }
}

export async function createRoutingTemplate(
  em: EntityManager,
  scope: MesScope,
  body: CreateRoutingTemplateBody,
): Promise<RoutingTemplateDto> {
  const existing = await em.findOne(MesRoutingTemplate, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    code: body.code.trim(),
  })
  if (existing) {
    throw new Error('ROUTING_CODE_EXISTS')
  }

  const template = em.create(MesRoutingTemplate, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    code: body.code.trim(),
    name: body.name.trim(),
    productCode: body.productCode.trim(),
    notes: body.notes?.trim() ?? null,
    isActive: true,
  })
  await em.persist(template)

  if (body.steps?.length) {
    for (const step of body.steps) {
      em.create(MesRoutingTemplateStep, {
        routingTemplateId: template.id,
        sequence: step.sequence,
        operationCode: step.operationCode,
        operationName: step.operationName,
        workCenterCode: step.workCenterCode ?? null,
        setupMinutes: step.setupMinutes ?? null,
        runMinutesPerUnit: step.runMinutesPerUnit ?? null,
      })
    }
  }

  await em.flush()

  await emitMesEvent('mes.routing_template.created', {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    routingTemplateId: template.id,
    code: template.code,
    productCode: template.productCode,
  })

  const dto = await getRoutingTemplate(em, scope, template.id)
  if (!dto) throw new Error('ROUTING_TEMPLATE_NOT_FOUND')
  return dto
}

export async function replaceRoutingTemplateSteps(
  em: EntityManager,
  scope: MesScope,
  templateId: string,
  steps: CreateRoutingTemplateBody['steps'],
): Promise<RoutingTemplateDto> {
  const template = await em.findOne(MesRoutingTemplate, {
    id: templateId,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })
  if (!template) throw new Error('ROUTING_TEMPLATE_NOT_FOUND')
  if (!steps?.length) throw new Error('STEPS_REQUIRED')

  await em.nativeDelete(MesRoutingTemplateStep, { routingTemplateId: templateId })

  for (const step of steps) {
    em.create(MesRoutingTemplateStep, {
      routingTemplateId: templateId,
      sequence: step.sequence,
      operationCode: step.operationCode,
      operationName: step.operationName,
      workCenterCode: step.workCenterCode ?? null,
      setupMinutes: step.setupMinutes ?? null,
      runMinutesPerUnit: step.runMinutesPerUnit ?? null,
    })
  }

  template.updatedAt = new Date()
  await em.flush()

  await emitMesEvent('mes.routing_template.updated', {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    routingTemplateId: template.id,
  })

  const dto = await getRoutingTemplate(em, scope, templateId)
  if (!dto) throw new Error('ROUTING_TEMPLATE_NOT_FOUND')
  return dto
}

export async function findActiveTemplateForProduct(
  em: EntityManager,
  scope: MesScope,
  productCode: string,
  routingTemplateId?: string,
): Promise<MesRoutingTemplate | null> {
  if (routingTemplateId) {
    return em.findOne(MesRoutingTemplate, {
      id: routingTemplateId,
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      isActive: true,
    })
  }

  return em.findOne(
    MesRoutingTemplate,
    {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      productCode: productCode.trim(),
      isActive: true,
    },
    { orderBy: { version: 'DESC' } },
  )
}
