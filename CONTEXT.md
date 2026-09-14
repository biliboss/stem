# apps/stem

## Um sistema que começa em branco e aprende a ser construído

**Um processo, um arquivo de banco e um agente ACP: toda requisição vira operação, o que o sistema
não sabe vai para o agente, e o que se repete cristaliza em algo que roda sem modelo.** A tela, o
backend e o design nascem do uso, e cada correção do dono vira preferência que muda o próximo
rascunho. O que já foi provado, com número, está em `EXPERIMENTS.md`.

```
backend.ts   o runtime: HTTP em qualquer rota, memória no SurrealDB, o Interpreter ACP
view.tsx     a DSL de tela (spec plano + SurrealQL em data) → JSX → DaisyUI 5 + HTMX; o ⌘K, o bootstrap e o /_design
kernel.css   o mundo padrão: tokens, Mona Sans, estados (hover 8% · pressed 16% · disabled no tom a 40%), mídia
kernel.js    o comportamento no browser: Mermaid e imagem com zoom, Markdown, copiar código
.storybook/  o catálogo: os 58 do DaisyUI 5 e os do kernel, no mesmo kernel.css — `pnpm storybook` na 6006
mcp.ts       /_mcp: resources dizem o que existe, tools mudam pelo runtime, prompts versionam o ofício
caddy.ts     --slug publica como <slug>.localhost pela admin API do Caddy
acp.ts       o cliente ACP de linha de comando (caps · list · daemon), e o Agent que o runtime usa
experiments/ um script rerodável por hipótese, e o bruto em results/
```

```
cd apps/stem/.run/<slug> && ../../../../node_modules/.bin/tsx ../../backend.ts --new --slug <slug> --tools mcp
claude mcp add --transport http --scope local system http://<slug>.localhost/_mcp
```

## A resolução, do mais barato ao mais caro

```
GET text/html  view guardada → render com a query (3 ms) · sistema vazio → bootstrap · senão agente desenha
outra rota     capability estática → program promovido (20 ms) → learning → agente
/_intent /_feedback /_accept   a tela e o MCP fazem os mesmos três gestos
```

- Um `program` é a SurrealQL que o agente devolve junto da resposta; a mesma SQL duas vezes para a mesma rota promove, e SQL que quebra rebaixa. Duas escritas iguais provam consistência, não correção.
- Uma view só é salva com toda query rodando e todo filho existindo: o erro volta ao agente na mesma sessão. Query quebrada numa view já salva aparece como alerta, nunca como lista vazia.
- A operação recebe as queries das telas (`screens`) como contrato: é assim que o agente grava a tabela e os campos que a view lê.

## O que custou descobrir

- **Sessão limpa por tarefa, e fechada no fim.** Design, compilação e juiz abrem sessão nova — senão o controle de um experimento vê o contexto do tratamento — e cada sessão aberta é um processo `claude` vivo até o `closeSession`.
- **Só a sessão compartilhada entra em fila.** Um designer que chama `request` gerava uma operação esperando atrás de si mesma: 300 s e `fetch failed`. Sessão de design só lê (`query` e resources).
- **O texto da resposta é por sessão.** Sessões limpas rodam em paralelo, e um buffer único mistura as respostas.
- **`allowedTools` desliga o `canUseTool`** (`CLAUDE_SDK_CAN_USE_TOOL_SHADOWED`): o `requestPermission` do cliente não vê essas chamadas. A gravação de tool call mora dentro do `/_mcp`.
- **`settingSources: []` na sessão do runtime**, senão o output style do dono vaza para o JSON.
- **`fetch` leva 403 da admin do Caddy** (undici manda `sec-fetch-mode: cors`); `node:http` passa.
- **SurrealDB:** `ORDER BY` exige o campo no SELECT; tabela inexistente é erro, não lista vazia; record id volta como `"table:id"`.
- **`changed` chega depois de `idle`:** a view é salva depois do turno do agente, então a página recarrega no `changed` quando já não há trabalho.
- **Experimento roda em sistema próprio**, nunca no app que o dono está usando: a H3 criou e concluiu tarefas no `tarefas` de verdade.
- **Program só vale se casar com uma ação de alguma tela do design**, inclusive as de template: o `adopt` que só olhava a home descartou o "adicionar tarefa" do cadernos, e o agente respondeu cada clique.
- **Regex dentro do `<script>` do Shell perde as barras** (é um template literal TS): compare por segmento, ou dobre os escapes.
- **Safari sonda `apple-touch-icon*` sozinho**: rota que não é operação responde 204 antes de virar pedido ao agente.
- **O Storybook (polished) quebra com `oklch`** no tema do manager: tela em branco. Hex ali.
- **`--experimental-strip-types` não aceita `namespace` nem parameter properties**; os `.tsx` e o `backend.ts` rodam por `tsx`.
