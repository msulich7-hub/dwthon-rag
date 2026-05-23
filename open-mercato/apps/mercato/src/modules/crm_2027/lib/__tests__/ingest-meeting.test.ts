import type { EntityManager } from '@mikro-orm/postgresql'
import type { AwilixContainer } from 'awilix'
import { analyzeSentiment } from '../sentiment'
import {
  buildAtRiskItemFromMeetingAnalysis,
  ingestDealMeeting,
} from '../ingest-deal-meeting'
import { suggestDealProgression } from '../deal-progression'

jest.mock('../deal-context', () => ({
  loadDealContext: jest.fn(),
}))

jest.mock('../persist-risk-flags', () => ({
  persistAtRiskFlags: jest.fn(),
}))

jest.mock('../emit-high-risk-events', () => ({
  emitHighRiskDealEvents: jest.fn(),
}))

import { loadDealContext } from '../deal-context'
import { persistAtRiskFlags } from '../persist-risk-flags'
import { emitHighRiskDealEvents } from '../emit-high-risk-events'

const loadDealContextMock = loadDealContext as jest.MockedFunction<typeof loadDealContext>
const persistAtRiskFlagsMock = persistAtRiskFlags as jest.MockedFunction<typeof persistAtRiskFlags>
const emitHighRiskDealEventsMock = emitHighRiskDealEvents as jest.MockedFunction<typeof emitHighRiskDealEvents>

describe('buildAtRiskItemFromMeetingAnalysis', () => {
  it('flags negative meeting sentiment as high risk', () => {
    const sentiment = analyzeSentiment('Po raz kolejny proszę o odpowiedź! Problem z dostawą.')
    const progression = suggestDealProgression({
      dealId: 'deal-1',
      title: 'Acme',
      status: 'open',
      pipelineStage: 'discovery',
      probability: 40,
      daysSinceLastActivity: 0,
      recentActivitySnippets: [],
      sentiment,
    })

    const item = buildAtRiskItemFromMeetingAnalysis(
      { id: 'deal-1', title: 'Acme' },
      sentiment,
      progression,
    )

    expect(item).not.toBeNull()
    expect(item?.riskLevel).toBe('high')
    expect(item?.reasons.some((r) => r.startsWith('negative_sentiment:'))).toBe(true)
  })
})

describe('ingestDealMeeting', () => {
  const scope = { tenantId: 'tenant-1', organizationId: 'org-1' }

  beforeEach(() => {
    jest.clearAllMocks()
    loadDealContextMock.mockResolvedValue({
      found: true,
      dealId: 'deal-1',
      deal: {
        id: 'deal-1',
        title: 'Acme expansion',
        status: 'open',
        pipelineStage: 'discovery',
        pipelineStageId: null,
        probability: 30,
        valueAmount: null,
        valueCurrency: null,
        expectedCloseAt: null,
      },
      recentActivitySnippets: [],
      daysSinceLastActivity: 2,
    })
    persistAtRiskFlagsMock.mockResolvedValue({ count: 1, newHighRiskAlerts: [] })
    emitHighRiskDealEventsMock.mockResolvedValue(undefined)
  })

  it('persists meeting and refreshes risk flags for negative transcript', async () => {
    const persisted: unknown[] = []
    const em = {
      create: jest.fn((_entity, data) => ({ ...data, id: 'meeting-1' })),
      persist: jest.fn((record) => persisted.push(record)),
      flush: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn().mockResolvedValue({
        riskLevel: 'high',
        reasonsJson: JSON.stringify(['negative_sentiment:frustrated']),
        lastScannedAt: new Date('2026-05-23T12:00:00.000Z'),
      }),
    } as unknown as EntityManager

    const result = await ingestDealMeeting(
      em,
      {} as AwilixContainer,
      scope,
      'deal-1',
      { transcript: 'Po raz kolejny proszę o odpowiedź! Problem z dostawą.' },
    )

    expect(persistAtRiskFlagsMock).toHaveBeenCalled()
    expect(emitHighRiskDealEventsMock).toHaveBeenCalled()
    expect(em.create).toHaveBeenCalled()
    expect(em.flush).toHaveBeenCalled()
    expect(result.meeting.id).toBe('meeting-1')
    expect(result.meeting.sentiment.atRisk).toBe(true)
    expect(result.risk?.atRisk).toBe(true)
  })

  it('throws when deal is missing', async () => {
    loadDealContextMock.mockResolvedValue({ found: false, dealId: 'missing' })
    const em = {
      create: jest.fn(),
      persist: jest.fn(),
      flush: jest.fn(),
      findOne: jest.fn(),
    } as unknown as EntityManager

    await expect(
      ingestDealMeeting(em, {} as AwilixContainer, scope, 'missing', {
        transcript: 'Hello',
      }),
    ).rejects.toThrow('DEAL_NOT_FOUND')
  })
})
