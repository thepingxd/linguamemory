import matter from 'gray-matter'
import { mkdirSync, readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { PhrasePage } from '../types/phrase.js'

/**
 * Markdown em git = fonte da verdade (mesmo princípio do ai-memory). Cada
 * frase é um arquivo `<wikiDir>/<lang>/<id>.md` com frontmatter YAML para os
 * campos estruturados e o corpo markdown livre para notas humanas.
 */

function pagePath(wikiDir: string, page: Pick<PhrasePage, 'lang' | 'id'>): string {
  return join(wikiDir, page.lang, `${page.id}.md`)
}

// js-yaml não aceita `undefined` como valor em nenhum nível — remove
// recursivamente antes de serializar o frontmatter (campos opcionais como
// `translation`, `tone`, `formality` e `attempt.note` podem estar ausentes).
function deepStripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => deepStripUndefined(v)) as unknown as T
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, deepStripUndefined(v)]),
    ) as T
  }
  return value
}

export function writePhrasePage(wikiDir: string, page: PhrasePage): string {
  const path = pagePath(wikiDir, page)
  mkdirSync(dirname(path), { recursive: true })
  const { attempts, text, ...frontmatter } = page
  const body = [
    `# ${text}`,
    '',
    page.translation ? `Tradução: ${page.translation}` : '',
    '',
    '## Tentativas',
    ...attempts.map((a) => `- ${a.at} — score ${a.score}${a.note ? ` — ${a.note}` : ''}`),
  ]
    .filter((l) => l !== '')
    .join('\n')

  const cleanFrontmatter = deepStripUndefined({ ...frontmatter, text, attempts })
  const content = matter.stringify(body, cleanFrontmatter)
  writeFileSync(path, content, 'utf-8')
  return path
}

export function readPhrasePage(wikiDir: string, lang: string, id: string): PhrasePage | null {
  const path = pagePath(wikiDir, { lang, id })
  if (!existsSync(path)) return null
  const raw = readFileSync(path, 'utf-8')
  const parsed = matter(raw)
  return parsed.data as PhrasePage
}

/** Lista todos os ids de frase para um idioma (varre o diretório). */
export function listPhraseIds(wikiDir: string, lang: string): string[] {
  const dir = join(wikiDir, lang)
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''))
}

export function readAllPhrasePages(wikiDir: string, lang: string): PhrasePage[] {
  return listPhraseIds(wikiDir, lang)
    .map((id) => readPhrasePage(wikiDir, lang, id))
    .filter((p): p is PhrasePage => p !== null)
}
