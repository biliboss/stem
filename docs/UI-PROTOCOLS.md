---
title: UI protocols
description: "UI-PROTOCOLS — generative UI, e o que copiar para o nosso DSL"
---

Levantado em 14/09/2026 por WebFetch nas páginas oficiais. Onde a sintaxe exata
não apareceu na página lida, o trecho está marcado **(inferido)**.

O nosso caso é diferente dos cinco: o LLM emite a view UMA vez, e ela precisa
renderizar de novo, sem LLM, a partir de `(árvore + resultado de SurrealQL)`,
em JSX → DaisyUI 5 + HTMX 2, com a ação sendo uma operação HTTP.

## 1. Vercel json-render

Fontes: https://github.com/vercel-labs/json-render · https://json-render.dev/docs/data-binding · https://json-render.dev/docs/actions

Spec plana: `root` + mapa `elements` por id, filho por id. Catálogo em zod
(`defineCatalog(schema, { components: { Card: { props: z.object(...), description } }, actions: { export_report: { description } } })`)
— a `description` é o que vira prompt. Dados: JSON Pointer em `state`.

- Leitura: `{ "$state": "/user/name" }`, `{ "$template": "Olá, ${/user/name}!" }`, `{ "$cond": ..., "$then": ..., "$else": ... }`, `{ "$computed": "fn", "args": {} }`
- Escrita (input): `{ "$bindState": "/form/email" }`; dentro de repeat `{ "$bindItem": "completed" }`
- Lista: `repeat: { statePath, key }`, com `{ "$item": "title" }` e `{ "$index": true }`
- Visibilidade: `"visible": [{ "$state": "/form/hasError" }, { "$state": "/x", "not": true }]` (AND)
- `watch`: `{ "/form/country": { "action": "loadCities", "params": {...} } }` — dispara na mudança, não no render inicial
- Streaming: JSONL de patches (`op`/`path`), `createSpecStreamCompiler().push(chunk)`
- Ação volta ao servidor: não volta — o handler é do cliente (`emit("press")` → handler registrado). O servidor só entra se o handler fizer fetch.

```json
{
  "root": "page",
  "state": { "form": { "title": "" }, "todos": [{ "id": "t1", "title": "Pão", "done": false }] },
  "elements": {
    "page":  { "type": "Stack", "props": {}, "children": ["form", "list"] },
    "form":  { "type": "Stack", "props": {}, "children": ["title", "add"] },
    "title": { "type": "Input", "props": { "label": "Tarefa", "value": { "$bindState": "/form/title" } } },
    "add":   { "type": "Button", "props": { "label": "Adicionar" },
               "on": { "press": { "action": "addTodo", "params": { "title": { "$state": "/form/title" } } } } },
    "list":  { "type": "Stack", "props": {}, "repeat": { "statePath": "/todos", "key": "id" }, "children": ["row"] },
    "row":   { "type": "Checkbox", "props": { "label": { "$item": "title" }, "checked": { "$bindItem": "done" } } }
  }
}
```
(`on`/`press`/`params` na forma acima é **inferido** da doc de actions; `repeat`, `$item`, `$bindItem` estão na doc.)

## 2. Google A2UI

Fontes: https://a2ui.org/ · https://a2ui.org/specification/v0.8-a2ui/ (produção hoje é 0.9.1, 1.0 candidata)

JSONL de mensagens; componentes em **lista de adjacência** (array plano, filho por id);
estrutura e dados em mensagens separadas. Catálogo pré-aprovado pelo cliente.

- `surfaceUpdate { surfaceId, components: [{ id, component: { Tipo: props } }] }`
- `dataModelUpdate { surfaceId, path, contents: [{ key, valueString|valueNumber|valueBoolean|valueMap }] }`
- `beginRendering { surfaceId, root }` — só aqui o cliente pinta (evita flash de parcial)
- Valor ligado: `{ "literalString": "x" }` | `{ "path": "/user/name" }` | ambos (path com default)
- Filhos: `{ "explicitList": [ids] }` ou `{ "template": { "componentId": "row", "dataBinding": "/items" } }` — dentro do template, path relativo ao item
- Ação: `action: { name, context: [{ key, value: { path } }] }` → cliente manda `userAction { name, surfaceId, sourceComponentId, timestamp, context: {resolvido} }` ao agente, que responde com novas mensagens

