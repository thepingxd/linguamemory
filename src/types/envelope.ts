/** Contrato de missão 2: envelope de contexto para tradução informal. */

export type MessageType =
  | 'whatsapp_casual'
  | 'work_email'
  | 'discord_chat'
  | 'customer_support'
  | 'legal_notice'
  | 'flirty_dm'
  | 'apology'
  | 'negotiation'

export type Importance = 'low' | 'medium' | 'high' | 'critical'

export type Formality = 'very_informal' | 'informal' | 'neutral' | 'formal' | 'very_formal'

export type Tone =
  | 'friendly'
  | 'assertive'
  | 'humble'
  | 'playful'
  | 'urgent'
  | 'empathetic'
  | 'professional'
  | 'sarcastic'

export interface TranslationRequest {
  text: string
  sourceLang?: string
  targetLang: string
  messageType: MessageType
  reason: string
  importance: Importance
  formality: Formality
  desiredTone: Tone[]
  relationship?: string
}

export interface TranslationResult {
  translatedText: string
  /** Explica as escolhas de tom/formalidade feitas (transparência). */
  rationale: string
  /** true quando nenhum LLM real traduziu o texto (NullLlmClient). */
  isPlaceholder: boolean
}

export function validateTranslationRequest(req: TranslationRequest): string[] {
  const errors: string[] = []
  if (!req.text || req.text.trim().length === 0) errors.push('text é obrigatório')
  if (!req.targetLang || req.targetLang.trim().length === 0) errors.push('targetLang é obrigatório')
  if (!req.reason || req.reason.trim().length === 0) errors.push('reason é obrigatório')
  if (!req.desiredTone || req.desiredTone.length === 0) errors.push('desiredTone precisa de ao menos um tom')
  return errors
}
