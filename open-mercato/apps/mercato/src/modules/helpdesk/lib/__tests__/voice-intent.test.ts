import { parseHelpdeskVoiceIntent } from '../voice-intent'

describe('parseHelpdeskVoiceIntent', () => {
  it('returns unknown for empty transcript', () => {
    expect(parseHelpdeskVoiceIntent('').intent).toBe('unknown')
  })

  it('detects assign to me', () => {
    const r = parseHelpdeskVoiceIntent('przypisz do mnie')
    expect(r.intent).toBe('assign_to_me')
    expect(r.confidence).toBeGreaterThan(0.8)
  })

  it('detects set status with status parameter', () => {
    const r = parseHelpdeskVoiceIntent('ustaw status resolved')
    expect(r.intent).toBe('set_status')
    expect(r.parameters.status).toBe('resolved')
  })

  it('extracts body after colon for internal note', () => {
    const r = parseHelpdeskVoiceIntent('notatka wewnętrzna: sprawdzono logi serwera')
    expect(r.intent).toBe('add_internal_note')
    expect(r.parameters.body).toBe('sprawdzono logi serwera')
  })

  it('detects create ticket in English', () => {
    const r = parseHelpdeskVoiceIntent('create ticket: VPN down')
    expect(r.intent).toBe('create_ticket')
    expect(r.parameters.subject).toContain('VPN')
  })

  it('detects KB search', () => {
    const r = parseHelpdeskVoiceIntent('search knowledge: password reset')
    expect(r.intent).toBe('search_kb')
    expect(r.parameters.query).toContain('password')
  })

  it('falls back to internal note for long unknown text', () => {
    const long = 'a'.repeat(25)
    const r = parseHelpdeskVoiceIntent(long)
    expect(r.intent).toBe('add_internal_note')
    expect(r.parameters.body).toBe(long)
  })
})
