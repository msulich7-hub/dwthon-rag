import type { ModuleCli } from '@open-mercato/shared/modules/registry'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import type { EntityManager } from '@mikro-orm/postgresql'
import {
  FACTORY_SEED_PRESETS,
  type FactorySeedPreset,
  seedFactoryFixture,
} from './lib/seed-factory-fixture'
import { runIfsSilverExtractPilot } from './lib/ifs/extract-pilot'
import { reconcileIfsSilverPilot } from './lib/ifs/reconcile'
import { executeNettingRun } from './lib/mrp/netting-run'
import { bootstrapGenesisFromSilver } from './lib/mrp/netting-from-silver'
import { buildHindsightOverview } from './lib/hindsight/hindsight-service'

function parseArgs(rest: string[]) {
  const args: Record<string, string | boolean> = {}
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]
    if (!a) continue
    if (a.startsWith('--')) {
      const [k, v] = a.replace(/^--/, '').split('=')
      if (v !== undefined) args[k] = v
      else if (rest[i + 1] && !rest[i + 1]!.startsWith('--')) {
        args[k] = rest[i + 1]!
        i++
      } else args[k] = true
    }
  }
  return args
}

function requireScope(args: Record<string, string | boolean>): {
  orgId: string
  tenantId: string
} | null {
  const orgId = (args.org || args.organizationId) as string | undefined
  const tenantId = (args.tenant || args.tenantId) as string | undefined
  if (!orgId || !tenantId) {
    console.error('Missing --org and --tenant')
    return null
  }
  return { orgId, tenantId }
}

function isFactoryPreset(value: string): value is FactorySeedPreset {
  return value in FACTORY_SEED_PRESETS
}

const seedFactory: ModuleCli = {
  command: 'seed-factory',
  async run(rest) {
    const args = parseArgs(rest)
    const scope = requireScope(args)
    if (!scope) {
      console.error(
        'Usage: mercato production_planning seed-factory --org <uuid> --tenant <uuid> [--preset=small|medium|benchmark] [--force]',
      )
      return
    }

    const presetArg = (args.preset as string | undefined) ?? 'small'
    const force = args.force === true || args.force === 'true'

    if (!isFactoryPreset(presetArg)) {
      console.error(`Invalid --preset=${presetArg}. Use small, medium, or benchmark.`)
      return
    }

    const container = await createRequestContainer()
    const em = container.resolve('em') as EntityManager

    const result = await seedFactoryFixture(
      em,
      { tenantId: scope.tenantId, organizationId: scope.orgId },
      {
        preset: presetArg,
        force,
        logger: (message) => console.log(message),
      },
    )

    console.log(JSON.stringify({ ok: result.created, ...result }, null, 2))
  },
}

const runPipeline: ModuleCli = {
  command: 'run-pipeline',
  async run(rest) {
    const args = parseArgs(rest)
    const scope = requireScope(args)
    if (!scope) {
      console.error(
        'Usage: mercato production_planning run-pipeline --org <uuid> --tenant <uuid> [--preset=benchmark] [--skip-seed]',
      )
      return
    }

    const preset = ((args.preset as string) || 'benchmark') as FactorySeedPreset
    const skipSeed = args['skip-seed'] === true || args['skip-seed'] === 'true'
    const container = await createRequestContainer()
    const em = container.resolve('em') as EntityManager
    const orgScope = { tenantId: scope.tenantId, organizationId: scope.orgId }

    if (!skipSeed && isFactoryPreset(preset)) {
      await seedFactoryFixture(em, orgScope, { preset, force: true })
    }

    const extract = await runIfsSilverExtractPilot(em, orgScope)
    const reconcile = await reconcileIfsSilverPilot(em, orgScope)
    await bootstrapGenesisFromSilver(em, orgScope)
    const netting = await executeNettingRun(em, orgScope, {
      mode: 'full',
      bootstrapFromSilver: false,
    })
    const hindsight = await buildHindsightOverview(em, orgScope, { limit: 10 })

    console.log(
      JSON.stringify(
        {
          extract: extract.counts,
          reconcile: { withinTolerance: reconcile.withinTolerance, checks: reconcile.checks },
          netting,
          hindsight: {
            scenarios: hindsight.scenarios.length,
            totalChaosPremiumPln: hindsight.totalChaosPremiumPln,
          },
        },
        null,
        2,
      ),
    )
  },
}

const runNetting: ModuleCli = {
  command: 'run-netting',
  async run(rest) {
    const args = parseArgs(rest)
    const scope = requireScope(args)
    if (!scope) return
    const mode = (args.mode as string) === 'incremental' ? 'incremental' : 'full'
    const container = await createRequestContainer()
    const em = container.resolve('em') as EntityManager
    const result = await executeNettingRun(
      em,
      { tenantId: scope.tenantId, organizationId: scope.orgId },
      { mode, bootstrapFromSilver: args['bootstrap-silver'] === true },
    )
    console.log(JSON.stringify(result, null, 2))
  },
}

const runExtract: ModuleCli = {
  command: 'run-extract',
  async run(rest) {
    const args = parseArgs(rest)
    const scope = requireScope(args)
    if (!scope) return
    const container = await createRequestContainer()
    const em = container.resolve('em') as EntityManager
    const orgScope = { tenantId: scope.tenantId, organizationId: scope.orgId }
    const extract = await runIfsSilverExtractPilot(em, orgScope)
    const reconcile = await reconcileIfsSilverPilot(em, orgScope)
    console.log(JSON.stringify({ extract, reconcile }, null, 2))
  },
}

export default [seedFactory, runPipeline, runNetting, runExtract]
