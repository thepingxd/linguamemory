# LinguaMemory

Tradução informal com contexto de tom + shadowing para aprendizado de
idiomas, com memória de longo prazo. 100% self-hosted, sem dependência de
SaaS externo.

## Por quê

Tradutor genérico troca palavra por palavra. LinguaMemory carrega um
**envelope de contexto** junto do texto — tipo de mensagem, motivo,
importância, formalidade e tom desejado — e devolve a intenção reexpressa no
idioma de destino, não uma tradução literal.

A parte de aprendizado usa **shadowing** (repetir/imitar fala nativa) com uma
curva de retenção tipo Ebbinghaus/SM-2: frases praticadas com sucesso
"esquecem" mais devagar; frases mal praticadas voltam para a fila de revisão
mais rápido.

## Arquitetura

Inspirada no [`akitaonrails/ai-memory`](https://github.com/akitaonrails/ai-memory):

- **Markdown em git é a fonte da verdade.** Cada frase aprendida é um
  arquivo `.md` com frontmatter — pode ser lido, editado à mão, versionado,
  aberto no Obsidian.
- **SQLite é um índice derivado**, nunca a fonte de dados — pode ser
  deletado e reconstruído a qualquer momento a partir do markdown.
- **LLM é plugável e opcional.** O core (`src/core/`) nunca chama um
  provedor diretamente — tudo passa por uma interface `LlmClient` injetada.
  Sem credencial, o sistema roda com `NullLlmClient` (sem IA).

Ver `docs/PROJECT_STRUCTURE.md` para detalhes.

## Status

MVP do core (sem CLI/API/web ainda — chegando). Ver `.hermes/plans/` para o
plano de implementação e próximos passos.

## Rodando

```bash
npm install
npm run typecheck
npm test
npm run build
```

Nenhuma variável de ambiente é necessária para rodar os testes.

## Licença

MIT.
