---
name: stem
description: Operate a running Stem system through its MCP — shape screens, teach routes, feed data in as operations, keep media files, and read what the system already knows. Use whenever the task is to build or change something inside a Stem app (a `<slug>.localhost` with `/_mcp`, e.g. viacorretor.localhost): "pede pro Stem", "manda por MCP", "cria a tela", "ensina a rota", "traz os dados pro app", "mostra o áudio/o documento", "muda a view". Not for editing the framework itself (apps/stem/stem.ts) — that is code work.
---

# stem

**A Stem system is changed by talking to it, not by writing its code.** Every screen, route and rule lives in its
database and is made by its own agent over ACP. You reach it through `/_mcp`: you say what a path should become, you
teach what a route means, you send data in as a client would, and the system crystallizes what repeats into programs
that run without a model.

```
you ──MCP──▶ /_mcp ──▶ runtime ──ACP──▶ the system's agent ──▶ view · program · table
                 └── meta · query · request · media · teach · prefer · intent · gate
```

## Bringing one up

A slug that nobody started answers nothing. The instance is a directory under `.run/`, and the process must outlive
the session that launched it — a background task of the agent's own shell dies with it, `SIGTERM`, `exitCode: 143`.

```sh
mkdir -p apps/stem/.run/<slug> && cd apps/stem/.run/<slug>
nohup bun ../../stem.ts serve --new --no-open --slug <slug> --tools mcp --account <account> \
  > /tmp/stem-<slug>.log 2>&1 < /dev/null & disown
```

`setsid` does not exist on macOS: `nohup … & disown` is the detach that works. The log's last two lines are the
proof — `stem on :<port>` and `published http://<slug>.localhost/`. Watch for them instead of sleeping.

## Reaching it

The MCP is HTTP, stateless: one JSON-RPC `tools/call` per request, no session.

```sh
curl -s -N -X POST http://<slug>.localhost/_mcp \
  -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"query","arguments":{"sql":"INFO FOR DB"}}}'
```

The answer is a `data:` line of an event stream. Design tools (`meta`, `intent`) hold the call open for minutes:
run them in the background and read the result when they return.

Register it as a server and the ten tools arrive as `mcp__system__*` — the name is always `system`, which is what
this skill's instructions assume:

```sh
claude mcp add --transport http --scope local system http://<slug>.localhost/_mcp
```

**Always `http://`, never `https://`.** Caddy fronts these hosts with its local CA, which Node does not trust:
`https` registers but fails with `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`. The root `/` answers `308` to `https`, but
`/_mcp` and `/_media/` do not redirect, so plain `http` reaches them. The tools only appear after the session
reloads its MCP config.

## The order that works

1. **Read before you write.** `system://schema`, `system://views`, `system://view/{path}`, `system://teachings`,
   `system://capabilities`. A route that already has a program answers in milliseconds; do not re-teach it.
2. **Teach a route before anyone calls it.** `teach` with scope `"POST /zap/messages"` and what it means: the body,
   the table it writes, the answer. Every open page shows the first sentence of that teaching while it runs.
3. **Data from outside enters as an operation**, never as `INSERT` through `query`. POST to the route like a client;
   the body may be the record itself (`{"name": …}`) or under `data`; the kernel wraps a bare body in `data`, because a crystallized program reads `$data`. The same shape
   twice promotes a program.
4. **Files go through `media`, rows keep the path.** `media {name, url | data}` — `url` may be `http(s)://`, `file://`
   or an absolute path on the machine — stores the file beside the database and answers `/_media/<name>`. Put that
   path in the row. Never put base64 in a row: it rides every page render. `media` is for what a page *shows*, not
   for what a page *loads* — see the MIME entry below.
5. **`meta` is the only door.** `meta {path, text, method}` declares what an address IS, and the declaration is
   kept: a page with no view gets designed, one that exists gets edited, any other method gets a backend and a
   program. `meta {path, text: ""}` reads the declaration back. A request with no `_meta` never wakes the agent —
   an address nobody declared answers 404 on purpose. Use `intent` only when the owner wants the phase gates
   (`interactive: true`, then `gate`). Name the catalog components you want (below) and the exact fields.
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
- **`/_media/` serves everything as `application/octet-stream`.** A stylesheet stored there is refused by the
  browser — *"strict MIME checking is enabled"* — so `<link rel="stylesheet" href="/_media/x.css">` silently does
  nothing. CSS and JS belong inlined in the view; `/_media/` is for audio, documents and images, which sniff fine.
- **A design system is a `SYSTEM ` teaching, with the values inside it.** Scope `"SYSTEM "` (trailing space) is the
  law every view inherits. Carry the tokens themselves, not a path to them: a `:root` block the view embeds, the
  state matrix each control must implement, and the contrast floor. The values freeze at the moment you teach —
  when the source package moves, re-teach the scope opening with "VERSÃO FINAL — substitui as anteriores".
- **HTTP/2 hangs on these hosts.** `curl https://<slug>.localhost/` completes the TLS handshake, negotiates h2 and
  then returns `000` on timeout. `--http1.1` answers `200`. Only page fetches are affected; `/_mcp` over `http` is
  fine.
