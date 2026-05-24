import type { EntityManager } from '@mikro-orm/postgresql'
import {
  MesGenealogyEdge,
  type MesGenealogyNodeType,
  type MesGenealogyRelation,
} from '../data/entities'

export type MesScope = { tenantId: string; organizationId: string }

export async function createGenealogyEdge(
  em: EntityManager,
  scope: MesScope,
  input: {
    relation: MesGenealogyRelation
    parentType: MesGenealogyNodeType
    parentId: string
    childType: MesGenealogyNodeType
    childId: string
    workOrderId?: string | null
    quantity?: number | null
  },
): Promise<MesGenealogyEdge> {
  const edge = em.create(MesGenealogyEdge, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    relation: input.relation,
    parentType: input.parentType,
    parentId: input.parentId,
    childType: input.childType,
    childId: input.childId,
    workOrderId: input.workOrderId ?? null,
    quantity: input.quantity ?? null,
  })
  await em.persist(edge)
  return edge
}
