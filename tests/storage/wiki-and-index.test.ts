import { describe, it, expect, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { writePhrasePage, readPhrasePage, readAllPhrasePages } from '../../src/storage/wiki.js'
import { openIndex, rebuildIndexFromWiki, queryDueForReview } from '../../src/storage/index.js'
import { newPhrasePage } from '../../src/types/phrase.js'
import { recordAttempt } from '../../src/core/decay.js'

let tmp: string

afterEach(() => {
  if (tmp) rmSync(tmp, { recursive: true, force: true })
})

describe('wiki (markdown = fonte da verdade)', () => {
  it('escreve e lê uma página de volta com os mesmos campos estruturados', () => {
    tmp = mkdtempSync(join(tmpdir(), 'linguamemory-'))
    const now = new Date('2026-01-01T00:00:00Z')
    const page = newPhrasePage({
      id: 'hello-friend',
      lang: 'en',
      text: 'hello, my friend',
      translation: 'olá, meu amigo',
      now,
    })
    const withAttempt = recordAttempt(page, 0.9, now, 'pronúncia ok')

    writePhrasePage(tmp, withAttempt)
    const readBack = readPhrasePage(tmp, 'en', 'hello-friend')

    expect(readBack).not.toBeNull()
    expect(readBack!.text).toBe('hello, my friend')
    expect(readBack!.translation).toBe('olá, meu amigo')
    expect(readBack!.attempts).toHaveLength(1)
    expect(readBack!.attempts[0]!.score).toBe(0.9)
    expect(readBack!.stability).toBeGreaterThan(1)
  })

  it('retorna null para página inexistente', () => {
    tmp = mkdtempSync(join(tmpdir(), 'linguamemory-'))
    expect(readPhrasePage(tmp, 'en', 'nao-existe')).toBeNull()
  })

  it('readAllPhrasePages lista todas as páginas de um idioma', () => {
    tmp = mkdtempSync(join(tmpdir(), 'linguamemory-'))
    const now = new Date('2026-01-01T00:00:00Z')
    writePhrasePage(tmp, newPhrasePage({ id: 'a', lang: 'en', text: 'a', now }))
    writePhrasePage(tmp, newPhrasePage({ id: 'b', lang: 'en', text: 'b', now }))
    writePhrasePage(tmp, newPhrasePage({ id: 'c', lang: 'pt', text: 'c', now }))

    const enPages = readAllPhrasePages(tmp, 'en')
    expect(enPages.map((p) => p.id).sort()).toEqual(['a', 'b'])
  })
})

describe('índice SQLite (derivado, reconstruível)', () => {
  it('rebuildIndexFromWiki reconstrói o índice do zero a partir do markdown', () => {
    tmp = mkdtempSync(join(tmpdir(), 'linguamemory-'))
    const now = new Date('2026-01-30T00:00:00Z')

    const fresh = newPhrasePage({ id: 'fresh', lang: 'en', text: 'fresh phrase', now })
    const stale = recordAttempt(
      newPhrasePage({ id: 'stale', lang: 'en', text: 'stale phrase', now: new Date('2026-01-01T00:00:00Z') }),
      0.4,
      new Date('2026-01-01T00:00:00Z'),
    )
    writePhrasePage(tmp, fresh)
    writePhrasePage(tmp, stale)

    const db = openIndex(join(tmp, 'index.sqlite'))
    const count = rebuildIndexFromWiki(db, tmp, ['en'], now)
    expect(count).toBe(2)

    const due = queryDueForReview(db, 0.9, 10)
    expect(due.map((r) => r.id)).toContain('stale')
    expect(due.map((r) => r.id)).not.toContain('fresh')

    db.close()
  })

  it('o índice reconstruído do zero é idempotente (não duplica linhas)', () => {
    tmp = mkdtempSync(join(tmpdir(), 'linguamemory-'))
    const now = new Date('2026-01-01T00:00:00Z')
    writePhrasePage(tmp, newPhrasePage({ id: 'only', lang: 'en', text: 'only phrase', now }))

    const db = openIndex(join(tmp, 'index.sqlite'))
    rebuildIndexFromWiki(db, tmp, ['en'], now)
    rebuildIndexFromWiki(db, tmp, ['en'], now)

    const rows = db.prepare('SELECT COUNT(*) as c FROM phrases').get() as { c: number }
    expect(rows.c).toBe(1)
    db.close()
  })
})
