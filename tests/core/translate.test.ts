import { describe, it, expect } from 'vitest'
import { translate, buildPrompt, NullLlmClient, type LlmClient } from '../../src/core/translate.js'
import type { TranslationRequest } from '../../src/types/envelope.js'
import { validateTranslationRequest } from '../../src/types/envelope.js'

const baseReq: TranslationRequest = {
  text: 'Posso te pagar na próxima semana?',
  targetLang: 'en',
  messageType: 'whatsapp_casual',
  reason: 'pedir prazo maior pra pagar',
  importance: 'medium',
  formality: 'informal',
  desiredTone: ['humble', 'friendly'],
  relationship: 'cliente antigo',
}

describe('validateTranslationRequest', () => {
  it('aceita um envelope completo', () => {
    expect(validateTranslationRequest(baseReq)).toEqual([])
  })

  it('rejeita texto vazio, targetLang vazio e tom vazio', () => {
    const errors = validateTranslationRequest({
      ...baseReq,
      text: '',
      targetLang: '',
      desiredTone: [],
    })
    expect(errors).toContain('text é obrigatório')
    expect(errors).toContain('targetLang é obrigatório')
    expect(errors).toContain('desiredTone precisa de ao menos um tom')
  })
})

describe('buildPrompt', () => {
  it('inclui todos os campos do envelope no prompt', () => {
    const prompt = buildPrompt(baseReq)
    expect(prompt).toContain('en')
    expect(prompt).toContain('whatsapp_casual')
    expect(prompt).toContain('pedir prazo maior pra pagar')
    expect(prompt).toContain('medium')
    expect(prompt).toContain('informal')
    expect(prompt).toContain('humble, friendly')
    expect(prompt).toContain('cliente antigo')
    expect(prompt).toContain(baseReq.text)
  })

  it('omite a linha de relação quando não informada', () => {
    const { relationship, ...withoutRelationship } = baseReq
    const prompt = buildPrompt(withoutRelationship as TranslationRequest)
    expect(prompt).not.toContain('Relação com o destinatário')
  })
})

describe('translate', () => {
  it('com NullLlmClient devolve placeholder e marca isPlaceholder=true', async () => {
    const result = await translate(baseReq)
    expect(result.isPlaceholder).toBe(true)
    expect(result.translatedText).toContain('sem LlmClient configurado')
  })

  it('com um LlmClient real injetado, usa a saída dele e marca isPlaceholder=false', async () => {
    const fakeLlm: LlmClient = {
      async complete(prompt: string) {
        expect(prompt).toContain(baseReq.text)
        return 'Can I pay you next week?'
      },
    }
    const result = await translate(baseReq, fakeLlm)
    expect(result.translatedText).toBe('Can I pay you next week?')
    expect(result.isPlaceholder).toBe(false)
    expect(result.rationale).toContain('humble/friendly')
  })

  it('rejeita envelope inválido antes de chamar o LLM', async () => {
    const llm = new NullLlmClient()
    await expect(translate({ ...baseReq, text: '' }, llm)).rejects.toThrow('TranslationRequest inválido')
  })
})
