---
title: Tech stack
description: What Stem runs on, and why each piece was chosen over its neighbor.
---

**One process, one database file, one agent: Bun runs `stem.ts`, Hono routes,
an embedded SurrealDB remembers, and the agent is reached over ACP.** Every
piece below was picked because it keeps that sentence true.

```
runtime      Bun 1.3.9                 one binary; runs TypeScript as is
HTTP         Hono                      Server.app(): routes in precedence order
memory       SurrealDB, embedded       @surrealdb/node; RocksDB for new apps
agent        ACP                       @agentclientprotocol/sdk 1.4 · claude-agent-acp
agent tools  MCP, internal             /_mcp on the web-standard transport; zod schemas
screens      DaisyUI 5 · Tailwind 4    CSS classes from a CDN, no build
interaction  HTMX 2                    server HTML swapped in place
type         Mona Sans                 @fontsource-variable, from a CDN
addresses    Caddy admin API           <slug>.localhost, optional
catalog      Storybook                 the 58 DaisyUI components + the kernel's, :6006
tests        bun test                  tests/apps/stem/, `just stem::test`
```

## Why these

- **Bun, not Node.** It runs `stem.ts` directly and serves the event stream
  without extra wiring. Its `fetch` also passes Caddy's admin API, where Node's
  undici gets a 403 (measured 14/09). Its one trap: idle connections close at
  10 s, so `serve` passes `idleTimeout: 0`.
- **Hono.** Declaration order is precedence, which makes the resolution ladder
  readable in one function: kernel `/_*` routes, then app routes, then memory.
- **SurrealDB, embedded.** Documents, graph, full-text and vectors in one file
  next to the app, with no server. **RocksDB** is the engine for new apps since
  23/09; a folder that already has a `system.skv` keeps opening it on
  `surrealkv`, because the same path under another engine opens empty. Time
  travel works on neither engine on disk, so the timeline lives in events.
- **ACP.** The app is an ACP client and spawns the agent over stdio, so any
  harness with an adapter can be the builder. Sessions are fresh per task and
  closed at the end; cost arrives as `usage_update` and is recorded per run.
- **DaisyUI + HTMX.** Pure CSS survives an HTMX swap; a component library with a
  runtime does not. No build step means the page's `<head>` is the whole
  frontend toolchain.
- **No JSX.** `stem.ts` is a `.ts` file that also loads in a browser (Storybook
  imports `View` and `Kernel`), so `Html.h` is called directly and nothing at
  module level touches Node or Bun.

## Where it runs today

| where | how |
| --- | --- |
| local | `bun apps/stem/stem.ts serve --new --account <name>` in an app folder |
| `stem.localhost` | `just stem::self <account>`, database in `~/.stem/system.skv` |
| production | `via-app` on the VPS: `projects/viacorretor/Dockerfile.via-app`, `--no-agent`, port 5312, `--db surrealkv:///data/system.skv` |
| public repo | `just stem::export`: a `git subtree split` of `apps/stem` to `biliboss/stem` |
