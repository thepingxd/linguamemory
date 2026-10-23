import type { PhrasePage } from '../types/phrase.js'

/**
 * Matemática de retenção/decaimento, sem LLM — mesma família da curva de
 * Ebbinghaus, com atualização de estabilidade inspirada em SM-2 (Anki).
 *
 * retention(t) = exp(-diasDesdeUltimaPratica / stability)
 *
 * Reforço (prática com score alto) aumenta `stability` (esquece mais
 * devagar); score baixo reduz `stability` (precisa reforçar com mais
 * frequência). Isso espelha o invariante do ai-memory: "memória usada
 * decai mais devagar".
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000

export function daysSince(iso: string, now: Date): number {
  const diffMs = now.getTime() - new Date(iso).getTime()
  return Math.max(0, diffMs / MS_PER_DAY)
}

/** Retenção atual, 0..1. 1 = acabou de praticar, perto de 0 = esquecido. */
export function retention(page: PhrasePage, now: Date = new Date()): number {
  const d = daysSince(page.lastPracticedAt, now)
  if (page.stability <= 0) return 0
  return Math.exp(-d / page.stability)
}

/**
 * Atualiza a página após uma tentativa de shadowing/revisão.
 *
 * score >= 0.8: estabilidade cresce (reforço forte, SM-2-like: *1.6..2.2)
 * score >= 0.5: estabilidade cresce pouco (reforço parcial)
 * score <  0.5: estabilidade cai para perto do mínimo (precisa reforçar em
 *               breve, como um "lapse" no SM-2)
 */
export function recordAttempt(
  page: PhrasePage,
  score: number,
  now: Date = new Date(),
  note?: string,
): PhrasePage {
  if (score < 0 || score > 1) throw new Error('score deve estar entre 0 e 1')

  let nextStability: number
  if (score >= 0.8) {
    nextStability = page.stability * (1.6 + score * 0.6) // ~1.6x a 2.2x
  } else if (score >= 0.5) {
    nextStability = page.stability * (1 + score * 0.5) // crescimento modesto
  } else {
    nextStability = Math.max(0.5, page.stability * 0.3) // lapso: quase reseta
  }

  return {
    ...page,
    stability: Math.round(nextStability * 100) / 100,
    lastPracticedAt: now.toISOString(),
    attempts: [...page.attempts, { at: now.toISOString(), score, note }],
  }
}

/** Páginas cuja retenção caiu abaixo do limiar — candidatas a revisão hoje. */
export function dueForReview(
  pages: PhrasePage[],
  now: Date = new Date(),
  threshold = 0.5,
): PhrasePage[] {
  return pages
    .filter((p) => retention(p, now) < threshold)
    .sort((a, b) => retention(a, now) - retention(b, now))
}
