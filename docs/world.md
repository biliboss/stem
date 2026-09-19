# O mundo do Stem: primitivas, eventos e o laboratório

**O Stem primeiro constrói um mundo onde os agentes e o dono vivem e interagem, e só depois pluga esse mundo no
real.** O que se testa no laboratório entra no sistema exatamente como entraria de fora, então comutar para o
adaptador real não muda nada acima dele. Registrado em 14/09 a partir do que o dono disse; nada aqui está
construído, é a direção.

## Dois arquivos, um banco por app

O framework é um arquivo (`stem.ts`) e cada aplicação é outro (`<app>.ts`) que o estende: importa o `Stem`, se
declara e roda sozinha. O agente ACP escreve em exatamente dois lugares, e cada um guarda uma coisa.

```
agente ACP ──▶ <app>.ts     definição: telas, programas, schema, seed, preferências
   └──────▶ <app>.skv       linhas: o SurrealDB embutido só daquele app
```

Um banco por app só vale quando as tools de fato do agente-produto gravam nele: hoje o pipi grava notas e contrato
no `db.sqlite` do tenant, e o `agents.md` diz o que fecha isso.

## Muitas primitivas para compor

O framework e o agente recebem primitivas pequenas, e um app é composição delas, nunca código que só ele tem.
A lista não está fechada; a regra é que uma primitiva nasce quando dois usos a pedem.

## Produtores e consumidores

**Tudo que importa ao sistema é um evento, e as duas pontas se chamam produtor e consumidor.** Vale nos dois
níveis: na construção do próprio Stem (fase aceita, tela salva, preferência registrada) e dentro dos apps que
ele constrói (mensagem recebida, tarefa criada). O conceito vem antes da implementação.

```
produtor ──▶ evento ──▶ consumidor
  canal real            tela
  simulador             programa cristalizado
  o dono na tela        agente ACP
  o agente ACP          outro app
```

A sequência de eventos É a linha do tempo: quem precisa saber "como era antes" lê os eventos, não pede ao banco
uma versão passada.

## O adaptador duplo

**O runtime fala só com a interface do canal e não sabe se do outro lado está o real ou o simulado.**

```
            ┌─ sandbox: rede artificial com estado — entrega, leitura, atraso, falha
interface ──┤
            └─ live: a API de verdade (hoje, libs/social/whatsapp e o apps/zap)
```

No sandbox dá para rodar replay, treinar preferências e depurar um fluxo inteiro sem efeito real.

## O primeiro caso: o WhatsApp da Mel

```
/_zap-simulator/mel       o WhatsApp dela: lista de contatos, conversas
/_zap-simulator/gabriel   em outra aba, um corretor
```

Cria-se os dois, um entra na lista de contatos do outro, e eles conversam pelo simulador. As mensagens trafegam
por um barramento simulado e chegam ao sistema como chegariam do WhatsApp real.

## O que foi medido do SurrealDB embutido

`dev/surreal-probe/engines.ts`, em 14/09, com `@surrealdb/node` 3.0.3, no Node e no Bun 1.3.9:

```
                       grafo  full-text BM25  vetor HNSW  VERSION (time travel)
mem://                   ok        ok             ok        ok
surrealkv://             ok        ok             ok        falha: o store não versiona
rocksdb://               ok        ok             ok        falha: o store não suporta
surrealkv+versioned://   não respondeu em 40 s no Bun
live query               falhou nos quatro — provável uso errado da API na sonda, não verificado
```

Time travel em disco não saiu, e é por isso que a linha do tempo mora nos eventos.
