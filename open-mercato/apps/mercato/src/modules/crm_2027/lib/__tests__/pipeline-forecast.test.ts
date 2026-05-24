import { buildPipelineForecast } from '../pipeline-forecast'

jest.mock('@open-mercato/shared/lib/encryption/find', () => ({
  findWithDecryption: jest.fn(),
}))

import { findWithDecryption } from '@open-mercato/shared/lib/encryption/find'

const findWithDecryptionMock = findWithDecryption as jest.MockedFunction<typeof findWithDecryption>

describe('buildPipelineForecast', () => {
  it('computes weighted forecast from open deals', async () => {
    findWithDecryptionMock.mockResolvedValue([
      {
        id: 'd1',
        title: 'Big deal',
        pipelineStage: 'proposal',
        probability: 50,
        valueAmount: '10000',
        valueCurrency: 'USD',
      },
      {
        id: 'd2',
        title: 'Small deal',
        pipelineStage: 'discovery',
        probability: 20,
        valueAmount: '5000',
        valueCurrency: 'USD',
      },
    ] as never)

    const em = {
      find: jest.fn().mockResolvedValue([]),
    }

    const forecast = await buildPipelineForecast(
      em as never,
      { tenantId: 't1', organizationId: 'o1' },
      10,
    )

    expect(forecast.openDeals).toBe(2)
    expect(forecast.weightedForecast).toBe(6000)
    expect(forecast.currency).toBe('USD')
  })
})
