import type { EntityManager } from '@mikro-orm/postgresql'
import { createCpsatJobId } from './build-cpsat-payload'
import { runCpsatOptimizeJob } from './cpsat-optimize-runner'
import {
  completePlanScenario,
  createPlanScenarioDraft,
  failPlanScenario,
  getPlanScenario,
  markPlanScenarioSimulating,
  type PlanScenarioDto,
} from './plan-scenario-service'
import { ProductionPlanningPlanScenario } from '../data/entities'
import { computeScenarioKpis } from './scenario-kpis'
import type { OrgScope } from './production-order'
import { evaluateInteractiveSla } from './cpsat-sla'
import {
  defaultScenarioLabel,
  resolveTemplateOptimizeParams,
  resolveTemplateOptimizeParamsFromTemplate,
} from './what-if-resolver'
import {
  getWhatIfBundle,
  getWhatIfTemplate,
  loadWhatIfRegistry,
  type WhatIfTemplate,
} from './what-if-registry'

export type RunTemplateScenarioInput = {
  templateId: string
  productionOrderIds: string[]
  scenarioLabel?: string
  parentScenarioId?: string | null
  baselineScenarioId?: string | null
  bundleId?: string | null
  extraOverrides?: Record<string, unknown>
  dryRun?: boolean
  applySync?: boolean
  proposeOnly?: boolean
  horizonHours?: number
  requestedByUserId?: string | null
}

export type RunTemplateScenarioResult = {
  scenario: PlanScenarioDto
  optimization: Awaited<ReturnType<typeof runCpsatOptimizeJob>>['optimization']
  chunkCount: number
  wallMs: number
}

