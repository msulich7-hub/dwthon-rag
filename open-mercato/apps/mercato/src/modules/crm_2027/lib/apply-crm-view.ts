import type { EntityManager } from '@mikro-orm/postgresql'
import type { CacheStrategy } from '@open-mercato/cache'
import {
  loadPerspectivesState,
  saveUserPerspective,
  type PerspectiveScope,
  type ResolvedPerspective,
  type ResolvedRolePerspective,
} from '@open-mercato/core/modules/perspectives/services/perspectiveService'
import type { PerspectiveSettings } from '@open-mercato/shared/modules/perspectives/types'
import {
  getCrmPerspectiveTableId,
  getCustomersListPerspectiveTableId,
  mirrorPerspectiveName,
  type CrmPerspectiveEntity,
} from './perspective-bridge'

function findSourcePerspective(
  state: Awaited<ReturnType<typeof loadPerspectivesState>>,
  perspectiveId: string,
): ResolvedPerspective | ResolvedRolePerspective | null {
  const personal = state.personal.find((p) => p.id === perspectiveId)
  if (personal) return personal
  return state.rolePerspectives.find((p) => p.id === perspectiveId) ?? null
}

export type ApplyCrmViewResult = {
  entity: CrmPerspectiveEntity
  sourceTableId: string
  sourcePerspectiveId: string
  targetTableId: string
  targetPerspectiveId: string
  targetPerspectiveName: string
  settings: PerspectiveSettings
}

/**
 * Copies a CRM 2027 saved view onto the matching customers list table perspective
 * for the current user (no core package edits).
 */
export async function applyCrmViewToCustomersList(
  em: EntityManager,
  cache: CacheStrategy | null | undefined,
  options: {
    scope: PerspectiveScope
    entity: CrmPerspectiveEntity
    perspectiveId: string
    roleIds: string[]
  },
): Promise<ApplyCrmViewResult> {
  const { scope, entity, perspectiveId, roleIds } = options
  const sourceTableId = getCrmPerspectiveTableId(entity)
  const targetTableId = getCustomersListPerspectiveTableId(entity)

  const sourceState = await loadPerspectivesState(em, cache, {
    scope,
    tableId: sourceTableId,
    roleIds,
  })

  const source = findSourcePerspective(sourceState, perspectiveId)
  if (!source) {
    throw Object.assign(new Error('CRM view not found'), { code: 'NOT_FOUND' })
  }

  const targetName = mirrorPerspectiveName(source.name)
  const targetState = await loadPerspectivesState(em, cache, {
    scope,
    tableId: targetTableId,
    roleIds,
  })

  const existingMirror = targetState.personal.find((p) => p.name === targetName)

  const saved = await saveUserPerspective(em, cache, {
    scope,
    tableId: targetTableId,
    input: {
      perspectiveId: existingMirror?.id,
      name: targetName,
      settings: source.settings,
      isDefault: false,
    },
  })

  return {
    entity,
    sourceTableId,
    sourcePerspectiveId: source.id,
    targetTableId,
    targetPerspectiveId: saved.id,
    targetPerspectiveName: saved.name,
    settings: saved.settings,
  }
}
