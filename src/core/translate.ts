import type { TranslationRequest, TranslationResult } from '../types/envelope.js'
import { validateTranslationRequest } from '../types/envelope.js'

/**
 * Interface injetável — o core NUNCA chama um provedor de LLM diretamente.
 * Implementações reais (Ollama, API) vivem fora de `core/`.
 */
export interface LlmClient {
  complete(prompt: string): Promise<string>
}

/**
 * Implementação nula: não tem IA nenhuma, não finge traduzir. Serve para o
 * core funcionar (e ser testável) sem credencial nenhuma. Qualquer uso real
 * de produto precisa injetar um LlmClient real.
 */
export class NullLlmClient implements LlmClient {
  async complete(_prompt: string): Promise<string> {
    return '[sem LlmClient configurado — nenhuma tradução real foi feita]'
  }
}

/**
 * Monta o prompt estruturado a partir do envelope de contexto. Determinístico
 * e testável sem rede.
 */
export function buildPrompt(req: TranslationRequest): string {
  const toneList = req.desiredTone.join(', ')
  const lines = [
    `Traduza a mensagem abaixo para ${req.targetLang}.`,
    req.sourceLang ? `Idioma de origem: ${req.sourceLang}.` : 'Detecte o idioma de origem automaticamente.',
    `Tipo de mensagem: ${req.messageType}.`,
    `Motivo: ${req.reason}.`,
    `Importância: ${req.importance}.`,
    `Formalidade desejada: ${req.formality}.`,
    `Tom(s) desejado(s): ${toneList}.`,
  ]
  if (req.relationship) lines.push(`Relação com o destinatário: ${req.relationship}.`)
  lines.push(
    'Não traduza palavra por palavra — reexpresse a intenção no idioma de destino',
    'respeitando o tom e a formalidade pedidos. Devolva só a tradução final.',
    '',
    `Mensagem original: "${req.text}"`,
  )
  return lines.join('\n')
}

export async function translate(
  req: TranslationRequest,
  llm: LlmClient = new NullLlmClient(),
): Promise<TranslationResult> {
  const errors = validateTranslationRequest(req)
  if (errors.length > 0) {
    throw new Error(`TranslationRequest inválido: ${errors.join('; ')}`)
  }

  const prompt = buildPrompt(req)
  const output = await llm.complete(prompt)
  const isPlaceholder = llm instanceof NullLlmClient

  return {
    translatedText: output,
    rationale: isPlaceholder
      ? 'Nenhum LlmClient real foi injetado — resultado é placeholder.'
      : `Tom(s) ${req.desiredTone.join('/')}, formalidade ${req.formality}, motivo: ${req.reason}.`,
    isPlaceholder,
  }
}
