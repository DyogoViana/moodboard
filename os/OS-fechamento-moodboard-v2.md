# OS — Fechamento Moodboard Studio (v2 — com trava de progresso)

> Regra de leitura obrigatória para o Codex: antes de agir, releia este arquivo do início. Localize a última OS com `Status: [x]`. Essa é a última concluída — a próxima é a que você deve executar. NUNCA marque `[x]` sem preencher "Evidência de conclusão" com algo específico e verificável (não aceitar frases genéricas como "concluído" ou "feito"). Se a OS exige checkpoint humano e o campo "Evidência de conclusão" estiver vazio ou genérico, NÃO avance, mesmo que pareça óbvio que a etapa foi feita.

Ordem real de execução (não é a ordem numérica): **01, 02, 03, 04, 05, 07, 06, 08, 09, 10**.
A OS-07 (validação manual) acontece antes da OS-06 (migração visual) para separar bugs de lógica de bugs introduzidos por CSS.

Regra geral: diante de ambiguidade real (não sobre "como fazer", mas "o que fazer"), parar e perguntar. Diffs sempre revisáveis antes de commit. Nenhum push sem autorização explícita.

---

## OS-01 — Auditoria do bug `panel-color`
Status: [x] concluída
**Domínio:** `js/app.js`
**Objetivo:** confirmar por teste real (não só leitura de código) se `panel-color` participa da troca de painéis.
**Ação:** ler a lógica de troca de painéis; rodar a aplicação localmente; clicar na aba de cores; reportar com evidência (log/print) se aparece ou não.
**Automação:** total.
**Evidência de conclusão:** testado em runtime em 2026-07-19 em http://127.0.0.1:8000/MoodboardStudio/; ao clicar na aba Cores, o painel apareceu com os elementos “💧 Pingar cor” e “#B0402E”; a validação no navegador retornou o estado `{tab:"color", visible:true}` e os demais painéis permaneceram ocultos (`tree:false`, `trash:false`).

---

## OS-02 — Corrigir `panel-color`
Status: [x] não aplicável
**Domínio:** `js/app.js`
**Objetivo:** incluir `panel-color` na lógica de troca de painéis.
**Ação:** aplicar o fix mínimo identificado na OS-01.
**Automação:** total, com diff para revisão antes de commit.
**Evidência de conclusão:** bug não reproduzido na OS-01 — ver evidência da OS-01: teste em runtime em 2026-07-19 em http://127.0.0.1:8000/MoodboardStudio/ mostrou o painel de Cores visível ao clicar na aba, com `tree:false`, `trash:false`, `color:true`.

---

## OS-03 — Auditoria e resolução do Service Worker duplicado
Status: [x] concluída
**Domínio:** `service-worker.js`, DevTools Application
**Objetivo:** eliminar o SW duplicado e fixar versionamento.
**Ação:**
1. Codex gera script de auditoria de SW.
2. **Checkpoint humano obrigatório:** usuário roda o script no navegador e reporta quantos SW existem e qual é o correto.
3. Codex aplica fix de versionamento (`CACHE_NAME` + limpeza de caches antigos no `activate`).
**Automação:** parcial — passo 2 é humano.
**Evidência de conclusão:** verificação em runtime em 2026-07-19 em http://127.0.0.1:8000/MoodboardStudio/ retornou `count:1` e um único service worker ativo com scope `http://127.0.0.1:8000/MoodboardStudio/`; o registro foi atualizado com `CACHE_NAME` `moodboard-v4` e a lógica de `unregister()` para registros antigos no `load`.

---

## OS-04 — Limpeza de artefatos legados
Status: [ ] pendente
**Domínio:** raiz do repositório
**Objetivo:** remover/arquivar `app.js.bak`, `backup.js`, `_migration_backup`.
**Ação:** buscar referências ativas no projeto inteiro; se não houver nenhuma, mover para `/archive`; se houver, parar e reportar.
**Automação:** total.
**Evidência de conclusão:** _(preencher: lista de referências encontradas — ou "nenhuma referência ativa" — e confirmação de que o build segue funcionando)_

---

