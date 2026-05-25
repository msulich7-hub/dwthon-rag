import type { EntityManager } from '@mikro-orm/postgresql'
import {
  TransportDispatchOrder,
  TransportLoadUnitLine,
  TransportManifest,
  TransportSourceConsignment,
} from '../data/entities'
import type { FormatACompleteInput, FormatBCompleteInput } from '../data/validators'
import {
  DEFAULT_PACKAGE_EXPEDITION,
  DEFAULT_PALLET_EXPEDITION,
} from './catalog'
import { buildListGroups, resolveListGenerator } from './list-generator'
import { emitTransportDispatchEvent } from '../events'

export type CompleteResult = {
  consignmentId: string
  manifests: Array<{
    id: string
    listNumber: number
    expeditionCode: string
    payload: unknown
  }>
}

async function persistLines(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
  consignmentId: string,
  lines: Array<{ kind: 'package' | 'pallet'; typeCode: string; quantity: number }>,
  source: string,
) {
  await em.nativeDelete(TransportLoadUnitLine, {
    consignmentId,
    source: 'operator',
  })

  for (const line of lines.filter((l) => l.quantity > 0)) {
    em.persist(
      em.create(TransportLoadUnitLine, {
        tenantId: scope.tenantId,
        organizationId: scope.organizationId,
        consignmentId,
        kind: line.kind,
        typeCode: line.typeCode,
        quantity: line.quantity,
        source,
      }),
    )
  }
}

async function generateAndStore(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
  consignment: TransportSourceConsignment,
  format: 'FORMAT_A' | 'FORMAT_B',
  groups: Array<{
    expeditionCode: string
    lines: Array<{ kind: 'package' | 'pallet'; typeCode: string; quantity: number }>
  }>,
): Promise<CompleteResult['manifests']> {
  const generator = resolveListGenerator()
  const payloads = await generator.generate({
    ifsRef: consignment.ifsRef,
    recipientName: consignment.recipientName ?? null,
    addressLine: consignment.addressLine ?? null,
    format,
    groups,
  })

  const manifests: CompleteResult['manifests'] = []

  for (let i = 0; i < payloads.length; i += 1) {
    const payload = payloads[i]
    const dispatch = em.create(TransportDispatchOrder, {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      consignmentId: consignment.id,
      expeditionCode: payload.expeditionCode,
      originFormat: format,
      linesJson: JSON.stringify(payload.lines),
    })
    em.persist(dispatch)

    const manifest = em.create(TransportManifest, {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      consignmentId: consignment.id,
      dispatchOrderId: dispatch.id,
      listNumber: payload.listNumber,
      format,
      expeditionCode: payload.expeditionCode,
      payloadJson: JSON.stringify(payload),
      externalRef: `${consignment.ifsRef}-L${payload.listNumber}`,
    })
    em.persist(manifest)

    manifests.push({
      id: manifest.id,
      listNumber: payload.listNumber,
      expeditionCode: payload.expeditionCode,
      payload,
    })

    await emitTransportDispatchEvent(
      'transport_dispatch.manifest.generated',
      {
        tenantId: scope.tenantId,
        organizationId: scope.organizationId,
        manifestId: manifest.id,
        consignmentId: consignment.id,
        listNumber: payload.listNumber,
      },
      { persistent: true },
    )
  }

  return manifests
}

export async function completeFormatA(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
  consignmentId: string,
  input: FormatACompleteInput,
): Promise<CompleteResult> {
  const consignment = await em.findOne(TransportSourceConsignment, {
    id: consignmentId,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })
  if (!consignment) throw new Error('CONSIGNMENT_NOT_FOUND')

  if (input.complementStatus) {
    consignment.complementStatus = input.complementStatus
  }

  await persistLines(em, scope, consignmentId, input.lines, 'operator')

  const active = input.lines.filter((l) => l.quantity > 0)
  if (active.length === 0) throw new Error('NO_LOAD_UNITS')

  const groups = buildListGroups(active, {
    packageExpedition: consignment.defaultExpeditor ?? DEFAULT_PACKAGE_EXPEDITION,
    palletExpedition: DEFAULT_PALLET_EXPEDITION,
    singleList: !input.splitLists,
  })

  const manifests = await generateAndStore(em, scope, consignment, 'FORMAT_A', groups)

  consignment.status = 'completed'
  consignment.processingFormat = 'format_a'
  consignment.processedAt = new Date()
  await em.flush()

  await emitTransportDispatchEvent(
    'transport_dispatch.format_a.completed',
    { tenantId: scope.tenantId, organizationId: scope.organizationId, consignmentId },
    { persistent: true },
  )

  return { consignmentId, manifests }
}

export async function completeFormatB(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
  consignmentId: string,
  input: FormatBCompleteInput,
): Promise<CompleteResult> {
  const consignment = await em.findOne(TransportSourceConsignment, {
    id: consignmentId,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })
  if (!consignment) throw new Error('CONSIGNMENT_NOT_FOUND')

  const allLines = [...input.packageLines, ...input.palletLines].filter((l) => l.quantity > 0)
  await persistLines(em, scope, consignmentId, allLines, 'operator')

  const groups = buildListGroups(allLines, {
    packageExpedition: input.packageExpedition,
    palletExpedition: input.palletExpedition,
    singleList: false,
  })

  const manifests = await generateAndStore(em, scope, consignment, 'FORMAT_B', groups)

  consignment.status = 'completed'
  consignment.processingFormat = 'format_b'
  consignment.processedAt = new Date()
  await em.flush()

  await emitTransportDispatchEvent(
    'transport_dispatch.format_b.completed',
    { tenantId: scope.tenantId, organizationId: scope.organizationId, consignmentId },
    { persistent: true },
  )

  return { consignmentId, manifests }
}
