# apps/stem — a porta, e a casca que ela devolve no milissegundo 0

**`GET /?_meta=<o que este endereço É>` tem de responder AGORA, com a casca do
que vai existir, e não em sete minutos com a tela pronta.** Medido em 22/09 num
sistema em branco: um único GET com `_meta=Create a landing page for a doctor`
devolveu 200 em **422,1 s** com 77 KB — a landing da "Dra. Helena Moraes", com
CRM, cinco atendimentos, convênios e form de agendamento, aceitável sem uma
segunda requisição. O defeito não é a tela, é a espera.

## A casca já existe, e quem declarou é o único que não a recebe

Um GET que chega enquanto o agente desenha recebe `View.BOOTSTRAP` com a pílula
de rascunho — `by: "designing"`, em `stem.ts:2932`, escrito exatamente para não
"held the request open for minutes". Quem DECLAROU não passa por ali: a linha
2884 faz `await declare(match, text, html)` antes de `page(match.path)`, e
`declare` só volta quando o desenho salvou a view.

Então a correção é uma: na requisição HTML, `declare` dispara e NÃO é esperado.
O declarante entra em `page()` no mesmo instante, cai no ramo `designing` que já
está lá, e o Pulse preenche. Nada de casca nova, nada de rota nova.

```
GET /?_meta=Create a landing page for a doctor
  ├─ agora      200 · x-resolved-by: designing · a casca + SSE aberto
  ├─ 0–7 min    fase 1 de 2 no dock, o rascunho que o dono corrige
  └─ pronto     x-resolved-by: view · a tela substitui a casca
GET /  (depois, sem _meta)
  └─ 3,5 ms     x-resolved-by: cache (memory) — a MESMA tela, byte a byte
GET /  (sistema em branco)
  └─ 6 ms       x-resolved-by: bootstrap — a tela que pede a declaração
```

## Três respostas, e nenhuma quarta

`bootstrap` quando nada foi declarado, `view` quando foi, `cache` quando já está
montada — mais `designing`, que é a casca de `bootstrap` com a pílula. O `_meta`
é declaração, não ordem: por isso o segundo GET não roda o agente de novo, e o
endereço continua significando o que foi declarado.

O 404 prometido em `stem.ts:6` NÃO é o que roda hoje, e a medida diz por quê:
num sistema em branco `/` cai em `bootstrap` (`memory.empty()`), e qualquer outro
endereço cai em `designing` enquanto `Pulse.working > 0`. Medido: `/nada-declarado`
devolveu 200. O 404 só sobra para quem pede endereço inexistente com o agente
parado — e isso é uma pergunta própria, não desta folha.

## As três primitivas, e a terceira é a que dispensa o modelo

**Declarar, fazer, cristalizar — e nada além.** Um `POST /customer` com corpo e
sem rota não é erro: a operação é gravada (`memory.record`), o agente resolve o
que ninguém compilou, e `?_meta=<prompt>` numa requisição não-HTML entra como
TEACHING do escopo `POST /customer`. A última declaração é a regra, e a chamada
seguinte sem `_meta` continua com aquele sentido.

| primitiva | o gesto | o que acontece | medido |
| --- | --- | --- | --- |
| declarar | `_meta=<o que este endereço É>` | na página desenha; fora dela vira teaching do escopo | 422 s na porta, 22/09 (esta folha) |
| fazer | `POST /customer` + body | operação gravada, e o agente resolve o que não existe | 15,5 s na 1ª · H3, 14/09 |
| cristalizar | a MESMA SQL duas vezes na mesma rota | promove o programa, e a chamada seguinte dispensa o agente | 6,5 s na 2ª · 0,020 s da 3ª · H3 |

Quando quem desenha a tela escreve os programas junto, a primitiva 3 não espera
as duas escritas: o primeiro clique já sai determinístico, medido em **19 ms**
(H4, 14/09). O veredito das duas mora em `docs/EXPERIMENTS.md`; aqui fica só o
ponteiro, senão são dois lugares dizendo o mesmo número.

**A borda afiada é a chave do programa: hoje ela é método + rota.** Um
`POST /customer` com corpo de outra forma, ou com uma instrução nova no body,
cai no programa promovido sem perguntar — e um programa errado que NÃO quebra
nunca é rebaixado. É a H5 de `docs/EXPERIMENTS.md`, e ela ainda não rodou.

## O custo, para quem for decidir

2 runs, 2 turnos, 13 tool calls, **US$ 0,594**, ciclo somado 120 s contra 422 s
de parede. Os 300 s de diferença o `Metrics` não conta, e ninguém sabe onde eles
estão: é o primeiro número a perseguir depois da casca.
