import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export type WhatIfTier = 'S' | 'M' | 'L' | 'XL'
export type WhatIfAudience = 'planner' | 'sop' | 'exec' | 'analytics'
export type WhatIfDimension =
  | 'demand_shock'
  | 'supply_disruption'
  | 'capacity'
  | 'routing'
  | 'priority'
  | 'cost'
  | 'horizon'

export type ObjectiveProfileKey =
  | 'otif_first'
  | 'balanced'
  | 'campaign'
  | 'flow_first'
  | 'cost_min'

export type WhatIfTemplate = {
  id: string
  namePl: string
  nameEn: string
  dimensions: WhatIfDimension[]
  tier: WhatIfTier
  audience: WhatIfAudience
  overrides?: Record<string, unknown>
  expectedKpis?: string[]
  isBaseline?: boolean
}

export type WhatIfBundleMode = 'cascade' | 'parallel' | 'tournament' | 'single'

export type WhatIfBundle = {
  id: string
  namePl: string
  mode: WhatIfBundleMode
  maxDepth?: number
  steps: string[]
  baseTemplate?: string
  variants?: Array<{ label: string } & Record<string, unknown>>
  postSteps?: string[]
  note?: string
  requiresModule?: string
}

export type WhatIfRegistry = {
  version: string
  updated: string
  defaults: {
    proposeOnly: boolean
    parentScenarioId: string | null
    horizonHours: number
    tier: WhatIfTier
    dryRun: boolean
  }
  objectiveProfiles: Record<
    ObjectiveProfileKey,
    {
      tardinessWeight: number
      changeoverWeight: number
      wipWeight: number
      objective: 'minimize_lateness' | 'minimize_changeover' | 'balance_load'
    }
  >
  templates: WhatIfTemplate[]
  bundles: WhatIfBundle[]
}

let cachedRegistry: WhatIfRegistry | null = null

export function loadWhatIfRegistry(): WhatIfRegistry {
  if (cachedRegistry) return cachedRegistry
  const path = join(__dirname, '../data/what-if-scenarios.registry.json')
  cachedRegistry = JSON.parse(readFileSync(path, 'utf8')) as WhatIfRegistry
  return cachedRegistry
}

export function listWhatIfTemplates(filters?: {
  dimension?: WhatIfDimension
  tier?: WhatIfTier
  audience?: WhatIfAudience
}): WhatIfTemplate[] {
  const registry = loadWhatIfRegistry()
  return registry.templates.filter((t) => {
    if (filters?.dimension && !t.dimensions.includes(filters.dimension)) return false
    if (filters?.tier && t.tier !== filters.tier) return false
    if (filters?.audience && t.audience !== filters.audience) return false
    return true
  })
}

export function getWhatIfTemplate(templateId: string): WhatIfTemplate | undefined {
  return loadWhatIfRegistry().templates.find((t) => t.id === templateId)
}

export function getWhatIfBundle(bundleId: string): WhatIfBundle | undefined {
  return loadWhatIfRegistry().bundles.find((b) => b.id === bundleId)
}

export function listWhatIfBundles(): WhatIfBundle[] {
  return loadWhatIfRegistry().bundles
}

export function getBaselineTemplateId(): string {
  const baseline = loadWhatIfRegistry().templates.find((t) => t.isBaseline)
  return baseline?.id ?? 'WIF-01'
}

export function resolveObjectiveProfile(
  profileKey: ObjectiveProfileKey | string | undefined,
): WhatIfRegistry['objectiveProfiles'][ObjectiveProfileKey] | undefined {
  if (!profileKey) return undefined
  const registry = loadWhatIfRegistry()
  return registry.objectiveProfiles[profileKey as ObjectiveProfileKey]
}
