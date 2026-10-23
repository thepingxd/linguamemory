import { describe, it, expect } from 'vitest'
import { OpenAiCompatibleClient, llmClientFromEnv } from '../../src/llm/openaiCompatibleClient.js'

describe('OpenAiCompatibleClient', () => {
  it('monta a requisição corretamente e extrai o texto da resposta', async () => {
    let capturedUrl = ''
    let capturedBody: any = null
    const fakeFetch = (async (url: string, init: RequestInit) => {
      capturedUrl = url
      capturedBody = JSON.parse(init.body as string)
      return new Response(JSON.stringify({ choices: [{ message: { content: '  olá mundo  ' } }] }), {
        status: 200,
      })
    }) as typeof fetch

    const client = new OpenAiCompatibleClient({
      baseUrl: 'http://127.0.0.1:11434/v1',
      model: 'llama3',
      fetchImpl: fakeFetch,
    })

    const result = await client.complete('traduza isso')

    expect(capturedUrl).toBe('http://127.0.0.1:11434/v1/chat/completions')
    expect(capturedBody.model).toBe('llama3')
    expect(capturedBody.messages[0].content).toBe('traduza isso')
    expect(result).toBe('olá mundo') // trim aplicado
  })

  it('lança erro com status e corpo quando a resposta não é ok', async () => {
    const fakeFetch = (async () => new Response('bad request', { status: 400 })) as typeof fetch
    const client = new OpenAiCompatibleClient({ baseUrl: 'http://x', model: 'm', fetchImpl: fakeFetch })
    await expect(client.complete('x')).rejects.toThrow('LLM request falhou (400)')
  })

  it('não envia Authorization quando apiKey não é informada (Ollama local)', async () => {
    let capturedHeaders: Record<string, string> = {}
    const fakeFetch = (async (_url: string, init: RequestInit) => {
      capturedHeaders = init.headers as Record<string, string>
      return new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), { status: 200 })
    }) as typeof fetch
    const client = new OpenAiCompatibleClient({ baseUrl: 'http://x', model: 'm', fetchImpl: fakeFetch })
    await client.complete('x')
    expect(capturedHeaders.Authorization).toBeUndefined()
  })
})

describe('llmClientFromEnv', () => {
  it('retorna null quando LLM_BASE_URL ou LLM_MODEL não estão definidos', () => {
    expect(llmClientFromEnv({})).toBeNull()
    expect(llmClientFromEnv({ LLM_BASE_URL: 'http://x' })).toBeNull()
  })

  it('monta um client quando ambos estão definidos', () => {
    const client = llmClientFromEnv({ LLM_BASE_URL: 'http://x', LLM_MODEL: 'm' })
    expect(client).not.toBeNull()
  })
})
