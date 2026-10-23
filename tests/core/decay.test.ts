import { describe, it, expect } from 'vitest'
import { retention, recordAttempt, dueForReview, daysSince } from '../../src/core/decay.js'
import { newPhrasePage } from '../../src/types/phrase.js'

describe('decay', () => {
  it('retenção é 1.0 (ou muito próxima) logo após praticar', () => {
    const now = new Date('2026-01-10T12:00:00Z')
    const page = newPhrasePage({ id: 'p1', lang: 'en', text: 'hello', now })
    expect(retention(page, now)).toBeCloseTo(1, 5)
  })

  it('retenção decai com o tempo sem prática', () => {
    const start = new Date('2026-01-01T00:00:00Z')
    const page = newPhrasePage({ id: 'p1', lang: 'en', text: 'hello', now: start })
    const after5Days = new Date('2026-01-06T00:00:00Z')
    const after20Days = new Date('2026-01-21T00:00:00Z')
    const r5 = retention(page, after5Days)
    const r20 = retention(page, after20Days)
    expect(r5).toBeLessThan(1)
    expect(r20).toBeLessThan(r5)
  })

  it('score alto aumenta a estabilidade (esquece mais devagar depois)', () => {
    const now = new Date('2026-01-01T00:00:00Z')
    const page = newPhrasePage({ id: 'p1', lang: 'en', text: 'hello', now })
    const reinforced = recordAttempt(page, 0.95, now)
    expect(reinforced.stability).toBeGreaterThan(page.stability)
    expect(reinforced.attempts).toHaveLength(1)
  })

  it('score baixo reduz a estabilidade (lapso)', () => {
    const now = new Date('2026-01-01T00:00:00Z')
    let page = newPhrasePage({ id: 'p1', lang: 'en', text: 'hello', now })
    page = recordAttempt(page, 0.95, now) // reforça primeiro
    const stableAfterReinforce = page.stability
    const lapsed = recordAttempt(page, 0.1, now)
    expect(lapsed.stability).toBeLessThan(stableAfterReinforce)
  })

  it('rejeita score fora de 0..1', () => {
    const now = new Date()
    const page = newPhrasePage({ id: 'p1', lang: 'en', text: 'hello', now })
    expect(() => recordAttempt(page, 1.5, now)).toThrow()
    expect(() => recordAttempt(page, -0.1, now)).toThrow()
  })

  it('dueForReview ordena do mais esquecido para o menos esquecido', () => {
    const now = new Date('2026-01-30T00:00:00Z')
    const fresh = newPhrasePage({ id: 'fresh', lang: 'en', text: 'hi', now })
    const stale = newPhrasePage({
      id: 'stale',
      lang: 'en',
      text: 'bye',
      now: new Date('2026-01-01T00:00:00Z'),
    })
    const due = dueForReview([fresh, stale], now, 0.9)
    expect(due.map((p) => p.id)).toEqual(['stale'])
  })

  it('daysSince nunca retorna negativo', () => {
    const now = new Date('2026-01-01T00:00:00Z')
    const future = new Date('2026-01-05T00:00:00Z')
    expect(daysSince(future.toISOString(), now)).toBe(0)
  })
})