export async function runTemplateScenario(
  em: EntityManager,
  scope: OrgScope,
  input: RunTemplateScenarioInput,
): Promise<RunTemplateScenarioResult> {
  const resolved = resolveTemplateOptimizeParams(input.templateId, {
    extraOverrides: input.extraOverrides,
    dryRun: input.dryRun,
    applySync: input.applySync,
    proposeOnly: input.proposeOnly,
    horizonHours: input.horizonHours,
  })

  const draft = await createPlanScenarioDraft(em, scope, {
    scenarioLabel: input.scenarioLabel ?? defaultScenarioLabel(input.templateId),
    templateId: input.templateId,
    bundleId: input.bundleId ?? null,
    parentScenarioId: input.parentScenarioId ?? null,
    baselineScenarioId: input.baselineScenarioId ?? null,
    horizonHours: resolved.horizonHours,
    objective: resolved.objective,
    objectiveWeights: resolved.objectiveWeights,
    overrides: resolved.overrides,
    proposeOnly: resolved.proposeOnly,
    productionOrderIds: input.productionOrderIds,
    requestedByUserId: input.requestedByUserId ?? null,
    notes: resolved.notes,
  })

  const jobId = createCpsatJobId()
  await markPlanScenarioSimulating(em, draft.id, jobId)

  const started = Date.now()
  try {
    const warmStartScenarioId =
      input.parentScenarioId ?? input.baselineScenarioId ?? null

    const result = await runCpsatOptimizeJob(em, scope, {
      jobId,
      productionOrderIds: input.productionOrderIds,
      horizonHours: resolved.horizonHours,
      objective: resolved.objective,
      objectiveWeights: resolved.objectiveWeights,
      warmStartScenarioId,
      applySync: resolved.applySync,
      dryRun: resolved.dryRun || resolved.proposeOnly,
    })

    const wallMs = Date.now() - started
    const schedule = result.schedule ?? []
    const sla = evaluateInteractiveSla(wallMs, schedule.length)
    const kpiSnapshot = {
      ...(await computeScenarioKpis(em, scope, schedule, {
        objectiveValue: result.optimization.objectiveValue ?? null,
        solverStatus: result.optimization.solverStatus ?? null,
      })),
      wallMs,
      interactiveSlaWithin: sla.withinSla,
      interactiveSlaMessage: sla.message,
    }

    if (result.optimization.status !== 'completed' || schedule.length === 0) {
      await failPlanScenario(
        em,
        draft.id,
        result.optimization.message ?? 'Scenario solve did not complete',
      )
    } else {
      await completePlanScenario(em, draft.id, {
        schedule,
        kpiSnapshot,
        solverStatus: result.optimization.solverStatus ?? null,
        objectiveValue: result.optimization.objectiveValue ?? null,
        wallMs,
      })
    }

    const refreshed = (await getPlanScenario(em, scope, draft.id))!

    return {
      scenario: refreshed,
      optimization: result.optimization,
      chunkCount: result.chunkCount,
      wallMs,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Scenario run failed'
    await failPlanScenario(em, draft.id, message)
    throw error
  }
}

export type RunBundleScenarioResult = {
  bundleId: string
  mode: string
  baselineScenarioId: string | null
  scenarios: PlanScenarioDto[]
  tournamentRanking?: string[]
}

export async function runWhatIfBundle(
  em: EntityManager,
  scope: OrgScope,
  input: {
    bundleId: string
    productionOrderIds: string[]
    baselineScenarioId?: string | null
    requestedByUserId?: string | null
  },
): Promise<RunBundleScenarioResult> {
  const bundle = getWhatIfBundle(input.bundleId)
  if (!bundle) throw new Error(`UNKNOWN_SCENARIO_BUNDLE:${input.bundleId}`)

  const registry = loadWhatIfRegistry()
  const scenarios: PlanScenarioDto[] = []
  let parentScenarioId: string | null = input.baselineScenarioId ?? null

  if (bundle.mode === 'tournament') {
    const baseTemplateId = bundle.baseTemplate ?? registry.defaults.parentScenarioId ?? 'WIF-01'
    const baseTemplate = getWhatIfTemplate(baseTemplateId)
    if (!baseTemplate) throw new Error(`UNKNOWN_SCENARIO_TEMPLATE:${baseTemplateId}`)

    const variants = bundle.variants ?? [{ label: 'default' }]
    const results: Array<{ scenarioId: string; lateCount: number; objective: number | null }> =
      []

    for (const variant of variants) {
      const resolved = resolveTemplateOptimizeParamsFromTemplate(baseTemplate, {
        extraOverrides: variant as Record<string, unknown>,
        dryRun: true,
        proposeOnly: true,
      })
      const run = await runTemplateScenario(em, scope, {
        templateId: baseTemplateId,
        productionOrderIds: input.productionOrderIds,
        scenarioLabel: `${baseTemplate.namePl} [${variant.label}]`,
        bundleId: bundle.id,
        baselineScenarioId: input.baselineScenarioId ?? null,
        parentScenarioId,
        extraOverrides: variant as Record<string, unknown>,
        dryRun: true,
        proposeOnly: true,
        horizonHours: resolved.horizonHours,
        requestedByUserId: input.requestedByUserId,
      })
      scenarios.push(run.scenario)
      results.push({
        scenarioId: run.scenario.id,
        lateCount: run.scenario.kpiSnapshot?.lateOrderCount ?? 9999,
        objective: run.scenario.objectiveValue,
      })
    }

    results.sort((a, b) => {
      if (a.lateCount !== b.lateCount) return a.lateCount - b.lateCount
      const ao = a.objective ?? Number.MAX_SAFE_INTEGER
      const bo = b.objective ?? Number.MAX_SAFE_INTEGER
      return ao - bo
    })

    for (let i = 0; i < results.length; i++) {
      const row = await em.findOne(ProductionPlanningPlanScenario, {
        id: results[i]!.scenarioId,
      })
      if (row) {
        row.rankInTournament = i + 1
        await em.flush()
      }
    }

    const rankedScenarios = await Promise.all(
      results.map((r) => getPlanScenario(em, scope, r.scenarioId)),
    )

    return {
      bundleId: bundle.id,
      mode: bundle.mode,
      baselineScenarioId: input.baselineScenarioId ?? null,
      scenarios: rankedScenarios.filter((s): s is PlanScenarioDto => Boolean(s)),
      tournamentRanking: results.map((r) => r.scenarioId),
    }
  }

  const stepIds =
    bundle.mode === 'single'
      ? bundle.steps.slice(0, 1)
      : [...bundle.steps, ...(bundle.postSteps ?? [])]

  if (bundle.mode === 'parallel') {
    const runs = await Promise.all(
      stepIds.map((templateId) =>
        runTemplateScenario(em, scope, {
          templateId,
          productionOrderIds: input.productionOrderIds,
          bundleId: bundle.id,
          baselineScenarioId: input.baselineScenarioId ?? null,
          dryRun: true,
          proposeOnly: true,
          requestedByUserId: input.requestedByUserId,
        }),
      ),
    )
    scenarios.push(...runs.map((r) => r.scenario))
  } else {
    const maxSteps =
      bundle.mode === 'cascade' ? Math.min(stepIds.length, bundle.maxDepth ?? 3) : stepIds.length

    for (let i = 0; i < maxSteps; i++) {
      const templateId = stepIds[i]!
      const run = await runTemplateScenario(em, scope, {
        templateId,
        productionOrderIds: input.productionOrderIds,
        bundleId: bundle.id,
        parentScenarioId: bundle.mode === 'cascade' ? parentScenarioId : null,
        baselineScenarioId: input.baselineScenarioId ?? parentScenarioId,
        dryRun: true,
        proposeOnly: true,
        requestedByUserId: input.requestedByUserId,
      })
      scenarios.push(run.scenario)
      if (bundle.mode === 'cascade') {
        parentScenarioId = run.scenario.id
      }
    }
  }

  return {
    bundleId: bundle.id,
    mode: bundle.mode,
    baselineScenarioId: input.baselineScenarioId ?? null,
    scenarios,
  }
}
