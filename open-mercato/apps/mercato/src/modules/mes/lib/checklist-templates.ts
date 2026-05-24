import type { EntityManager } from '@mikro-orm/postgresql'
import { MesChecklistTemplate, MesChecklistTemplateItem } from '../data/entities'
import type { CreateChecklistTemplateBody } from '../data/validators'
import { emitMesEvent } from '../events'

export type MesScope = { tenantId: string; organizationId: string }

export type ChecklistTemplateItemDto = {
  id: string
  sequence: number
  label: string
  requiresValue: boolean
}

export type ChecklistTemplateDto = {
  id: string
  code: string
  name: string
  productCode: string | null
  isActive: boolean
  items: ChecklistTemplateItemDto[]
}

export async function listChecklistTemplates(
  em: EntityManager,
  scope: MesScope,
  filters: { productCode?: string; activeOnly?: boolean },
): Promise<ChecklistTemplateDto[]> {
  const where: Record<string, unknown> = {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  }
  if (filters.activeOnly !== false) where.isActive = true

  const templates = await em.find(MesChecklistTemplate, where, { orderBy: { code: 'ASC' } })
  const result: ChecklistTemplateDto[] = []

  for (const template of templates) {
    if (filters.productCode && template.productCode && template.productCode !== filters.productCode) {
      continue
    }
    result.push(await toTemplateDto(em, template))
  }
  return result
}

async function toTemplateDto(
  em: EntityManager,
  template: MesChecklistTemplate,
): Promise<ChecklistTemplateDto> {
  const items = await em.find(
    MesChecklistTemplateItem,
    { templateId: template.id },
    { orderBy: { sequence: 'ASC' } },
  )
  return {
    id: template.id,
    code: template.code,
    name: template.name,
    productCode: template.productCode ?? null,
    isActive: template.isActive,
    items: items.map((item) => ({
      id: item.id,
      sequence: item.sequence,
      label: item.label,
      requiresValue: item.requiresValue,
    })),
  }
}

export async function createChecklistTemplate(
  em: EntityManager,
  scope: MesScope,
  body: CreateChecklistTemplateBody,
): Promise<ChecklistTemplateDto> {
  const existing = await em.findOne(MesChecklistTemplate, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    code: body.code.trim(),
  })
  if (existing) throw new Error('CHECKLIST_CODE_EXISTS')

  const template = em.create(MesChecklistTemplate, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    code: body.code.trim(),
    name: body.name.trim(),
    productCode: body.productCode?.trim() ?? null,
    isActive: true,
  })
  await em.persist(template)

  for (const item of body.items) {
    const row = em.create(MesChecklistTemplateItem, {
      templateId: template.id,
      sequence: item.sequence,
      label: item.label.trim(),
      requiresValue: item.requiresValue ?? false,
    })
    await em.persist(row)
  }

  await em.flush()

  await emitMesEvent('mes.checklist.template_created', {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    templateId: template.id,
    code: template.code,
  })

  return toTemplateDto(em, template)
}
