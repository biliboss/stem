#!/usr/bin/env -S node --experimental-strip-types
// acp — a tiny ACP client CLI.
//   acp caps                      the agent's initialize response
//   acp list [--cwd <dir>|--all]  existing sessions
//   acp daemon [--cwd <dir>] [--session <id>] [--allow]
//                                 holds one session open; every line written to
//                                 .run/in.fifo is a prompt, replies go to stdout
import { spawn, execFileSync } from "node:child_process";
import { createReadStream, existsSync, mkdirSync, unlinkSync } from "node:fs";
import { createInterface } from "node:readline";
import { Readable, Writable } from "node:stream";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as acp from "@agentclientprotocol/sdk";

const RUN_DIR = join(dirname(fileURLToPath(import.meta.url)), ".run");
const FIFO = join(RUN_DIR, "in.fifo");

export const Agent = {
  connect(command: string, client: Partial<acp.Client> = {}) {
    const [bin, ...args] = command.split(" ");
    const child = spawn(bin, args, { stdio: ["pipe", "pipe", "inherit"] });
    const stream = acp.ndJsonStream(
      Writable.toWeb(child.stdin!) as WritableStream<Uint8Array>,
      Readable.toWeb(child.stdout!) as ReadableStream<Uint8Array>,
    );
    const full: acp.Client = {
      async requestPermission() { return { outcome: { outcome: "cancelled" } }; },
      async sessionUpdate() {},
      ...client,
    };
    const conn = new acp.ClientSideConnection(() => full, stream);
    return { conn, close: () => child.kill() };
  },

  initialize(conn: acp.ClientSideConnection) {
    return conn.initialize({
      protocolVersion: acp.PROTOCOL_VERSION,
      clientCapabilities: {},
      clientInfo: { name: "acp-test", version: "0.0.1" },
    });
  },

  async listAll(conn: acp.ClientSideConnection, cwd?: string) {
    const sessions: acp.SessionInfo[] = [];
    let cursor: string | undefined;
    do {
      const page = await conn.listSessions({ cwd, cursor });
      sessions.push(...page.sessions);
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
    return sessions;
  },
};

const Commands = {
  async caps(agent: string) {
    const { conn, close } = Agent.connect(agent);
    try {
      console.log(JSON.stringify(await Agent.initialize(conn), null, 2));
    } finally {
      close();
    }
  },

  async list(agent: string, cwd?: string) {
    const { conn, close } = Agent.connect(agent);
    try {
      const init = await Agent.initialize(conn);
      if (!init.agentCapabilities?.sessionCapabilities?.list) {
        throw new Error(`${agent} does not advertise sessionCapabilities.list`);
      }
      const sessions = await Agent.listAll(conn, cwd);
      for (const s of sessions) {
        const when = s.updatedAt ? s.updatedAt.slice(0, 16).replace("T", " ") : "—".padEnd(16);
        console.log(`${when}  ${s.sessionId}  ${(s.title ?? "").slice(0, 60)}  ${cwd ? "" : s.cwd}`);
      }
      console.error(`${sessions.length} sessions`);
    } finally {
      close();
    }
  },

  async daemon(agent: string, cwd: string, sessionId: string | undefined, allow: boolean) {
    const { conn, close } = Agent.connect(agent, {
      async sessionUpdate({ update }) {
        if (update.sessionUpdate === "agent_message_chunk" && update.content.type === "text") {
          process.stdout.write(update.content.text);
        } else if (update.sessionUpdate === "tool_call") {
          process.stdout.write(`\n[tool] ${update.title}\n`);
        }
      },
      async requestPermission({ options, toolCall }) {
        const pick = allow ? options.find((o) => o.kind === "allow_once") : undefined;
        console.error(`\n[permission] ${toolCall.title} → ${pick ? "allow_once" : "cancelled"}`);
        return pick
          ? { outcome: { outcome: "selected", optionId: pick.optionId } }
          : { outcome: { outcome: "cancelled" } };
      },
    });
    const shutdown = () => { close(); if (existsSync(FIFO)) unlinkSync(FIFO); process.exit(0); };
    process.on("SIGINT", shutdown).on("SIGTERM", shutdown);

    await Agent.initialize(conn);
    if (sessionId) {
      await conn.resumeSession({ sessionId, cwd, mcpServers: [] });
    } else {
      sessionId = (await conn.newSession({ cwd, mcpServers: [] })).sessionId;
    }

    mkdirSync(RUN_DIR, { recursive: true });
    if (!existsSync(FIFO)) execFileSync("mkfifo", [FIFO]);
    console.error(`session ${sessionId} · cwd ${cwd}\nwrite prompts to ${FIFO}`);

    // A FIFO hits EOF each time its writer closes, so reopen it forever.
    for (;;) {
      for await (const line of createInterface({ input: createReadStream(FIFO) })) {
        if (!line.trim()) continue;
        console.log(`\n> ${line}`);
        const { stopReason } = await conn.prompt({ sessionId, prompt: [{ type: "text", text: line }] });
        console.log(`\n[${stopReason}]`);
      }
    }
  },
};

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const flag = (name: string) => { const i = rest.indexOf(name); return i >= 0 ? rest[i + 1] : undefined; };
  const agent = flag("--agent") ?? "claude-agent-acp";
  const cwd = flag("--cwd") ?? process.cwd();
  if (cmd === "caps") return Commands.caps(agent);
  if (cmd === "list") return Commands.list(agent, rest.includes("--all") ? undefined : cwd);
  if (cmd === "daemon") return Commands.daemon(agent, cwd, flag("--session"), rest.includes("--allow"));
  console.error("usage: acp caps | list [--cwd <dir>|--all] | daemon [--cwd <dir>] [--session <id>] [--allow]");
  process.exit(2);
}

if (import.meta.main) main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
