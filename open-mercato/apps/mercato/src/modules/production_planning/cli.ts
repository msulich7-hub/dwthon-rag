import type { ModuleCli } from '@open-mercato/shared/modules/registry'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import type { EntityManager } from '@mikro-orm/postgresql'
import {
  FACTORY_SEED_PRESETS,
  type FactorySeedPreset,
  seedFactoryFixture,
} from './lib/seed-factory-fixture'

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

function isFactoryPreset(value: string): value is FactorySeedPreset {
  return value in FACTORY_SEED_PRESETS
}

const seedFactory: ModuleCli = {
  command: 'seed-factory',
  async run(rest) {
    const args = parseArgs(rest)
    const orgId = (args.org || args.organizationId) as string | undefined
    const tenantId = (args.tenant || args.tenantId) as string | undefined
    const presetArg = (args.preset as string | undefined) ?? 'small'
    const force = args.force === true || args.force === 'true'

    if (!orgId || !tenantId) {
      console.error(
        'Usage: mercato production_planning seed-factory --org <organizationId> --tenant <tenantId> [--preset=small|medium|benchmark] [--force]',
      )
      return
    }

    if (!isFactoryPreset(presetArg)) {
      console.error(`Invalid --preset=${presetArg}. Use small, medium, or benchmark.`)
      return
    }

    const container = await createRequestContainer()
    const em = container.resolve('em') as EntityManager

    const result = await seedFactoryFixture(
      em,
      { tenantId, organizationId: orgId },
      {
        preset: presetArg,
        force,
        logger: (message) => console.log(message),
      },
    )

    if (result.created) {
      console.log(
        JSON.stringify(
          {
            ok: true,
            preset: result.preset,
            orders: result.orderCount,
            operations: result.operationCount,
            workCenters: result.workCenterCount,
            peggedOrders: result.peggedOrderCount,
          },
          null,
          2,
        ),
      )
    } else {
      console.log(JSON.stringify({ ok: false, skipped: true, preset: result.preset }, null, 2))
    }
  },
}

export default [seedFactory]