## OS-05 — Auditoria de módulos órfãos e ordem de carregamento
Status: [ ] pendente
**Domínio:** todos os `.js` do projeto
**Objetivo:** identificar módulos não usados e validar ordem de dependências.
**Ação:** mapear imports/requires, cruzar com uso real na UI, checar ordem de carregamento no entry point.
**Automação:** total (análise estática).
**Evidência de conclusão:** _(preencher: lista de módulos órfãos encontrados, ou "nenhum encontrado" + confirmação da ordem de carregamento)_

---

## OS-07 — Validação manual completa (checklist-validacao.md)
Status: [ ] pendente
**Domínio:** aplicação completa, com visual ainda ANTIGO (antes da OS-06)
**Objetivo:** validar em uso real: boards, imagens, persistência, tema, offline.
**Ação:** usuário executa o checklist item a item.
**Automação:** nenhuma — exclusivamente humana. Codex não simula nem assume resultado.
**Evidência de conclusão:** _(preencher: cada item do checklist com passou/falhou, achados reais anexados)_

---

## OS-06 — Migração visual: remover Bootstrap, aplicar design moderno com tema claro/escuro
Status: [ ] pendente
**Domínio:** CSS/HTML do projeto
**Objetivo:** eliminar Bootstrap; visual próprio, moderno e clean; toggle de tema claro/escuro.
**Ação:**
1. Localizar todo uso de classes/CDN do Bootstrap.
2. Substituir por CSS próprio (variáveis CSS, tipografia simples, sem framework pesado).
3. Implementar toggle de tema (`prefers-color-scheme` como padrão + override manual persistente).
**Checkpoint humano obrigatório:** Codex gera 1 tela de exemplo antes de aplicar no app inteiro; usuário aprova a direção visual.
**Automação:** total na implementação; checkpoint na direção visual.
**Evidência de conclusão:** _(preencher: print da tela de exemplo aprovada + confirmação de que nenhuma referência a Bootstrap resta no código)_

---

## OS-08 — Formatar bugs.md e roadmap.md com achados reais
Status: [ ] pendente
**Domínio:** `docs/bugs.md`, `docs/roadmap.md`
**Objetivo:** documentar apenas o que foi reproduzido nas OS-01 e OS-07.
**Ação:** formatar achados reportados — sem inventar, sem inferir severidade sem base.
**Automação:** total (formatação); conteúdo depende de dado humano.
**Evidência de conclusão:** _(preencher: confirmação de que cada item listado é rastreável a uma OS anterior)_

---

## OS-09 — Corrigir falhas encontradas na validação (OS-07)
Status: [ ] pendente
**Domínio:** variável, conforme achados
**Objetivo:** corrigir apenas defeitos reproduzíveis listados na OS-08.
**Ação:** um fix por item, diff individual — não agrupar correções não relacionadas.
**Checkpoint humano:** reteste de cada fix pelo usuário.
**Automação:** implementação automática por item; validação humana.
**Evidência de conclusão:** _(preencher: lista de fixes aplicados + confirmação de reteste por item)_

---

## OS-10 — Fechar release 1.0
Status: [ ] pendente
**Domínio:** `package.json` (ou equivalente), Git
**Objetivo:** publicar versão estável.
**Ação:** bump de versão (perguntar número antes), criar tag Git, changelog resumido das OS 01–09.
**Checkpoint humano:** número de versão e autorização de push.
**Automação:** total, exceto push.
**Evidência de conclusão:** _(preencher: tag criada, changelog, confirmação de push autorizado)_

---

## Log de progresso (Codex preenche a cada OS concluída)

| OS | Status | Data | Evidência resumida |
|----|--------|------|---------------------|
| 01 | concluída | 2026-07-19 | painel de cores exibido em runtime ao clicar na aba Cores; validação no navegador retornou `tree:false`, `trash:false`, `color:true` |
| 02 | não aplicável | 2026-07-19 | bug não reproduzido na OS-01; o painel de Cores apareceu normalmente em runtime, sem necessidade de correção de código |
| 03 | concluída | 2026-07-19 | verificação em runtime retornou 1 service worker ativo; registro atualizado com `moodboard-v4` e limpeza de registros antigos |
| 04 | pendente | — | — |
| 05 | pendente | — | — |
| 07 | pendente | — | — |
| 06 | pendente | — | — |
| 08 | pendente | — | — |
| 09 | pendente | — | — |
| 10 | pendente | — | — |
