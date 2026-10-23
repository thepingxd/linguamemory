import express, { type Request, type Response } from 'express'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { translate, NullLlmClient, type LlmClient } from '../core/translate.js'
import { validateTranslationRequest, type TranslationRequest } from '../types/envelope.js'
import { llmClientFromEnv } from '../llm/openaiCompatibleClient.js'
import { PhraseStore } from '../storage/phraseStore.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

export interface ServerOptions {
  dataDir: string
  llm?: LlmClient
  port?: number
}

export function createServer(opts: ServerOptions) {
  const llm = opts.llm ?? llmClientFromEnv() ?? new NullLlmClient()
  const store = new PhraseStore(opts.dataDir)

  const app = express()
  app.use(express.json({ limit: '64kb' }))
  app.use(express.static(join(__dirname, '..', '..', 'public')))

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, llmConfigured: !(llm instanceof NullLlmClient) })
  })

  app.post('/api/translate', async (req: Request, res: Response) => {
    const body = req.body as Partial<TranslationRequest>
    const request: TranslationRequest = {
      text: String(body.text ?? ''),
      sourceLang: body.sourceLang,
      targetLang: String(body.targetLang ?? ''),
      messageType: (body.messageType ?? 'whatsapp_casual') as TranslationRequest['messageType'],
      reason: String(body.reason ?? ''),
      importance: (body.importance ?? 'medium') as TranslationRequest['importance'],
      formality: (body.formality ?? 'informal') as TranslationRequest['formality'],
      desiredTone: Array.isArray(body.desiredTone) ? (body.desiredTone as TranslationRequest['desiredTone']) : [],
      relationship: body.relationship,
    }

    const errors = validateTranslationRequest(request)
    if (errors.length > 0) {
      res.status(400).json({ errors })
      return
    }

    try {
      const result = await translate(request, llm)
      res.json(result)
    } catch (err) {
      res.status(502).json({ errors: [(err as Error).message] })
    }
  })

  app.get('/api/review', (req: Request, res: Response) => {
    const raw = req.query.threshold
    const threshold = typeof raw === 'string' ? Number(raw) : 0.5
    res.json({ due: store.dueForReview(threshold) })
  })

  app.post('/api/phrases', (req: Request, res: Response) => {
    const { id, lang, text, translation } = req.body as Record<string, string>
    if (!id || !lang || !text) {
      res.status(400).json({ errors: ['id, lang e text são obrigatórios'] })
      return
    }
    const page = store.savePhrase({ id, lang, text, translation })
    res.json(page)
  })

  app.post('/api/phrases/:lang/:id/attempt', (req: Request, res: Response) => {
    const lang = String(req.params.lang)
    const id = String(req.params.id)
    const { score, note } = req.body as { score: number; note?: string }
    try {
      const page = store.recordShadowAttempt(lang, id, Number(score), new Date(), note)
      res.json(page)
    } catch (err) {
      res.status(404).json({ errors: [(err as Error).message] })
    }
  })

  return { app, store }
}

export function startServer(opts: ServerOptions) {
  const { app, store } = createServer(opts)
  const port = opts.port ?? 3900
  const server = app.listen(port, '127.0.0.1', () => {
    // eslint-disable-next-line no-console
    console.log(`LinguaMemory web rodando em http://127.0.0.1:${port}`)
  })
  return { server, store }
}
