# Plano — LinguaMemory MVP

## Objetivo
Core (sem MCP ainda) de um sistema de tradução informal com contexto de tom +
prática de shadowing para aprendizado de idiomas, usando a arquitetura do
`akitaonrails/ai-memory` como referência de design:

- markdown em git = fonte da verdade (páginas de frase/expressão aprendida);
- índice SQLite derivado (reconstruível do zero a partir do markdown);
- decaimento de retenção sem LLM por padrão (curva de esquecimento tipo
  Ebbinghaus/SM-2), reforçado por uso (prática de shadowing ou tradução
  repetida de uma expressão);
- LLM é plugável e opcional — o core funciona sem ele (diff textual, heurística
  de acerto fonético simples); entra só para nuance de tom/pronúncia.

## Não-objetivos (agora)
- MCP server (vem depois do core validado — `cli-core-before-mcp`).
- Áudio real (STT/TTS) — por ora `shadowPractice` recebe um score de
  similaridade já calculado externamente (placeholder para integrar
  Whisper/forced-alignment depois).
- Painel web.
- Multi-usuário/auth.

## Escopo desta entrega
1. `src/types/envelope.ts` — contrato `TranslationRequest` (missão 2).
2. `src/types/phrase.ts` — modelo de página de frase aprendida (idioma, tom,
   stability, lastPracticedAt, histórico de tentativas).
3. `src/core/decay.ts` — matemática de retenção/estabilidade (pura, testável).
4. `src/core/translate.ts` — monta prompt estruturado a partir do envelope;
   LLM client é uma interface injetável (`LlmClient`), com implementação
   `NullLlmClient` (heurística sem IA) para rodar sem credencial.
5. `src/core/shadow.ts` — `recordAttempt()` (atualiza stability a partir de um
   score 0..1) e `dueForReview()` (quais páginas decaíram e precisam reforço).
6. `src/storage/wiki.ts` — grava/lê página markdown com frontmatter
   (gray-matter) por frase; é a fonte da verdade.
7. `src/storage/index.ts` (SQLite) — índice derivado reconstruível
   (`rebuildFromWiki()`), com tabela `phrases` para busca rápida.
8. Testes Vitest cobrindo decaimento, reforço, translate sem LLM, round-trip
   wiki→índice.

## Arquivos que devem mudar
Todos novos — projeto greenfield.

## Testes
`npm test` (Vitest). Sem rede, sem credencial externa.

## Riscos
- Curva de decaimento é uma primeira aproximação; precisa validação empírica
  depois com uso real.
- `NullLlmClient` não faz tradução de verdade — é só para o core não travar
  sem chave de API. Tradução real exige plugar um `LlmClient` real (Ollama ou
  API) na próxima iteração.

## Rollback
Projeto novo, sem efeito em outros sistemas. Deletar a pasta é seguro.
