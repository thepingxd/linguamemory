import Database from 'better-sqlite3'
import { mkdirSync, existsSync } from 'node:fs'
import { dirname } from 'node:path'
import { readAllPhrasePages } from './wiki.js'
import { retention } from '../core/decay.js'
import type { PhrasePage } from '../types/phrase.js'

/**
 * Índice SQLite derivado — NUNCA é a fonte da verdade. Pode ser deletado e
 * reconstruído a qualquer momento a partir de `data/wiki/` (mesmo invariante
 * do ai-memory: markdown em git é o dado real, o índice é só performance de
 * busca).
 */

export function openIndex(dbPath: string): Database.Database {
  mkdirSync(dirname(dbPath), { recursive: true })
  const existed = existsSync(dbPath)
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  if (!existed) {
    db.exec(`
      CREATE TABLE phrases (
        id TEXT NOT NULL,
        lang TEXT NOT NULL,
        text TEXT NOT NULL,
        translation TEXT,
        stability REAL NOT NULL,
        last_practiced_at TEXT NOT NULL,
        retention REAL NOT NULL,
        PRIMARY KEY (lang, id)
      );
      CREATE INDEX idx_phrases_retention ON phrases(retention);
    `)
  }
  return db
}

function upsert(db: Database.Database, page: PhrasePage, now: Date): void {
  db.prepare(
    `INSERT INTO phrases (id, lang, text, translation, stability, last_practiced_at, retention)
     VALUES (@id, @lang, @text, @translation, @stability, @lastPracticedAt, @retention)
     ON CONFLICT(lang, id) DO UPDATE SET
       text = excluded.text,
       translation = excluded.translation,
       stability = excluded.stability,
       last_practiced_at = excluded.last_practiced_at,
       retention = excluded.retention`,
  ).run({
    id: page.id,
    lang: page.lang,
    text: page.text,
    translation: page.translation ?? null,
    stability: page.stability,
    lastPracticedAt: page.lastPracticedAt,
    retention: retention(page, now),
  })
}

/** Reconstrói o índice inteiro a partir do markdown — fonte da verdade. */
export function rebuildIndexFromWiki(
  db: Database.Database,
  wikiDir: string,
  langs: string[],
  now: Date = new Date(),
): number {
  db.exec('DELETE FROM phrases')
  let count = 0
  for (const lang of langs) {
    for (const page of readAllPhrasePages(wikiDir, lang)) {
      upsert(db, page, now)
      count++
    }
  }
  return count
}

export function queryDueForReview(
  db: Database.Database,
  threshold = 0.5,
  limit = 20,
): { id: string; lang: string; text: string; retention: number }[] {
  return db
    .prepare(
      `SELECT id, lang, text, retention FROM phrases
       WHERE retention < @threshold
       ORDER BY retention ASC
       LIMIT @limit`,
    )
    .all({ threshold, limit }) as { id: string; lang: string; text: string; retention: number }[]
}
