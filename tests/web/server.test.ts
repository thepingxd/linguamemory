import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Server } from 'node:http'
import { startServer } from '../../src/web/server.js'
import type { LlmClient } from '../../src/core/translate.js'
import type { PhraseStore } from '../../src/storage/phraseStore.js'

let tmp: string
let server: Server
let store: PhraseStore
let port: number

const fakeLlm: LlmClient = {
  async complete() {
    return 'Can I pay you next week?'
  },
}

beforeAll(async () => {
  tmp = mkdtempSync(join(tmpdir(), 'linguamemory-web-'))
  port = 39871
  const started = startServer({ dataDir: tmp, llm: fakeLlm, port })
  server = started.server
  store = started.store
  await new Promise((resolve) => server.once('listening', resolve))
})

afterAll(() => {
  store.close()
  server.close()
  rmSync(tmp, { recursive: true, force: true })
})

const base = () => `http://127.0.0.1:${port}`

describe('web server (smoke real via HTTP)', () => {
  it('GET /api/health reporta llmConfigured=true quando um LlmClient real foi injetado', async () => {
    const res = await fetch(`${base()}/api/health`)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toEqual({ ok: true, llmConfigured: true })
  })

  it('POST /api/translate com envelope válido devolve a tradução do LlmClient injetado', async () => {
    const res = await fetch(`${base()}/api/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'Posso te pagar na próxima semana?',
        targetLang: 'en',
        messageType: 'whatsapp_casual',
        reason: 'pedir prazo maior pra pagar',
        importance: 'medium',
        formality: 'informal',
        desiredTone: ['humble', 'friendly'],
      }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.translatedText).toBe('Can I pay you next week?')
    expect(data.isPlaceholder).toBe(false)
  })

  it('POST /api/translate com envelope inválido devolve 400 com os erros', async () => {
    const res = await fetch(`${base()}/api/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetLang: '', desiredTone: [] }),
    })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.errors.length).toBeGreaterThan(0)
  })

  it('salva frase e registra tentativa de shadowing (atualiza estabilidade)', async () => {
    await fetch(`${base()}/api/phrases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'hello', lang: 'en', text: 'hello there', translation: 'olá' }),
    })

    const attemptRes = await fetch(`${base()}/api/phrases/en/hello/attempt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score: 0.2, note: 'pronúncia ruim' }),
    })
    expect(attemptRes.status).toBe(200)
    const page = await attemptRes.json()
    expect(page.attempts).toHaveLength(1)
    expect(page.stability).toBeLessThan(1) // score baixo = lapso, estabilidade cai

    // recém-praticada: ainda não deve estar na fila de revisão (retenção ~1)
    const reviewRes = await fetch(`${base()}/api/review?threshold=0.5`)
    const review = await reviewRes.json()
    expect(review.due.map((r: { id: string }) => r.id)).not.toContain('hello')
  })

  it('GET / serve o index.html estático', async () => {
    const res = await fetch(`${base()}/`)
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toContain('LinguaMemory')
  })
})
