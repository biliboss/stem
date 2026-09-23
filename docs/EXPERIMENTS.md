---
title: Experiments
description: "apps/stem — experimentos"
---

**Cada hipótese tem uma pergunta, uma medida que decide e um script que qualquer agente
reroda.** O resultado bruto mora em `experiments/results/`, uma linha JSON por execução; esta
folha guarda o veredito e o que ele mudou na próxima hipótese. Uma hipótese que caiu fica
escrita aqui, com o porquê: o log do git mostra que o código mudou, não que acreditávamos
noutra coisa.

## H1 — a preferência compilada de uma jornada melhora o primeiro rascunho de outra

A landing do Navalha recebe 5 correções abstratas ("cara de SaaS demais", "caixa demais") e é
aceita; o `/_accept` compila as preferências. Depois, para Lavô, Sorriso e Forja, uma sessão
ACP limpa escreve o rascunho sem preferências (controle) e outra com elas (tratamento), e uma
terceira sessão limpa julga as duas às cegas, em ordem sorteada.

- medida: `first_draft_preference_compliance` do juiz, controle contra tratamento, por produto
- isolamento: sessão nova por tarefa; só a tabela `preference` atravessa (commit do `run(…, fresh)`)
- script: `experiments/h1-preference-transfer.sh` · bruto: `experiments/results/h1-2026-09-14.log`
- **veredito 14/09: passou, com ressalva de medida**

| produto | controle | tratamento | ordem sorteada |
| --- | --- | --- | --- |
| Lavô | 1/14 | 14/14 | tratamento era A |
| Sorriso | 1/14 | 14/14 | tratamento era A |
| Forja | 2/14 | 14/14 | tratamento era B |

Na captura do Lavô, o controle tem badge, três Stats de vaidade ("0 lavanderias", "0%"), três
Cards de passo e uma lista longa; o tratamento tem um hero de duas frases, um único bloco de ação
com dois campos pareados, seções de rótulo muted e o rodapé de uma linha. A compilação saiu no
nível 2: nenhuma das 5 correções dizia "card", "badge" ou "gap", e 13 das 14 regras falam de DSL
e copy aplicáveis a outra página.

As ressalvas, que decidem a próxima rodada da H1:

- 14/14 é teto demais para ser prova. O juiz marca como cumprida uma regra que não se aplica
  (a `path:/navalha` do rodapé), e metade das regras é literal o bastante para o tratamento
  copiar sem entender. Uma rodada honesta pontua só regras aplicáveis e mistura preferências
  falsas, que o tratamento NÃO deveria seguir.
- O rodapé "feito para X de bairro, não para Y" vazou para os três produtos, embora a regra
  fosse de escopo `path`. O agente generalizou o que o escopo dizia para não generalizar.
- N=1 por produto, e o juiz é um LLM lendo o spec. Falta um humano julgando a tela às cegas.

Achados no caminho:

- A primeira rodada usava UMA sessão ACP para tudo: o controle já tinha visto as correções no
  contexto. Invalidada antes de medir.
- `turns_to_accept` deu 5 e `corrections_to_accept` 4 para 5 correções feitas: um feedback que
  só mudou tokens não cria `view`, e a contagem lia views. Defeito da medida, não do sistema.
- Um design de sessão limpa leva 17–92 s (a sessão compartilhada levava 8–20 s): contexto frio
  custa tempo, e esse é o preço do isolamento.

## H2 — o `/_mcp` faz um agente limpo descobrir estado melhor que respostas `{"query"}`

Um sistema recebe 3 itens numa tabela que ninguém descreveu (`catalogo_item`), e o intent pede
"a vitrine dos produtos que já estão cadastrados". O agente só acerta lendo o schema.

- medida: `seeded_seen` = 3 na página renderizada (passou), `seconds`, `turns`, `tool_calls`
- controle: `--tools json`; tratamento: `--tools mcp`; N=3 cada
- script: `experiments/h2-mcp-vs-json.sh` · bruto: `experiments/results/h2-2026-09-14.jsonl`
- **veredito 14/09: descobrir, os dois descobrem; o MCP é mais confiável e mais caro. Inconclusivo em N=3.**

| modo | passou | segundos | turnos | tool calls |
| --- | --- | --- | --- | --- |
| json | 2/3 | 58 · 54 · 57 | 3 · — · 3 | 0 |
| mcp | 3/3 | 64 · 78 · 72 | 1 | 10 · 13 · 11 |

A falha do json não foi de descoberta: o agente respondeu dois objetos JSON seguidos e o
`Interpreter.parse` (primeiro `{` ao último `}`) não conseguiu ler. É defeito do protocolo de
texto, e é exatamente o que um tool call tipado elimina. Com MCP o agente fez 10–13 chamadas para
o que o json fez em 2 queries: lê resource por resource, e isso custa ~20% de tempo.

