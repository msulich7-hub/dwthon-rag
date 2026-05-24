import { parseVoiceIntent } from '../voice-intent'

describe('parseVoiceIntent', () => {
  it('parses Polish create-task intent', () => {
    const result = parseVoiceIntent(
      'Utwórz zadanie na czwartek, aby skontaktować się z Janem Kowalskim',
    )
    expect(result.intent).toBe('create_task')
    expect(result.parameters.contactName).toMatch(/Jan/)
  })

  it('parses deal update intent', () => {
    const result = parseVoiceIntent('Zaktualizuj transakcję i zmień etap na negocjacje')
    expect(result.intent).toBe('update_deal')
  })
})
