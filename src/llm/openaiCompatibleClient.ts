import type { LlmClient } from '../core/translate.js'

/**
 * LlmClient genérico para qualquer endpoint compatível com a API de chat
 * completions da OpenAI — funciona com Ollama local (`/v1/chat/completions`),
 * OpenAI, OpenRouter, ou qualquer proxy compatível. Mantém o core
 * desacoplado de um provedor específico (self-hosted-first: Ollama local é
 * o caminho recomendado para não depender de nenhuma API paga).
 */
export interface OpenAiCompatibleConfig {
  baseUrl: string // ex.: http://127.0.0.1:11434/v1 (Ollama) ou https://api.openai.com/v1
  apiKey?: string // vazio é válido para Ollama local
  model: string
  fetchImpl?: typeof fetch
}

export class OpenAiCompatibleClient implements LlmClient {
  constructor(private readonly config: OpenAiCompatibleConfig) {}

  async complete(prompt: string): Promise<string> {
    const doFetch = this.config.fetchImpl ?? fetch
    const res = await doFetch(`${this.config.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
      }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`LLM request falhou (${res.status}): ${body.slice(0, 300)}`)
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    const content = data.choices?.[0]?.message?.content
    if (!content) throw new Error('LLM respondeu sem conteúdo utilizável')
    return content.trim()
  }
}

/** Monta o client a partir de variáveis de ambiente, ou null se não configurado. */
export function llmClientFromEnv(env: NodeJS.ProcessEnv = process.env): LlmClient | null {
  const baseUrl = env.LLM_BASE_URL
  const model = env.LLM_MODEL
  if (!baseUrl || !model) return null
  return new OpenAiCompatibleClient({ baseUrl, model, apiKey: env.LLM_API_KEY })
}