O achado que importa mais que o placar: o SDK avisou `CLAUDE_SDK_CAN_USE_TOOL_SHADOWED` —
colocar as tools em `allowedTools` desliga o `canUseTool`, então o nosso `requestPermission`
nunca vê essas chamadas. O portão de proveniência que a H2 supunha não existe nesse modo; a
gravação de cada tool call precisa acontecer DENTRO do `/_mcp`, não no callback do cliente.

## H3 — uma operação com estado cristaliza em programa, e o modelo sai do caminho

Junto da resposta, o agente devolve `program`: a rota com parâmetros (`/todos/{id}/complete`) e a
SurrealQL que ele acabou de fazer à mão. Quando escreve a MESMA SQL duas vezes para a mesma rota, o
programa é promovido; a próxima chamada roda a SQL direto. Se ela quebrar, volta a candidato.

- medida: quem resolveu e em quanto tempo, por chamada; a página ainda mostra toda linha nova
- script: `experiments/h3-programs.sh` · bruto: `experiments/results/h3-2026-09-14.log`
- **veredito 14/09: passou.**

| operação | 1ª (agente) | 2ª (agente, promove) | 3ª em diante (programa) |
| --- | --- | --- | --- |
| `POST /todos` | 15,5 s | 6,5 s | 0,020 s · 0,020 s |
| `POST /todos/{id}/complete` | 6,0 s | 7,4 s | 0,020 s |

A página mostrou 4/4 linhas criadas pelo programa, então ele grava o que as telas leem. As SQLs
promovidas: `CREATE todo CONTENT { title: $data.title, done: false, created_at: time::now() }` e
`UPDATE type::record($id) MERGE { done: true, completed_at: time::now() }`. O `completed_at` não
existia antes: nasceu porque a view pediu a data de conclusão e a operação recebe as queries das
telas como contrato.

Ressalvas: duas escritas iguais provam consistência do agente, não correção — um programa errado
escrito duas vezes vira determinístico errado, e hoje só o erro que QUEBRA rebaixa. Falta o replay
que compara programa e agente sobre as operações gravadas. E a chave é método + rota: um `accept`
diferente, ou uma instrução nova no corpo, ainda cai no programa sem perguntar.

## H4 — quem desenha a tela escreve os programas, e o primeiro clique já é determinístico

O designer escreveu as queries de leitura da view, então ele mesmo escreve as de escrita: um
`program` por ação declarada, adotado já promovido. A mesma guarda da H3 vale — o primeiro erro rebaixa
e o agente responde.

- medida: quem resolveu cada clique num sistema zerado, e se a view renderiza sem query quebrada
- sistema próprio (`tarefas-lab`), nunca o app do dono · script: `experiments/h4-design-programs.sh`
- **veredito 14/09: passou.** intent 51 s; `add #1` **19 ms** por programa, `add #2` 18 ms,
  concluir 17 ms, página com 2/2 e sem alerta. O designer entregou três programas — criar, concluir
  e reabrir — coerentes com as próprias leituras (`created`, `completed`).

Isto substitui a H3 como caminho padrão: o agente de operação vira o fallback de rota que nenhuma
tela declarou. Continua valendo a ressalva da H3 — programa escrito não é programa provado; um
UPDATE errado que não quebra passa.

## H5 — o programa promovido concorda com o agente que o escreveu

O H4 fez do programa o caminho padrão, e hoje só o programa que QUEBRA é rebaixado: uma SQL
errada que roda escreve dado errado e ninguém vê. A H5 reexecuta cada operação já gravada contra
o programa promovido, numa CÓPIA do banco, e compara o estado resultante com o que o agente
produziu. Era a H3b da lista de próximas; virou hipótese numerada porque agora tem medida.

- medida: `divergences` por operação — campo que difere entre o estado do agente e o do programa,
  ignorando `time::now()`; um programa só vale se diverge zero em todas
- controle POSITIVO: um `MERGE` plantado errado (um campo trocado) tem de ser DETECTADO; um
  harness que não acha o erro plantado não mediu nada, e zero divergência dele não é prova
- isolamento: cópia do `.skv`, nunca o banco de um sistema do dono · N ≥ 10 operações reais
- script: `experiments/h5-replay.sh` · bruto: `experiments/results/h5-<data>.jsonl`
- **veredito: em aberto**

## Próximas, em ordem

- **H6** — prompts versionados no banco tornam uma `execution` reexecutável: mesmo prompt@versão
  e mesmo estado de entrada dão uma view equivalente. Medida: diff estrutural entre os specs.
  Era H4 na lista, nome que o veredito de 14/09 já usava.