```jsonl
{"surfaceUpdate":{"surfaceId":"main","components":[
  {"id":"root","component":{"Column":{"children":{"explicitList":["title","add","list"]}}}},
  {"id":"title","component":{"TextField":{"label":{"literalString":"Tarefa"},"text":{"path":"/form/title"}}}},
  {"id":"add","component":{"Button":{"child":"addLabel","action":{"name":"addTodo","context":[{"key":"title","value":{"path":"/form/title"}}]}}}},
  {"id":"addLabel","component":{"Text":{"text":{"literalString":"Adicionar"}}}},
  {"id":"list","component":{"List":{"children":{"template":{"componentId":"row","dataBinding":"/todos"}}}}},
  {"id":"row","component":{"Text":{"text":{"path":"title"}}}}
]}}
{"dataModelUpdate":{"surfaceId":"main","path":"/","contents":[{"key":"todos","valueMap":[{"key":"0","valueMap":[{"key":"title","valueString":"Pão"}]}]}]}}
{"beginRendering":{"surfaceId":"main","root":"root"}}
← {"userAction":{"name":"addTodo","surfaceId":"main","sourceComponentId":"add","timestamp":"2026-09-14T12:00:00Z","context":{"title":"Leite"}}}
```
(`TextField`/`List`/`child` seguem o catálogo padrão da 0.8 — **inferido** nos nomes exatos das props.)

## 3. AG-UI (CopilotKit)

Fonte: https://docs.ag-ui.com/concepts/events

Não é DSL de UI: é o **transporte** agente↔front. Eventos com `type`, `timestamp`, `metadata`:
lifecycle (`RunStarted` → `StepStarted/Finished` → `RunFinished|RunError`), texto
(`TextMessageStart/Content/End`), ferramenta (`ToolCallStart/Args/End`, + resultado), estado
(`StateSnapshot` + `StateDelta` em JSON Patch RFC 6902, `MessagesSnapshot`), `ActivitySnapshot/Delta`,
reasoning, `Custom`/`Raw`. Generative UI entra de três formas: tool call renderizada pelo front
(o front registra um componente por tool), estado compartilhado, ou carregando A2UI/MCP-UI por cima.
Ação volta como mensagem/tool result no próximo run. Um form+lista seria `StateSnapshot {todos:[...]}`
e o componente é do front — não há JSON de árvore para mostrar.

## 4. MCP-UI / MCP Apps

Fontes: https://mcpui.dev/ · MCP Apps (SEP-1865, hoje o padrão oficial)

Recurso `ui://server/widget` com HTML (`text/html;profile=mcp-app`), ligado à tool por
`_meta.ui.resourceUri`; roda em iframe sandbox e fala por JSON-RPC em `postMessage`
(`ui/initialize`, `ui/notifications/tool-result`, `tools/call`, `ui/message`). Ação = `tools/call`.
É o oposto de um DSL: o servidor manda o HTML pronto.

## 4b. Prefect Prefab

Fontes: https://github.com/PrefectHQ/prefab · https://prefab.prefect.io/docs/welcome · https://prefab.prefect.io/docs/llms.txt · https://prefab.prefect.io/docs/protocol/fetch.md · https://prefab.prefect.io/docs/protocol/for-each.md

DSL em Python (context managers `with Card(): ...`, estado `Rx("name")`) que compila para JSON
`{ "view": <árvore>, "state": {...} }`, renderizado por React + shadcn/ui; feito para MCP Apps/FastMCP,
também REST. Árvore **aninhada** (`children` com o componente inline), não plana. Binding por template
string `{{ name }}` e ternário `{{ c ? 'a' : 'b' }}`; input com `name` escreve no `state` desse nome.
Controle: `Condition` (`cases`/`else`), `ForEach` (`key` = campo do state com a lista, `let` = bindings
escopados), `Form` (gerado de modelo Pydantic). Ações: `SetState`, `SetInterval`, `ShowToast`, `CallTool`,
`Fetch` — o `fetch` é exatamente nosso caso: `{ action:"fetch", url (com {{ }}), method GET|POST|PUT|PATCH|DELETE, headers, body }`.
Todo nó tem `id` e `cssClass` OPCIONAIS; o `id` é o atributo HTML, não uma chave de endereçamento.

```json
{
  "state": { "title": "", "todos": [{ "id": "t1", "title": "Pão" }] },
  "view": { "type": "Card", "children": [
    { "type": "Input", "name": "title", "placeholder": "Tarefa" },
    { "type": "Button", "label": "Adicionar",
      "onClick": { "action": "fetch", "method": "POST", "url": "/todo", "body": { "title": "{{ title }}" } } },
    { "type": "ForEach", "key": "todos", "children": [
      { "type": "Text", "content": "{{ $item.title }}" } ] }
  ]}
}
```
(schemas de `fetch` e `ForEach` verificados; `onClick`, `label`, `content` e `{{ $item.title }}` são **inferidos**.)

## Id estável por elemento (para editar no lugar)

A pergunta: dá para selecionar um elemento na tela, dizer em linguagem natural o que mudar, e patchear
só aquele nó?

