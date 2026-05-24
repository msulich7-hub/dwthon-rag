import { applyCannedTemplate } from '../../components/ticket-ui'

describe('applyCannedTemplate', () => {
  it('replaces ticketKey placeholder', () => {
    const out = applyCannedTemplate('Ticket {{ticketKey}} logged.', { ticketKey: 'HD-0042' })
    expect(out).toBe('Ticket HD-0042 logged.')
  })

  it('leaves unknown placeholders intact', () => {
    const out = applyCannedTemplate('Hello {{name}}', { ticketKey: 'HD-1' })
    expect(out).toBe('Hello {{name}}')
  })
})
