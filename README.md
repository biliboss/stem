# Stem

**A system that starts blank and learns to be built.**

Every framework hands you the beginning: a scaffold, a route, a migration, and
you walk from there to a product. Stem hands you the end. You look at the
system running and correct it; there is no phase called development.

One process, one database file, one ACP agent. Every request becomes an
operation. What the system does not know goes to the agent. What repeats
crystallises into something that runs without a model.

## How a request resolves

From cheapest to most expensive. The agent is not called per request — it is
called when a *shape is missing*.

| step | cost | what it is |
|---|---|---|
| stored view | ~3 ms | the answer this system already knows how to give |
| static capability | — | what the route declares without a model |
| promoted program | ~20 ms | what repeated often enough to become code |
| learning | — | observed, not yet crystallised |
| the agent draws | seconds | the only step that invents |

Once a shape exists, serving it costs no inference. That is the whole bet: if
the curve of model-cost-per-request flattens, Stem is software. If it never
flattens, it is an expensive chat with a database.

## Quick start

Requires [Bun](https://bun.sh).

```bash
bun main.ts serve --new --slug hello --tools mcp --account <name>
```

`--account` says which Claude subscription pays the agent. There is no
default on purpose: a wrong account is invisible until it shows up on an
invoice.

The system comes up on `hello.localhost`, empty. Ask it for something through
the MCP door and it draws the first screen.

## The screen takes no orders

The UI never receives commands. The only way in is MCP:

```bash
claude mcp add --transport http --scope local system http://hello.localhost/_mcp
```

Three gestures, and the screen and the MCP client make the same three:
`/_intent` says what you want, `/_feedback` corrects what came back,
`/_accept` freezes it.

## One file

The framework is `main.ts`, and its outline is the design. This is not
minimalism — it is the constraint that keeps every answer honest. If a
solution does not fit the same outline, it is not part of the framework; it
is a second system in disguise.

```
namespace Html         h · escape — what JSX compiled to, without JSX
namespace Kernel       css · js: tokens, states, wireframe, the fold, zoom
namespace View         Spec · Element · Action · Binding · Catalog · render · Shell
namespace Acp          Agent (spawns claude-agent-acp over stdio) · Commands
namespace Caddy        publish/unpublish <slug>.localhost
namespace Mcp          SystemPort · SystemMcp — /_mcp on the web-standard transport
namespace Metrics      what the work COST: cycle · lead · turns · tool_calls · dollars
class     Memory       the embedded SurrealDB: define() a definition, app() a row, query() the log
const     Pulse        SSE, drafts, gates and phases; survives `bun --hot`
class     Interpreter  the ACP agent: PHASES · design() · resolve() · compile() · judge()
namespace Server       serve() and app(): the Hono, route by route
namespace Cli          serve · acp caps|list|daemon
```

It is also a library: `main.ts` imports cleanly into a browser, which is why
nothing at module level touches Node or Bun.

## Status

This is research, published while it is still wrong. It runs, it is used
daily by its author, and its central claim — that the cost curve flattens —
is not yet measured in public. Treat it as an argument you can run, not as a
dependency.

Issues and questions are welcome. The upstream lives in a monorepo and is
exported here, so pull requests need a manual round trip.

## License

MIT © 2026 Gabriel Fonseca
