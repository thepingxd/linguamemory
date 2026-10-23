import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { openIndex, rebuildIndexFromWiki, queryDueForReview } from '../storage/index.js'
import { writePhrasePage, readPhrasePage } from '../storage/wiki.js'
import { newPhrasePage } from '../types/phrase.js'
import { recordAttempt } from '../core/decay.js'
import type { PhrasePage } from '../types/phrase.js'
import type Database from 'better-sqlite3'

/**
 * Junta storage/wiki (fonte da verdade) + storage/index (derivado) numa API
 * simples para a camada web usar, sem reimplementar os detalhes de
 * markdown/SQLite em cada handler de rota.
 */
export class PhraseStore {
  private readonly db: Database.Database

  constructor(
    private readonly dataDir: string,
    private readonly langs: string[] = ['en', 'es', 'pt'],
  ) {
    mkdirSync(dataDir, { recursive: true })
    this.db = openIndex(join(dataDir, 'db', 'index.sqlite'))
    this.reindex()
  }

  private get wikiDir(): string {
    return join(this.dataDir, 'wiki')
  }

  reindex(now: Date = new Date()): number {
    return rebuildIndexFromWiki(this.db, this.wikiDir, this.langs, now)
  }

  savePhrase(params: {
    id: string
    lang: string
    text: string
    translation?: string
    now?: Date
  }): PhrasePage {
    const existing = readPhrasePage(this.wikiDir, params.lang, params.id)
    const page =
      existing ??
      newPhrasePage({ id: params.id, lang: params.lang, text: params.text, now: params.now })
    const updated: PhrasePage = { ...page, translation: params.translation ?? page.translation }
    writePhrasePage(this.wikiDir, updated)
    this.reindex(params.now)
    return updated
  }

  recordShadowAttempt(
    lang: string,
    id: string,
    score: number,
    now: Date = new Date(),
    note?: string,
  ): PhrasePage {
    const page = readPhrasePage(this.wikiDir, lang, id)
    if (!page) throw new Error(`frase não encontrada: ${lang}/${id}`)
    const updated = recordAttempt(page, score, now, note)
    writePhrasePage(this.wikiDir, updated)
    this.reindex(now)
    return updated
  }

  dueForReview(threshold = 0.5, limit = 20) {
    return queryDueForReview(this.db, threshold, limit)
  }

  close(): void {
    this.db.close()
  }
}
