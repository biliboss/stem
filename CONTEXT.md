# apps/stem

## Um sistema que começa em branco e aprende a ser construído

**Um processo, um arquivo de banco e um agente ACP: toda requisição vira operação, o que o sistema
não sabe vai para o agente, e o que se repete cristaliza em algo que roda sem modelo.** A tela, o
backend e o design nascem do uso, e cada correção do dono vira preferência que muda o próximo
rascunho. O que já foi provado, com número, está em `docs/EXPERIMENTS.md`; o resto do porquê, em `docs/`.

**Um arquivo, `main.ts`, e o outline dele é o desenho.** Roda em Bun com Hono na frente. Ele é também
biblioteca: um `<app>.ts` vai importá-lo, e o Storybook importa `View` e `Kernel` num browser — por isso nada no
nível do módulo toca Node ou Bun (builtin por `process.getBuiltinModule` na hora da chamada, o motor nativo do
SurrealDB por `import()`), e a CLI só roda sob `import.meta.main`.

```
namespace Html        h · escape — o que o JSX compilava, sem JSX
namespace Kernel      css · js, duas strings: tokens, Mona Sans, estados, wireframe, a dobra, zoom, o toggle `o`
namespace View        Spec · Element · Action · Binding · Catalog · render · Shell · BOOTSTRAP · DESIGN_SYSTEM
namespace Acp         Agent (spawn do claude-agent-acp por stdio) · Commands (caps · list · daemon)
namespace Caddy       publish/unpublish <slug>.localhost pela admin API
namespace Mcp         SystemPort · SystemMcp: /_mcp no transporte web-standard do SDK
namespace Metrics     o que o trabalho CUSTOU, só aritmética: cycle · lead · turns · tool_calls · dólares
class Memory          o SurrealDB embutido e a COSTURA: define() escreve definição, app() linha, query() o log
  namespace Memory    Match · Behavior · Program · Resolution · address() · jsonSafe()
const Pulse           SSE, drafts, gates e phases; sobrevive ao `bun --hot` em globalThis
class Interpreter     o agente ACP: PHASES · design() · resolve() · compile() · judge()
namespace Server      serve() e app(): o Hono com cada rota, na ordem em que o pedido as encontra
namespace Cli         serve [<app>.ts] · acp caps|list|daemon — todos exigem --account <nome>
function main()
.storybook/           o catálogo: os 58 do DaisyUI 5 e os do kernel — `pnpm storybook` na 6006
docs/                 os experimentos e as pesquisas; experiments/ tem os scripts e o bruto
```

```
just stem::self <account>         stem.localhost, o sistema que gerencia os OUTROS: banco em ~/.stem/system.skv
cd apps/stem/.run/<slug> && bun ../../main.ts serve --new --slug <slug> --tools mcp --account personal
--account <nome>                  qual assinatura Claude paga o agente; sem default, sem ele o comando pergunta.
                                  `personal` vem de fábrica; o resto entra por STEM_ACCOUNTS="nome=~/.claude-nome"
bun --hot ../../main.ts serve …   Kernel e View mudam no reload sem reiniciar um design em curso
claude mcp add --transport http --scope local system http://<slug>.localhost/_mcp
```

## O agente tem UM lugar na tela, e é o canto inferior direito

**O `#agent` empilha o que o agente está fazendo e o que ele pede do dono, sempre no mesmo canto.** Antes, a
operação lia no canto inferior ESQUERDO enquanto o `✓ aceitar` ficava no direito, e numa página sem view ainda
oferecia aceitar o que não existe. O `#working` virou só o véu; o dock fica ACIMA dele, nítido sobre o blur.

- O aceitar some enquanto o agente trabalha, e não é desenhado quando a resolução foi `bootstrap` ou `designing` — nos dois a tela está em branco e não há versão para fechar.
- A régua do estúdio divide o mesmo canto (`bottom: 1.5rem`), porque o aceitar está escondido enquanto ela existe.

## Duas fases: entender, e a tela

