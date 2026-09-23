---
title: Os dois agentes
description: "Os dois agentes do Stem, e por que o pi não entra por ACP"
---

**O Stem tem dois agentes com papéis que não se misturam: o construtor, que escreve o app, e o agente-produto, que
vive dentro dele.** A pergunta "embutir o pi.dev por ACP para o cliente criar agente com skills" juntava os dois, e
separados cada um tem uma porta já decidida. Registrado em 14/09, depois de cinco turnos entre duas sessões (b1 e
b2) a pedido do dono; nada do agente-produto está construído.

```
construtor      claude-agent-acp  ──ACP──▶  stem.ts   escreve definição, opera pelo /_mcp, dentro de uma cerca
agente-produto  pipi-sdk Conversation      consome `asked`, produz `sent` no barramento do app
```

## O construtor fica no claude-agent-acp

**Trocar o construtor pelo `pi-acp` tira dele as tools do runtime e a cerca ao mesmo tempo.** O pi não tem ACP
nativo; o `pi-acp` (svkozak, 0.0.33, MVP feito para o Zed) abre `pi --mode rpc --no-themes` por baixo e declara
`mcpCapabilities: { http: false, sse: false }` (`dist/index.js:1936`). O README dele diz que MCP "is accepted in
ACP params and stored in session state, but not wired through to pi".

O construtor depende do `_meta.claudeCode.options` — `settingSources: []`, `allowedTools` e os `disallowedTools`
que tiram Bash, Write e Edit do designer — e isso é vocabulário do `claude-agent-acp`, que o `pi-acp` ignora. A
proposta de `--mode acp` nativo no pi (earendil-works/pi, discussion #4444) estava sem resposta de mantenedor.

## O agente-produto fala pelo pipi-sdk

**A casa já embute o pi pelo SDK, em processo, e esse é o contrato do agente-produto; o `pi-acp` seria a terceira
porta para o mesmo pi, e a mais fraca.** A Mel é um agente do pipi (`libs/viacorretor/mel/CONTEXT.md`), e o pipi
importa `@earendil-works/pi-coding-agent` em `libs/pipi/runtime/`. O pi da VPS com `skills/viacorretor` é outro
agente, o de operação, e a própria skill `mel` diz que "não é a Mel falando".

O `Pipi.Event` (`libs/pipi-sdk-ts/core.ts:23-28`) é `asked | delta | said | sent | failed`, e casa com o
produtor e consumidor do `world.md` sem sessão na interface: o `SessionPool` é o dono dela.

```
asked    o evento consumido: a mensagem que chegou do canal, real ou simulado
sent     o evento produzido: a mensagem que sai pelo canal
said     sem `sent` é artefato, não mensagem — outro evento
failed   já existe no contrato
delta    fluxo, não fato: vai para a tela, nunca para o barramento
```

A chave do pool é `tenant · agente · escopo` (`libs/pipi/runtime/pool.ts:237`). Um tenant é um diretório com
`db.sqlite` e `sessions/` (`libs/pipi/runtime/tenant.ts:39-45`), então tenant é o app, escopo é a conversa, e o
cliente dentro do app nunca é tenant — a Mel já o põe no escopo, `client:<slug>:<imovel>`.

## O banco duplo é contradição, e tem saída parcial

**O `db.sqlite` do tenant guarda fatos do cliente, não só sessão, e isso abre um buraco na linha do tempo do app.**
Lido em 14/09: o pipi grava ali `notes` (título e corpo, `libs/pipi/runtime/tools.ts:253`) e `deal_revisions`, os
dados do contrato com vendedores, compradores e corretoras (`libs/pipi/contract/tools.ts:19`). Como o time travel
em disco falhou e a linha do tempo mora nos eventos, um fato lembrado só no sqlite é um fato que o app não vê.

A saída é metade porta, metade código fixo. `dataTools` é injetável (`libs/pipi/runtime/ports.ts:25`, ligado em
`apps/pipi/server.ts:173`), mas a porta tem o formato do sqlite: `DataToolsFn` recebe `paths.db`. Publicar o
evento não basta. A tool que o Stem injeta ignora `dbPath`, grava no banco do app e publica o evento, e o
`db.sqlite` do tenant fica só com o que é do pipi; senão o mesmo fato mora em dois lugares.

As tools de contrato nem porta têm: `createContractTools` está chamado direto em `pool.ts:407`, e pô-las atrás de
uma só fecha a contradição com a mesma regra — a implementação do Stem não toca o sqlite.

## A ordem

```
1. a Mel estática, do config.yaml, como consumidor/produtor no /_zap-simulator   prova a porta, zero mudança no pipi
2. contract tools atrás de porta, como dataTools já está                        fecha o banco duplo
3. AgentSource no lugar do YAML fixo                                           só quando houver o SEGUNDO agente
```

O passo 3 espera um gatilho de demanda, não de código. `config()` lê o `config.yaml` uma vez e guarda em cache
(`libs/pipi/runtime/config.ts:250-269`), mas o pool resolve `agentConfig(agent)` ao criar a sessão, então a quebra
está na fonte. "Cliente cria agente com skills" tinha zero casos em 14/09: a Mel é um agente, configurado pelo
dono. Um `AgentSource` antes do segundo agente pedido por terceiro seria construído sobre o `<app>.ts`, que ainda
não existe.
