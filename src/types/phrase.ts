import type { Formality, Tone } from './envelope.js'

/**
 * Página de frase/expressão aprendida — a unidade de memória de longo prazo
 * para shadowing. É o equivalente a uma página de wiki do ai-memory, mas
 * para uma expressão de idioma em vez de um fato de projeto.
 */
export interface PhraseAttempt {
  /** ISO 8601. */
  at: string
  /** Score de similaridade/acerto do shadowing, 0..1. */
  score: number
  /** Observação opcional (ex.: "errou o /θ/ em 'think'"). */
  note?: string
}

export interface PhrasePage {
  id: string
  lang: string
  text: string
  translation?: string
  tone?: Tone[]
  formality?: Formality
  /** Estabilidade da memória, em dias — quanto maior, mais devagar decai. */
  stability: number
  /** ISO 8601 da última prática (shadowing ou revisão). */
  lastPracticedAt: string
  attempts: PhraseAttempt[]
}

export function newPhrasePage(params: {
  id: string
  lang: string
  text: string
  translation?: string
  tone?: Tone[]
  formality?: Formality
  now?: Date
}): PhrasePage {
  const now = params.now ?? new Date()
  return {
    id: params.id,
    lang: params.lang,
    text: params.text,
    translation: params.translation,
    tone: params.tone,
    formality: params.formality,
    stability: 1, // dia 1 por padrão — reforço precoce esperado
    lastPracticedAt: now.toISOString(),
    attempts: [],
  }
}
