# LinguaMemory — Project Structure

## Purpose
Tradução informal com contexto de tom (missão/motivo/importância/formalidade)
combinada com prática de shadowing para aprendizado de idiomas, com memória de
longo prazo por usuário/expressão. Arquitetura inspirada no
`akitaonrails/ai-memory`: markdown em git como fonte da verdade, índice
derivado, decaimento de retenção sem depender de LLM.

## Stack
- Runtime: Node.js 24, TypeScript.
- Teste: Vitest.
- Armazenamento: markdown (gray-matter) em `data/wiki/` (git-versionado) +
  SQLite derivado (`better-sqlite3`) em `data/db/index.sqlite`.
- LLM: plugável via interface `LlmClient` (nenhum provedor hardcoded).

## Entry Points
- Core: `src/core/translate.ts`, `src/core/shadow.ts`, `src/core/decay.ts`.
- Storage: `src/storage/wiki.ts` (markdown), `src/storage/index.ts` (SQLite).
- CLI: a definir na próxima iteração (depois do core validado).
- MCP: não existe ainda — ver `.hermes/plans/` e a nota em `.hermes.md`.

## Directory Map
```text
.
├── .hermes/plans/          # planos de implementação
├── docs/                   # esta documentação
├── src/
│   ├── types/               # contratos (TranslationRequest, PhrasePage)
│   ├── core/                 # lógica pura: decay, translate, shadow
│   └── storage/              # wiki (markdown) + índice SQLite derivado
├── data/                    # (gitignored) wiki + db em runtime
└── tests/                   # Vitest
```

## Core Flows

### Tradução com envelope de contexto
1. Chamador monta um `TranslationRequest` (texto, idioma destino,
   `message_type`, `reason`, `importance`, `formality`, `desired_tone`,
   `relationship` opcional).
2. `buildPrompt(request)` monta um prompt estruturado determinístico.
3. `translate(request, llmClient)` chama o `LlmClient` injetado; se nenhum for
   passado, usa `NullLlmClient` (heurística sem IA — devolve o texto original
   com uma nota, não finge traduzir).

### Shadowing / retenção
1. Cada frase aprendida é uma `PhrasePage` (idioma, texto, tom, `stability`
   em dias, `lastPracticedAt`, histórico de tentativas).
2. `retention(page, now)` calcula a retenção atual: `exp(-diasDesdeUltimaPratica / stability)`.
3. `recordAttempt(page, score, now)` atualiza `stability` a partir do score
   de acerto (0..1) do shadowing — acerto alto aumenta a estabilidade
   (relembra por mais tempo sem praticar), acerto baixo reduz.
4. `dueForReview(pages, now, threshold)` lista páginas cuja retenção caiu
   abaixo do limiar — candidatas a reforço hoje.

### Persistência
1. `writePhrasePage` / `readPhrasePage` leem e escrevem o markdown com
   frontmatter em `data/wiki/<lang>/<slug>.md`. Esse arquivo é a fonte da
   verdade — pode ser editado à mão, versionado em git, aberto no Obsidian.
2. `rebuildIndexFromWiki` varre `data/wiki/` e reconstrói o SQLite do zero —
   o índice nunca é a fonte de verdade, é derivado.

## Configuration
- Nenhuma variável obrigatória para rodar o core/testes.
- Futuro: `LLM_PROVIDER`, `LLM_API_KEY` quando um `LlmClient` real for
  plugado (Ollama local ou API).

## Verification
- Instalar: `npm install`.
- Testar: `npm test`.
- Build: `npm run build` (tsc).

## Deploy
- Ainda não aplicável — projeto em fase de core/CLI, sem runtime exposto.

## Security Boundaries
- `core/` nunca deve conter chamada de rede direta a provedor de LLM —
  sempre via `LlmClient` injetado, para o core ser testável sem rede/segredo.
- Nenhum dado de usuário sai da máquina por padrão (self-hosted).

## Known Pitfalls
- A curva de decaimento é uma primeira aproximação (Ebbinghaus/SM-2
  simplificado) — precisa calibrar com uso real antes de confiar nela para
  prioridade de revisão em produção.
