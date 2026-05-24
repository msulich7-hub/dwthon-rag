import {
  canTransitionOperationStatus,
  isOperationQtyComplete,
} from '../operation-status'

describe('canTransitionOperationStatus', () => {
  it('allows ready to in_progress', () => {
    expect(canTransitionOperationStatus('ready', 'in_progress')).toBe(true)
  })

  it('blocks pending to completed', () => {
    expect(canTransitionOperationStatus('pending', 'completed')).toBe(false)
  })
})

describe('isOperationQtyComplete', () => {
  it('detects full completion including scrap', () => {
    expect(isOperationQtyComplete(10, 8, 2)).toBe(true)
    expect(isOperationQtyComplete(10, 9, 0)).toBe(false)
  })
})