**`Interpreter.TOTAL = 2` e `GATE_FROM = 1`: o dono lê o que vai existir, corrige ali — o lugar barato de estar
errado — e o que volta é a tela pronta.** Planejar, pensar a UX e esboçar eram três leituras cobradas antes de
qualquer coisa que ele pudesse julgar, e cada uma gastava um turno do agente.

- A numeração sai do `TOTAL`, nunca escrita à mão: os prompts diziam "of 5" e teriam mentido no primeiro corte.
- A régua do estúdio se dimensiona sozinha (`grid-auto-flow: column`), então mudar o número de fases não deixa coluna vazia.
- As fases não paradas continuam gravadas por `keep()`, senão o replay não teria em que se apoiar.

## A tela não recebe ordens: o MCP é a única porta

**O ⌘K, o diálogo de feedback, o modo de edição e o `✓ aceitar` saíram da página: todo gesto entra pelo `/_mcp`,
tanto o que o dono começa quanto o que o agente ACP executa ao vivo na tela.** Duas portas para o mesmo gesto é
onde as duas divergem; o que sobra na tela é leitura — a dobra, a régua, o rascunho e o dock do agente.

Ficam só dois toques: `g d` abre o design system e `o` contorna as componentes. Nenhum dos dois muda o sistema.

- A tela em branco IMPRIME a linha que abre a porta (`claude mcp add … <origem>/_mcp`), preenchida no cliente com o `location.origin`.
- A dobra que espera vira instrução, não campo: `gate {path, continue | revise}` pelo MCP.
- O SSE, o `develop()` e o `paintDraft()` ficam inteiros: é por eles que o agente desenha ao vivo.

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
- **`fetch` levava 403 da admin do Caddy sob Node** (undici manda `sec-fetch-mode: cors`). Sob Bun 1.3.9 o mesmo GET por `fetch` deu 200 em 14/09, e é por isso que `Caddy.admin` usa `fetch`: voltar para Node devolve o 403.
- **SurrealDB:** `ORDER BY` exige o campo no SELECT; tabela inexistente é erro, não lista vazia; record id volta como `"table:id"`.
- **`changed` chega depois de `idle`:** a view é salva depois do turno do agente, então a página recarrega no `changed` quando já não há trabalho.
- **Experimento roda em sistema próprio**, nunca no app que o dono está usando: a H3 criou e concluiu tarefas no `tarefas` de verdade.
- **Program só vale se casar com uma ação de alguma tela do design**, inclusive as de template: o `adopt` que só olhava a home descartou o "adicionar tarefa" do cadernos, e o agente respondeu cada clique.
- **Regex dentro do `<script>` do Shell perde as barras** (é um template literal TS): compare por segmento, ou dobre os escapes.
- **Safari sonda `apple-touch-icon*` sozinho**: rota que não é operação responde 204 antes de virar pedido ao agente.
- **O Storybook (polished) quebra com `oklch`** no tema do manager: tela em branco. Hex ali.
- **O Bun corta conexão ociosa em 10 s**: sem `idleTimeout: 0` no `Bun.serve`, o `/_events` e um `/_intent` de minutos morrem calados. Medido em 14/09: o SSE aberto por 14 s recebeu o `draft` emitido aos 12 s.
- **O `claude-agent-acp` REPORTA custo**, num `sessionUpdate` de tipo `usage_update` com `used`, `size` e `cost: {amount, currency}` — e o que ele manda é o TOTAL CORRIDO da sessão, não o do turno. Por isso `turns()` guarda a linha de base na entrada e devolve a diferença; o `execution` passou a gravar `turns`, `tool_calls` e `cost_usd` ao lado do `duration_ms`, que era tudo o que sobrevivia.
- **As ferramentas do MCP chamam o runtime em processo** (`hono.request`), não por HTTP: um design leva minutos, e o `fetch` do undici derrubava a resposta em 300 s.
- **O `main.ts` não tem JSX** porque é `.ts`: o `h()` é chamado direto. O HTML saiu byte a byte igual ao do antigo `view.tsx` (123.933 bytes em quatro renders, 14/09).
