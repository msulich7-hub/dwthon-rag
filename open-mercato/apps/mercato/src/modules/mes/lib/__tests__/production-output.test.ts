import { recordProductionOutput } from '../production-output'

jest.mock('../../events', () => ({
  emitMesEvent: jest.fn(),
}))

jest.mock('../lots', () => ({
  getLotByNumber: jest.fn(),
  createLot: jest.fn(),
}))

jest.mock('../serials', () => ({
  getSerialByNumber: jest.fn(),
  createSerial: jest.fn(),
}))

jest.mock('../material-consumption-query', () => ({
  listConsumptionsForWorkOrder: jest.fn().mockResolvedValue([]),
}))

jest.mock('../genealogy-edges', () => ({
  createGenealogyEdge: jest.fn(),
}))

import { getLotByNumber, createLot } from '../lots'
import { createGenealogyEdge } from '../genealogy-edges'

const getLotByNumberMock = getLotByNumber as jest.MockedFunction<typeof getLotByNumber>
const createLotMock = createLot as jest.MockedFunction<typeof createLot>
const createGenealogyEdgeMock = createGenealogyEdge as jest.MockedFunction<typeof createGenealogyEdge>

describe('recordProductionOutput', () => {
  const scope = { tenantId: 't1', organizationId: 'o1' }

  beforeEach(() => {
    jest.clearAllMocks()
    getLotByNumberMock.mockResolvedValue(null)
    createLotMock.mockResolvedValue({
      id: 'lot-out',
      lotNumber: 'OUT-WO-1',
      productCode: 'FG',
      quantity: 10,
      status: 'active',
      workOrderId: 'wo-1',
    })
    getLotByNumberMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'lot-out',
        lotNumber: 'OUT-WO-1',
        productCode: 'FG',
        quantity: 10,
        status: 'active',
        workOrderId: 'wo-1',
      } as never)
  })

  it('rejects when work order is not completed', async () => {
    const em = {
      findOne: jest.fn().mockResolvedValue({
        id: 'wo-1',
        orderNumber: 'WO-1',
        productCode: 'FG',
        quantity: 10,
        status: 'in_progress',
      }),
    }

    await expect(
      recordProductionOutput(em as never, scope, { workOrderId: 'wo-1' }),
    ).rejects.toThrow('WORK_ORDER_NOT_COMPLETED')
  })

  it('records output lot and produce edge for completed work order', async () => {
    const outputRow = { id: 'out-1', producedAt: new Date() }
    const em = {
      findOne: jest.fn(async (_entity: unknown, where: Record<string, unknown>) => {
        if (where.id === 'wo-1') {
          return {
            id: 'wo-1',
            orderNumber: 'WO-1',
            productCode: 'FG',
            quantity: 10,
            status: 'completed',
          }
        }
        if (where.workOrderId === 'wo-1') return null
        if (where.id === 'lot-out') {
          return { id: 'lot-out', lotNumber: 'OUT-WO-1', productCode: 'FG' }
        }
        return null
      }),
      create: jest.fn(() => outputRow),
      persist: jest.fn(),
      flush: jest.fn(),
    }

    const result = await recordProductionOutput(em as never, scope, { workOrderId: 'wo-1' })

    expect(result.outputLotNumber).toBe('OUT-WO-1')
    expect(createGenealogyEdgeMock).toHaveBeenCalledWith(
      em,
      scope,
      expect.objectContaining({ relation: 'produce', parentType: 'work_order' }),
    )
  })
})
