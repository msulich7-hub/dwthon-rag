import type { EntityManager } from '@mikro-orm/postgresql'
import { TransportLoadUnitLine, TransportSourceConsignment } from '../data/entities'

export type QueueCard = {
  id: string
  ifsRef: string
  recipientName: string | null
  addressLine: string | null
  complementStatus: string | null
  loadMix: string
  packageCount: number
  palletCount: number
  isMixed: boolean
}

async function countByKind(em: EntityManager, consignmentId: string) {
  const lines = await em.find(TransportLoadUnitLine, { consignmentId })
  const packageCount = lines
    .filter((l) => l.kind === 'package')
    .reduce((sum, l) => sum + l.quantity, 0)
  const palletCount = lines
    .filter((l) => l.kind === 'pallet')
    .reduce((sum, l) => sum + l.quantity, 0)
  return { packageCount, palletCount }
}

export async function listFormatAQueue(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
): Promise<QueueCard[]> {
  const rows = await em.find(
    TransportSourceConsignment,
    {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      status: 'pending_a',
    },
    { orderBy: { createdAt: 'ASC' }, limit: 100 },
  )

  const cards: QueueCard[] = []
  for (const row of rows) {
    const counts = await countByKind(em, row.id)
    cards.push({
      id: row.id,
      ifsRef: row.ifsRef,
      recipientName: row.recipientName ?? null,
      addressLine: row.addressLine ?? null,
      complementStatus: row.complementStatus,
      loadMix: row.loadMix,
      ...counts,
      isMixed: false,
    })
  }
  return cards
}

export async function listFormatBQueue(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
): Promise<{ stats: { total: number; mixed: number }; cards: QueueCard[] }> {
  const rows = await em.find(
    TransportSourceConsignment,
    {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      status: 'pending_b',
    },
    { orderBy: { createdAt: 'ASC' }, limit: 100 },
  )

  const cards: QueueCard[] = []
  let mixed = 0

  for (const row of rows) {
    const counts = await countByKind(em, row.id)
    const isMixed = row.loadMix === 'mixed' || (counts.packageCount > 0 && counts.palletCount > 0)
    if (isMixed) mixed += 1
    cards.push({
      id: row.id,
      ifsRef: row.ifsRef,
      recipientName: row.recipientName ?? null,
      addressLine: row.addressLine ?? null,
      complementStatus: row.complementStatus,
      loadMix: row.loadMix,
      ...counts,
      isMixed,
    })
  }

  return { stats: { total: cards.length, mixed }, cards }
}

export async function loadConsignmentDetail(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
  id: string,
) {
  const consignment = await em.findOne(TransportSourceConsignment, {
    id,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })
  if (!consignment) return null

  const lines = await em.find(TransportLoadUnitLine, { consignmentId: id })
  return { consignment, lines }
}
