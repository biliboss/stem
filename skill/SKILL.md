---
name: stem
description: Operate a running Stem system through its MCP — shape screens, teach routes, feed data in as operations, keep media files, and read what the system already knows. Use whenever the task is to build or change something inside a Stem app (a `<slug>.localhost` with `/_mcp`, e.g. viacorretor.localhost): "pede pro Stem", "manda por MCP", "cria a tela", "ensina a rota", "traz os dados pro app", "mostra o áudio/o documento", "muda a view". Not for editing the framework itself (apps/stem/main.ts) — that is code work.
---

# stem

**A Stem system is changed by talking to it, not by writing its code.** Every screen, route and rule lives in its
database and is made by its own agent over ACP. You reach it through `/_mcp`: you say what a path should become, you
teach what a route means, you send data in as a client would, and the system crystallizes what repeats into programs
that run without a model.

```
you ──MCP──▶ /_mcp ──▶ runtime ──ACP──▶ the system's agent ──▶ view · program · table
                 └── query · request · media · teach · prefer · intent · feedback · gate
```

## Reaching it

The MCP is HTTP, stateless: one JSON-RPC `tools/call` per request, no session.

```sh
curl -s -N -X POST http://<slug>.localhost/_mcp \
  -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"query","arguments":{"sql":"INFO FOR DB"}}}'
```

The answer is a `data:` line of an event stream. Design tools (`intent`, `feedback`) hold the call open for minutes:
run them in the background and read the result when they return.

## The order that works

1. **Read before you write.** `system://schema`, `system://views`, `system://view/{path}`, `system://teachings`,
   `system://capabilities`. A route that already has a program answers in milliseconds; do not re-teach it.
2. **Teach a route before anyone calls it.** `teach` with scope `"POST /zap/messages"` and what it means: the body,
   the table it writes, the answer. Every open page shows the first sentence of that teaching while it runs.
3. **Data from outside enters as an operation**, never as `INSERT` through `query`. POST to the route like a client;
   the body goes under `data` (`{"data": {...}}`), because a crystallized program reads `$data`. The same shape
   twice promotes a program.
4. **Files go through `media`, rows keep the path.** `media {name, url | data}` — `url` may be `http(s)://`, `file://`
   or an absolute path on the machine — stores the file beside the database and answers `/_media/<name>`. Put that
   path in the row. Never put base64 in a row: it rides every page render.
5. **Screens change by `intent` and `feedback`.** `intent {path, intent}` writes a new view; `interactive: true` stops
   at each of the five phases for the owner to choose (`gate`). `feedback {path, target: "page" | element id,
   instruction}` changes what exists. Name the catalog components you want (below) and the exact fields.
6. **Never `accept`.** Acceptance compiles preferences from the owner's journey; it is the owner's gesture.

## The catalog the agent composes from

```
Page Stack Card Heading Text List Row Form Input Textarea Select Checkbox Button Tag Stat Link Split Sidebar
Markdown Mermaid Image Code
Thread{title,subtitle}                       a conversation, full screen, messaging-app dark
Bubble{text,time,mine,author,kind,audio,cost,document,documentName,notice,detected,missed}
Desk (Thread + Aside)  Aside{title,subtitle}  Group{title,meta}  Field{label,value,expected}
```

`audio` and `document` take `/_media/` paths; `document` opens in a pop-up (PDF in the browser viewer, image whole).
`detected` and `missed` are field paths shown as green and red chips under a bubble.

## What costs a turn to learn

- **One author per definition.** Two agents on the same MCP overwrite each other's table and field names in
  silence. Decide who names a route; the other only cites it.
- **`teach` accumulates.** A second teaching of the same scope does not replace the first; open it with
  "VERSÃO FINAL — substitui as anteriores" or read `system://teaching/{scope}` first.
- **A promoted program is not re-taught.** Changing a route's meaning after it crystallized needs the owner's call
  on the program, not another teaching.
- **The server holds design state in memory.** Restarting it mid-design loses the gate; wait for `idle` on
  `/_events` before restarting.
- **`query` refuses the operational tables** (`operation`, `teaching`, `view`, …). Read them through the resources.