| protocolo | id em todo nó? | serve para patch? |
|---|---|---|
| json-render | sim — é a chave do mapa `elements` | sim: o stream já é JSON Patch em `/elements/<id>` |
| A2UI | sim — `id` obrigatório, lista de adjacência | sim: um `surfaceUpdate` com o mesmo `id` substitui o componente; `userAction` já traz `sourceComponentId` |
| Prefab | opcional, e é o `id` HTML | não por construção: árvore aninhada, endereço seria o caminho de índices |
| AG-UI | não há árvore (só estado com JSON Patch) | não |
| MCP Apps / Apps SDK | HTML opaco | não |

Só os dois planos (json-render, A2UI) dão o laço grátis. Para nós: renderizar `data-ui-id="<id>"` em cada
nó no JSX; o clique manda `{ viewId, elementId, feedback }`; o LLM recebe apenas `elements[elementId]`
(mais os filhos e o `data` da view) e devolve o nó novo, validado pelo catálogo. Um id dentro de `repeat`
é o id do MOLDE — editar uma linha edita todas, o que é o comportamento certo.

## 5. Outros

- **OpenAI Apps SDK** (https://developers.openai.com/apps-sdk/build/custom-ux): widget = recurso MCP Apps em iframe; `window.openai` dá `toolOutput`, `setWidgetState`, `callTool`.
- **Thesys C1**: API compatível com OpenAI que devolve spec de componentes React (Crayon) em vez de texto — renderizada pelo SDK deles (não verificado nesta rodada).
- **Vercel AI SDK RSC `streamUI`**: tool devolve componente React no stream; não serializável, sem re-render sem LLM.

## Síntese — o que copiar

1. **Plano, filho por id** (json-render e A2UI concordam; Prefab aninha e perde isso). O LLM gera e corrige por id; o diff do git mostra um nó, não uma árvore reindentada; e o id é o endereço do laço "seleciona → feedback → patch do nó".
2. **Estrutura separada de dado** (A2UI `surfaceUpdate` × `dataModelUpdate`). Para nós: a árvore é artefato persistido; o dado é SEMPRE o resultado da query, nunca literal copiado pelo LLM. Isso é o que torna o re-render determinístico.
3. **A fonte de dado é declarada na spec**: `data: { todos: "SELECT id, title, done FROM todo ORDER BY created" }`. Ninguém em json-render/A2UI faz isso (lá o agente empurra o dado); para um runtime que aprende, a query é parte da view.
4. **Binding por JSON Pointer, uma sintaxe só**: `{ "$data": "/todos" }` na raiz, `{ "$item": "title" }` no repeat. Nada de `$computed`/`$cond` com função — expressão arbitrária quebra o "sem LLM, sem código".
5. **Repeat como `template` + `dataBinding`** (A2UI) / `repeat.statePath` (json-render): lista = um nó molde + um path; o servidor itera no JSX.
6. **Catálogo fechado em zod com `description`**, cada tipo mapeando para UMA função JSX com classes DaisyUI fixas. Validação na entrada: spec inválida é recusada antes de persistir. A mesma description é o prompt.
7. **Ação é dado, não handler**: `{ method, path, data }` com `data` resolvido de campos do form e de `$item` (o `context` do A2UI). O render vira `hx-post="/todo/{id}"` + `hx-vals`; o form nativo manda os inputs pelo `name` (em vez de two-way binding — HTMX não tem estado de cliente). `target`/`swap` opcionais, default re-renderizar a própria view.
8. **Uma raiz nomeada e versão** (`beginRendering.root`, `spec.root`): `{ "v": 1, "root": "page" }`, para que uma view velha seja migrável e não mal-renderizada. Streaming/JSON Patch (AG-UI, json-render) NÃO precisamos agora: a view é emitida uma vez.

```json
{
  "v": 1,
  "root": "page",
  "data": { "todos": "SELECT id, title, done FROM todo ORDER BY created DESC" },
  "elements": {
    "page": { "type": "Card", "props": { "title": "Tarefas" }, "children": ["form", "list"] },
    "form": { "type": "Form", "action": { "method": "POST", "path": "/todo" }, "children": ["title", "add"] },
    "title": { "type": "Input", "props": { "name": "title", "label": "Tarefa", "required": true } },
    "add": { "type": "Button", "props": { "label": "Adicionar", "variant": "primary", "submit": true } },
    "list": { "type": "List", "repeat": { "path": "/todos", "key": "id" }, "children": ["row"] },
    "row": { "type": "Row", "props": { "text": { "$item": "title" }, "checked": { "$item": "done" } },
             "action": { "method": "PATCH", "path": "/todo/{$item.id}", "data": { "done": { "$not": { "$item": "done" } } } } }
  }
}
```
(`$not` é a única expressão que talvez valha; se não, `data: {"toggle": true}` e o servidor decide.)
