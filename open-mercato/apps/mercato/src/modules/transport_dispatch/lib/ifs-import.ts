import { randomUUID } from 'node:crypto'
import type { EntityManager } from '@mikro-orm/postgresql'
import { TransportLoadUnitLine, TransportSourceConsignment } from '../data/entities'
import { parseIfsLoadText } from './parse-ifs-load-text'

export type IfsConsignmentRow = {
  ifsRef: string
  recipientName?: string
  addressLine?: string
  complement?: string | null
  packagesText?: string | null
  palletsText?: string | null
  defaultExpeditor?: string
}

function normalizeComplement(raw?: string | null): string | null {
  if (!raw) return null
  const v = raw.trim().toLowerCase()
  if (v === 'tak' || v === 'yes' || v === 'y') return 'yes'
  if (v === 'nie' || v === 'no' || v === 'n') return 'no'
  return raw.trim()
}

function detectLoadMix(
  packageLines: Array<{ kind: string }>,
  palletLines: Array<{ kind: string }>,
): 'unknown' | 'packages_only' | 'pallets_only' | 'mixed' {
  const hasPkg = packageLines.length > 0
  const hasPlt = palletLines.length > 0
  if (hasPkg && hasPlt) return 'mixed'
  if (hasPkg) return 'packages_only'
  if (hasPlt) return 'pallets_only'
  return 'unknown'
}

export async function importIfsRows(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
  rows: IfsConsignmentRow[],
): Promise<{ imported: number; skipped: number }> {
  let imported = 0
  let skipped = 0

  for (const row of rows) {
    const existing = await em.findOne(TransportSourceConsignment, {
      tenantId: scope.tenantId,
      ifsRef: row.ifsRef,
    })
    if (existing) {
      skipped += 1
      continue
    }

    const packageLines = parseIfsLoadText(row.packagesText, 'package')
    const palletLines = parseIfsLoadText(row.palletsText, 'pallet')
    const loadMix = detectLoadMix(packageLines, palletLines)
    const complementStatus = normalizeComplement(row.complement)

    const needsFormatA =
      loadMix === 'unknown' || (packageLines.length === 0 && palletLines.length === 0)
    const needsFormatB = loadMix === 'mixed'

    const record = em.create(TransportSourceConsignment, {
      id: randomUUID(),
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      ifsRef: row.ifsRef,
      recipientName: row.recipientName ?? null,
      addressLine: row.addressLine ?? null,
      complementRaw: row.complement ?? null,
      complementStatus,
      defaultExpeditor: row.defaultExpeditor ?? 'DEFAULT',
      ifsPackagesText: row.packagesText ?? null,
      ifsPalletsText: row.palletsText ?? null,
      loadMix,
      status: needsFormatB ? 'pending_b' : needsFormatA ? 'pending_a' : 'pending_b',
    })
    em.persist(record)

    for (const line of [...packageLines, ...palletLines]) {
      em.persist(
        em.create(TransportLoadUnitLine, {
          tenantId: scope.tenantId,
          organizationId: scope.organizationId,
          consignmentId: record.id,
          kind: line.kind,
          typeCode: line.typeCode,
          quantity: line.quantity,
          source: 'ifs',
        }),
      )
    }

    imported += 1
  }

  await em.flush()
  return { imported, skipped }
}
