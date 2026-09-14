# ACP notes — writing a TS CLI client (checked 2026-09-14)

Source of truth for shapes below: the published `@agentclientprotocol/sdk@1.4.0` tarball
(`dist/acp.d.ts`, `dist/schema/types.gen.d.ts`), read locally. Docs: https://agentclientprotocol.com/protocol/overview

## SDK
- Package: `@agentclientprotocol/sdk` **1.4.0** (old name `@zed-industries/agent-client-protocol` stuck at 0.4.5). `PROTOCOL_VERSION = 1`.
- `ndJsonStream(output: WritableStream<Uint8Array>, input: ReadableStream<Uint8Array>): Stream`
- `new ClientSideConnection(toClient: (agent) => Client, stream)` — marked `@deprecated` in 1.4 in favour of
  `client({ name }).connectWith(stream, async (ctx) => ...)`, but still works.
- Required `Client` callbacks: `requestPermission(RequestPermissionRequest) -> RequestPermissionResponse`,
  `sessionUpdate(SessionNotification) -> void`. Optional: `readTextFile`, `writeTextFile`, terminal methods
  (`createTerminal`...), `createElicitation`.
- Methods on the connection (agent side): `initialize`, `newSession`, `loadSession`, `listSessions`,
  `resumeSession`, `deleteSession`, `prompt`, `cancel`, `unstable_forkSession`, `authenticate`.

```ts
import { spawn } from "node:child_process";
import { Readable, Writable } from "node:stream";
import * as acp from "@agentclientprotocol/sdk";
const child = spawn("npx", ["@agentclientprotocol/claude-agent-acp"], { stdio: ["pipe", "pipe", "inherit"] });
const stream = acp.ndJsonStream(Writable.toWeb(child.stdin), Readable.toWeb(child.stdout));
const conn = new acp.ClientSideConnection(() => ({
  async requestPermission(p) { return { outcome: { outcome: "selected", optionId: p.options[0].optionId } }; },
  async sessionUpdate(n) { /* n.sessionId, n.update.sessionUpdate */ },
}), stream);
const init = await conn.initialize({ protocolVersion: acp.PROTOCOL_VERSION, clientCapabilities: { fs: { readTextFile: false, writeTextFile: false }, terminal: false }, clientInfo: { name: "acp-test", version: "0" } });
```

## initialize
Request: `{ protocolVersion: 1, clientCapabilities?: { fs?, terminal?, session?, auth?, elicitation?, plan? (unstable) }, clientInfo?: {name, version} }`
Response `agentCapabilities`:
```
{ loadSession?: boolean,
  promptCapabilities?: { image?, audio?, embeddedContext? },
  mcpCapabilities?: { http?, sse? },
  sessionCapabilities?: { list?: {}|null, delete?: {}|null, resume?: {}|null,
                          additionalDirectories?: {}|null, fork?: {}|null /* UNSTABLE */ },
  auth?, providers? /* UNSTABLE */ }
```
plus `authMethods`, `agentInfo`. Rule: a `{}` means supported; omitted/null means not.

## Sessions
- `session/new` `{ cwd: abs, mcpServers: McpServer[], additionalDirectories? }` -> `{ sessionId, modes?, configOptions? }`
- `session/load` (needs `loadSession: true`) `{ sessionId, cwd, mcpServers, additionalDirectories? }` —
  agent REPLAYS history as `session/update` notifications, then responds.
- `session/resume` (needs `sessionCapabilities.resume`) — same, without replay.
- `session/prompt` `{ sessionId, prompt: ContentBlock[] }` (e.g. `[{type:"text", text:"hi"}]`) ->
  `{ stopReason: "end_turn"|"max_tokens"|"max_turn_requests"|"refusal"|"cancelled", usage? (unstable) }`
- `session/cancel` notification `{ sessionId }`.
- `session/update` notification `{ sessionId, update: { sessionUpdate: ... } }`, kinds:
  `user_message_chunk | agent_message_chunk | agent_thought_chunk` (`content: ContentBlock`),
  `tool_call | tool_call_update`, `plan | plan_update | plan_removed`, `available_commands_update`,
  `current_mode_update`, `config_option_update`, `session_info_update`, `usage_update`,
  `compaction_update | compaction_summary_chunk`.

## session/list  (the one that matters)
- **Stable** in SDK 1.4.0: method is `listSessions` (no `unstable_` prefix; only `fork` is still unstable).
  Wire name `session/list`. Earlier SDKs exposed it as `unstable_listSessions` — pin >= 1.x.
- Advertised by `agentCapabilities.sessionCapabilities.list = {}`. Call only when present.
- Request: `{ cwd?: string|null /* abs path filter */, cursor?: string|null, _meta? }`
- Response: `{ sessions: SessionInfo[], nextCursor?: string|null, _meta? }`
  `SessionInfo = { sessionId, cwd, additionalDirectories?, title?: string|null, updatedAt?: ISO8601|null, _meta? }`
- Pagination: opaque cursor; loop while `nextCursor`. Then open one with `session/load` or `session/resume`.
- Related: `session/delete` `{ sessionId }` behind `sessionCapabilities.delete`.

## Agents
| agent | launch | session list |
|---|---|---|
| Claude Code | `npx @agentclientprotocol/claude-agent-acp` (bin `claude-agent-acp`, v0.76.0). `@zed-industries/claude-code-acp` (0.16.2) is deprecated/renamed | YES — verified in `dist/acp-agent.js`: `loadSession: true`, `sessionCapabilities: { list: {}, resume: {} ... }`, backed by `listSessions` of `@anthropic-ai/claude-agent-sdk` |
| Codex | `npx @zed-industries/codex-acp` (bin `codex-acp`, v0.16.0, native Rust binary) | UNVERIFIED — binary, not inspectable by grep; check `initialize` response |
| Gemini CLI | `gemini --acp` (older: `--experimental-acp`), `@google/gemini-cli` 0.59.0 | UNVERIFIED — check `initialize` response |
Full list: https://agentclientprotocol.com/overview/agents

## URLs
- https://agentclientprotocol.com/protocol/initialization
- https://agentclientprotocol.com/protocol/session-setup (loading sessions)
- https://agentclientprotocol.com/protocol/prompt-turn
- https://github.com/agentclientprotocol/agent-client-protocol · https://github.com/agentclientprotocol/typescript-sdk
- https://www.npmjs.com/package/@agentclientprotocol/sdk · https://www.npmjs.com/package/@agentclientprotocol/claude-agent-acp
- https://geminicli.com/docs/cli/acp-mode/
