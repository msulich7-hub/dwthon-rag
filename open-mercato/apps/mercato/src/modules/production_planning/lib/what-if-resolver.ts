import type { CpsatObjective } from './ortools-bridge'
import {
  getBaselineTemplateId,
  getWhatIfTemplate,
  resolveObjectiveProfile,
  type ObjectiveProfileKey,
  type WhatIfTemplate,
} from './what-if-registry'

export type ResolvedScenarioOptimizeParams = {
  horizonHours: number
  objective: CpsatObjective
  objectiveWeights: {
    tardinessWeight: number
    changeoverWeight: number
    wipWeight: number
  } | null
  dryRun: boolean
  applySync: boolean
  proposeOnly: boolean
  templateId: string
  overrides: Record<string, unknown>
  notes: string[]
}

function readObjectiveProfileKey(
  overrides: Record<string, unknown> | undefined,
): ObjectiveProfileKey | undefined {
  const key = overrides?.objectiveProfile
  return typeof key === 'string' ? (key as ObjectiveProfileKey) : undefined
}

export function resolveTemplateOptimizeParams(
  templateId: string,
  options?: {
    extraOverrides?: Record<string, unknown>
    dryRun?: boolean
    applySync?: boolean
    proposeOnly?: boolean
    horizonHours?: number
  },
): ResolvedScenarioOptimizeParams {
  const template = getWhatIfTemplate(templateId)
  if (!template) {
    throw new Error(`UNKNOWN_SCENARIO_TEMPLATE:${templateId}`)
  }
  return resolveTemplateOptimizeParamsFromTemplate(template, options)
}

export function resolveTemplateOptimizeParamsFromTemplate(
  template: WhatIfTemplate,
  options?: {
    extraOverrides?: Record<string, unknown>
    dryRun?: boolean
    applySync?: boolean
    proposeOnly?: boolean
    horizonHours?: number
  },
): ResolvedScenarioOptimizeParams {
  const mergedOverrides = {
    ...(template.overrides ?? {}),
    ...(options?.extraOverrides ?? {}),
  }
  const notes: string[] = []
  const profileKey = readObjectiveProfileKey(mergedOverrides)
  const profile = resolveObjectiveProfile(profileKey) ?? resolveObjectiveProfile('balanced')!

  let horizonHours = options?.horizonHours ?? 168
  if (typeof mergedOverrides.horizonHours === 'number') {
    horizonHours = mergedOverrides.horizonHours as number
  }

  const proposeOnly = options?.proposeOnly ?? true
  const dryRun = options?.dryRun ?? proposeOnly
  const applySync = options?.applySync ?? false

  if (mergedOverrides.demand || mergedOverrides.supply || mergedOverrides.capacity) {
    notes.push(
      'Demand/supply/capacity overrides are catalog metadata until IFS/MRP bridge is wired; solve uses current DB orders.',
    )
  }
  if (mergedOverrides.assemblyLinks || mergedOverrides.changeoverGroups || mergedOverrides.routing) {
    notes.push('Advanced constraint overrides will apply when assemblyLinks/changeoverGroups ship in payload builder.')
  }

  return {
    horizonHours,
    objective: profile.objective,
    objectiveWeights: {
      tardinessWeight: profile.tardinessWeight,
      changeoverWeight: profile.changeoverWeight,
      wipWeight: profile.wipWeight,
    },
    dryRun,
    applySync: applySync && !dryRun && !proposeOnly,
    proposeOnly,
    templateId: template.id,
    overrides: mergedOverrides,
    notes,
  }
}

export function defaultScenarioLabel(templateId: string, suffix?: string): string {
  const template = getWhatIfTemplate(templateId)
  const base = template?.namePl ?? templateId
  return suffix ? `${base} (${suffix})` : base
}

export function resolveBaselineTemplateId(): string {
  return getBaselineTemplateId()
}
