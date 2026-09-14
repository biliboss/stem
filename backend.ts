#!/usr/bin/env -S npx tsx
// backend — a server with no routes. Every request becomes an operation; a known
// capability answers it without a model, and anything else goes to an ACP agent,
// whose answer is kept as a learning and promoted to a capability once confirmed.
//   backend [--port 3000] [--db surrealkv://.run/backend.skv] [--agent claude-agent-acp]
//   GET /_system   what the backend has learned so far
//   GET  (accept text/html) a stored view rendered without a model; an empty system shows the bootstrap
//   POST /_intent  {intent} — what the system should become; the agent writes the home view
//   POST /_feedback {path, target, instruction} — point at an element and say what changes
//   POST /_accept  {path} — the current view is what the owner wanted; the journey becomes preferences
//   /_mcp          the meta MCP: resources say what exists, tools change it through the runtime
//   --slug <name>  publish as <name>.localhost through the local Caddy; the port is picked when not given
//   --tools json|mcp  how the agent reaches state: {"query"} replies, or the /_mcp server
//   POST /_teach   {"scope": "GET /", "instruction": "..."} — intent for an operation, given ahead of use
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { mkdirSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { RecordId, Surreal } from "surrealdb";
import { createNodeEngines } from "@surrealdb/node";
import type * as acp from "@agentclientprotocol/sdk";
import { Agent } from "./acp.ts";
import { SystemMcp, type SystemPort } from "./mcp.ts";
import { Caddy } from "./caddy.ts";
import { DESIGN_SYSTEM, BOOTSTRAP, Catalog, render, Shell, type Spec } from "./view.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
// Read per render, not once: a style or behavior change shows on reload, without restarting a design in progress.
const Kernel = { get css() { return readFileSync(join(HERE, "kernel.css"), "utf8"); }, get js() { return readFileSync(join(HERE, "kernel.js"), "utf8"); } };

type Match = { method: string; path: string };
type Behavior = { type: "static_response"; status: number; body: unknown; content_type?: string };
/** RecordId and friends stringify as objects; a record id on the wire is "table:id". */
function jsonSafe(v: unknown): unknown {
  return JSON.parse(JSON.stringify(v, (_k, x) => (x instanceof RecordId ? String(x) : x)));
}

type Program = { route: string; sql: string; status: number; one?: boolean };

type Resolution = { status: number; body: unknown; content_type?: string; by: string };

/** The operational memory: operation, execution, learning, capability. */
class Memory {
  #db: Surreal;
  private constructor(db: Surreal) { this.#db = db; }

  /** How many matching operations a learning needs before it becomes a capability. */
  static PROMOTE_AT = 2;

  static async open(url: string) {
    const db = new Surreal({ engines: createNodeEngines() });
    await db.connect(url);
    await db.use({ namespace: "backend", database: "backend" });
    // A SELECT on a table that does not exist yet is an ERROR in surrealkv, not an empty list.
    await db.query(["operation", "execution", "learning", "capability", "teaching", "view", "theme", "preference", "acceptance", "program", "design_phase"].map((t) => `DEFINE TABLE IF NOT EXISTS ${t} SCHEMALESS;`).join(" "));
    return new Memory(db);
  }

  async query<T>(sql: string, vars: Record<string, unknown> = {}) {
    return (await this.#db.query(sql, vars)) as T;
  }

  async record(request: Match & { query: string; headers: unknown; body: unknown }) {
    const [[op]] = await this.query<[[{ id: RecordId }]]>(
      "CREATE operation CONTENT $r", { r: { ...request, status: "resolving", created_at: new Date() } });
    return op.id;
  }

  async complete(op: RecordId, r: Resolution) {
    await this.query("UPDATE $op MERGE { status: 'completed', output: $body, http_status: $status, resolved_by: $by }",
      { op, body: r.body, status: r.status, by: r.by });
  }

  async fail(op: RecordId, error: string) {
    await this.query("UPDATE $op MERGE { status: 'failed', error: $error }", { op, error });
  }

  async execution(op: RecordId, agent: string, transcript: string[], ms: number) {
    await this.query("CREATE execution CONTENT $e",
      { e: { operation: op, agent, transcript, duration_ms: ms, created_at: new Date() } });
  }

  /** The agent's query into application state; the operational tables stay out of reach. */
  async app(sql: string, vars: Record<string, unknown> = {}) {
    if (/\b(operation|execution|learning|capability|teaching|view|theme|preference|acceptance|program|design_phase)\b/i.test(sql)) {
      throw new Error("operational tables are reserved");
    }
    return jsonSafe(await this.#db.query(sql, vars));
  }

  async find<T>(table: "capability" | "learning", m: Match) {
    const [rows] = await this.query<[T[]]>(
      `SELECT * FROM ${table} WHERE match.method = $method AND match.path = $path LIMIT 1`, m);
    return rows[0];
  }

  async learn(op: RecordId, match: Match, behavior: Behavior) {
    await this.query("CREATE learning CONTENT $l",
      { l: { match, behavior, learned_from: [op], created_at: new Date() } });
  }

  /** A learning that answered again gains a witness; enough witnesses make it a capability. */
  async confirm(op: RecordId, learning: { id: RecordId; match: Match; behavior: Behavior; learned_from: RecordId[] }) {
    const witnesses = [...learning.learned_from, op];
    await this.query("UPDATE $id MERGE { learned_from: $w }", { id: learning.id, w: witnesses });
    if (witnesses.length < Memory.PROMOTE_AT) return false;
    await this.query("CREATE capability CONTENT $c", {
      c: { match: learning.match, behavior: learning.behavior, evolved_from: learning.id, created_at: new Date() },
    });
    return true;
  }

  /** "/todos/{id}/complete" matches "/todos/todo:abc/complete" and yields {id: "todo:abc"}. */
  static routeMatch(route: string, path: string): Record<string, string> | undefined {
    const names: string[] = [];
    const pattern = route.replace(/\{(\w+)\}/g, (_m, n) => { names.push(n); return "([^/]+)"; });
    const hit = new RegExp(`^${pattern}$`).exec(path);
    return hit ? Object.fromEntries(names.map((n, i) => [n, decodeURIComponent(hit[i + 1])])) : undefined;
  }

  static PROMOTE_PROGRAM_AT = 2;

  async program(m: Match) {
    const [rows] = await this.query<[(Program & { id: RecordId; method: string; promoted: boolean; witnesses: RecordId[] })[]]>(
      "SELECT * FROM program WHERE method = $method ORDER BY promoted DESC, created_at DESC", m);
    for (const row of rows) {
      const params = Memory.routeMatch(row.route, m.path);
      if (params) return { ...row, params };
    }
    return undefined;
  }

  /** The same SQL written again for the same route is a witness; enough witnesses promote it. */
  async propose(op: RecordId, method: string, p: Program) {
    const sql = p.sql.replace(/\s+/g, " ").trim();
    const [[same]] = await this.query<[{ id: RecordId; witnesses: RecordId[] }[]]>(
      "SELECT id, witnesses, created_at FROM program WHERE method = $method AND route = $route AND sql = $sql LIMIT 1",
      { method, route: p.route, sql });
    if (!same) {
      await this.query("CREATE program CONTENT $p", { p: { method, route: p.route, sql, status: p.status ?? 200, one: Boolean(p.one),
        witnesses: [op], promoted: false, created_at: new Date() } });
      return;
    }
    const witnesses = [...same.witnesses, op];
    await this.query("UPDATE $id MERGE { witnesses: $w, promoted: $promoted, promoted_at: $at }",
      { id: same.id, w: witnesses, promoted: witnesses.length >= Memory.PROMOTE_PROGRAM_AT,
        at: witnesses.length >= Memory.PROMOTE_PROGRAM_AT ? new Date() : null });
  }

  async witness(id: RecordId, op: RecordId, kind: string) {
    await this.query("UPDATE $id SET runs += $op, last_run = $kind", { id, op, kind });
  }

  /**
   * Programs written by the designer next to its view start promoted: the one who wrote the screen's read
   * queries writes the matching writes. Only programs for actions the view really declares are taken, and
   * the same guard as any program applies: the first time one breaks, it is demoted and the agent answers.
   */
  async adopt(programs: (Program & { method: string })[] | undefined, view: Spec | undefined, more: Spec[] = []) {
    if (!programs?.length || !view) return;
    const actions = [view, ...more].flatMap((v) => Object.values(v?.elements ?? {}).flatMap((e) => (e.action ? [e.action] : [])));
    for (const p of programs) {
      const declared = actions.some((a) => a.method.toUpperCase() === p.method?.toUpperCase()
        && Memory.routeMatch(p.route, a.path.replace(/\{\$item\.[^}]+\}/g, "x")));
      if (!declared || !p.sql) continue;
      const sql = p.sql.replace(/\s+/g, " ").trim();
      await this.query("DELETE program WHERE method = $method AND route = $route", { method: p.method.toUpperCase(), route: p.route });
      await this.query("CREATE program CONTENT $p", { p: { method: p.method.toUpperCase(), route: p.route, sql, status: p.status ?? 200,
        one: Boolean(p.one), witnesses: [], promoted: true, origin: "design", promoted_at: new Date(), created_at: new Date() } });
    }
  }

  async demote(id: RecordId, error: string) {
    await this.query("UPDATE $id MERGE { promoted: false, witnesses: [], demoted: $error }", { id, error });
  }

  async keepPhase(p: { path: string; intent: string; step: number; name: string; text: string; view?: unknown }) {
    await this.query("CREATE design_phase CONTENT $p", { p: { ...p, created_at: new Date() } });
  }

  /** The latest approved version of every phase on a path, and the intent it served. */
  async phasesOf(path: string) {
    const [rows] = await this.query<[{ intent: string; step: number; name: string; text: string; view?: Spec; created_at: string }[]]>(
      "SELECT intent, step, name, text, view, created_at FROM design_phase WHERE path = $path ORDER BY created_at DESC", { path });
    const latest = new Map<number, (typeof rows)[number]>();
    for (const r of rows) if (!latest.has(r.step)) latest.set(r.step, r);
    return { intent: rows[0]?.intent, phases: [...latest.values()].sort((a, b) => a.step - b.step) };
  }

  async teach(scope: string, instruction: string) {
    await this.query("CREATE teaching CONTENT $t", { t: { scope, instruction, created_at: new Date() } });
  }

  async teachings(m: Match) {
    const [rows] = await this.query<[{ instruction: string }[]]>(
      "SELECT instruction, created_at FROM teaching WHERE scope = $scope ORDER BY created_at", { scope: `${m.method} ${m.path}` });
    return rows.map((r) => r.instruction);
  }

  /** Views are versioned: every edit is a new row, and the latest one renders. */
  async view(path: string) {
    const [rows] = await this.query<[{ spec: Spec }[]]>(
      "SELECT spec, created_at FROM view WHERE path = $path ORDER BY created_at DESC LIMIT 1", { path });
    return rows[0]?.spec;
  }

  /** The view for a concrete path: an exact one, else the latest view whose path is a matching template. */
  async viewFor(path: string): Promise<{ spec: Spec; params: Record<string, string>; path: string } | undefined> {
    const exact = await this.view(path);
    if (exact) return { spec: exact, params: {}, path };
    const [rows] = await this.query<[{ path: string; spec: Spec; created_at: string }[]]>(
      "SELECT path, spec, created_at FROM view WHERE string::contains(path, '{') ORDER BY created_at DESC");
    for (const r of rows) {
      const params = Memory.routeMatch(r.path, path);
      if (params) return { spec: r.spec, params, path: r.path };
    }
    return undefined;
  }

  async saveView(path: string, spec: Spec, origin: unknown) {
    await this.query("CREATE view CONTENT $v", { v: { path, spec, origin, created_at: new Date() } });
    Pulse.drafts.delete(path);
    Pulse.emit("changed", { path });
  }

  async tokens() {
    const [rows] = await this.query<[{ tokens: Record<string, string> }[]]>(
      "SELECT tokens, created_at FROM theme ORDER BY created_at DESC LIMIT 1");
    return rows[0]?.tokens ?? {};
  }

  async saveTokens(tokens: Record<string, string>, origin: unknown) {
    await this.query("CREATE theme CONTENT $t", { t: { tokens, origin, created_at: new Date() } });
    Pulse.emit("changed", { path: "*" });
  }

  /** A system that was never told anything: no view, no teaching. */
  async empty() {
    const [[v], [t]] = await this.query<[{ n: number }[], { n: number }[]]>(
      "SELECT count() AS n FROM view GROUP ALL; SELECT count() AS n FROM teaching GROUP ALL;");
    return !v?.n && !t?.n;
  }

  /** Runs a view's data queries; a table that does not exist yet is an empty list, not an error. */
  /** Runs a view's data queries. A failing query is reported, never silently turned into an empty list. */
  async viewData(spec: Spec, params: Record<string, string> = {}) {
    const data: Record<string, unknown> = {};
    const errors: Record<string, string> = {};
    for (const [name, sql] of Object.entries(spec.data ?? {})) {
      try {
        const result = (await this.app(sql, params)) as unknown[];
        data[name] = result.at(-1) ?? [];
      } catch (e) {
        // A table nobody wrote to yet is not a broken view: it is an empty one.
        if (/does not exist/.test(String(e))) data[name] = [];
        else { data[name] = []; errors[name] = String(e); }
      }
    }
    return { data, errors };
  }

  /** The screens' side of the contract: every view query, so an operation writes rows the screens can read. */
  async contracts() {
    const [rows] = await this.query<[{ path: string; spec: Spec; created_at: string }[]]>(
      "SELECT path, spec, created_at FROM view ORDER BY created_at DESC");
    const latest = new Map<string, Spec>();
    for (const r of rows) if (!latest.has(r.path)) latest.set(r.path, r.spec);
    return [...latest].map(([path, spec]) => ({
      view: path, reads: spec.data ?? {},
      actions: Object.values(spec.elements).flatMap((e) => (e.action ? [`${e.action.method} ${e.action.path}`] : [])),
    }));
  }

  /** The journey since the last acceptance of a path: every version and the words that produced it. */
  async journey(path: string) {
    const [[last]] = await this.query<[{ created_at: string }[]]>(
      "SELECT created_at FROM acceptance WHERE path = $path ORDER BY created_at DESC LIMIT 1", { path });
    const [views] = await this.query<[{ id: RecordId; spec: Spec; origin: any; created_at: string }[]]>(
      "SELECT id, spec, origin, created_at FROM view WHERE path = $path AND created_at > $since ORDER BY created_at",
      { path, since: last?.created_at ? new Date(last.created_at) : new Date(0) });
    return views;
  }

  async accept(path: string, turns: number, corrections: number, view: RecordId | undefined, preferences: RecordId[]) {
    await this.query("CREATE acceptance CONTENT $a",
      { a: { path, turns_to_accept: turns, corrections_to_accept: corrections, view, preferences, created_at: new Date() } });
  }

  async prefer(p: { scope: string; rule: string; confidence: number; evidence: string[] }, from: RecordId[]) {
    const [[row]] = await this.query<[[{ id: RecordId }]]>("CREATE preference CONTENT $p",
      { p: { ...p, derived_from: from, created_at: new Date() } });
    return row.id;
  }

  async preferences() {
    const [rows] = await this.query<[{ scope: string; rule: string; confidence: number }[]]>(
      "SELECT scope, rule, confidence, created_at FROM preference ORDER BY created_at");
    return rows;
  }

  async views() {
    const [rows] = await this.query<[{ path: string; versions: number }[]]>(
      "SELECT path, count() AS versions FROM view GROUP BY path");
    return rows;
  }

  async capabilities() {
    const [rows, programs] = await this.query<[unknown[], unknown[]]>(
      "SELECT match, behavior FROM capability; SELECT method, route, sql, promoted, array::len(witnesses) AS witnesses, array::len(runs ?? []) AS runs, demoted FROM program;");
    return { static: rows, programs };
  }

  /** The narrow surface /_mcp is allowed to touch. */
  port(base: string, prompts: Record<string, string>): SystemPort {
    return {
      base, prompts,
      schema: () => this.app("INFO FOR DB"),
      views: () => this.views(),
      view: (path) => this.view(path),
      journey: (path) => this.journey(path),
      preferences: () => this.preferences(),
      capabilities: () => this.capabilities(),
      query: (sql) => this.app(sql),
      teach: (scope, instruction) => this.teach(scope, instruction),
      prefer: (p) => this.prefer({ confidence: 0.8, evidence: ["mcp"], ...p }, []),
      design: async (path) => ({ phase: Pulse.phases.get(path) ?? null, waiting: Pulse.gates.has(path), draft: Pulse.drafts.get(path)?.spec ?? null }),
      sketch: async (path, view, note) => {
        const previous = Pulse.drafts.get(path)?.spec;
        Pulse.drafts.set(path, { spec: view as Spec, previous });
        Pulse.emit("draft", { path, note, template: path.includes("{") });
      },
    };
  }

  async system() {
    const [capabilities, learnings, operations] = await this.query<[unknown[], unknown[], unknown[]]>(
      `SELECT match, behavior, evolved_from FROM capability;
       SELECT match, behavior, learned_from FROM learning;
       SELECT method, path, status, resolved_by, created_at FROM operation ORDER BY created_at DESC LIMIT 20;`);
    const [acceptances] = await this.query<[unknown[]]>(
      "SELECT path, turns_to_accept, corrections_to_accept, created_at FROM acceptance ORDER BY created_at");
    return { acceptances, preferences: await this.preferences(), capabilities, learnings, recent_operations: operations };
  }
}

/** What any open page hears: the agent started, the agent stopped, the system changed shape. */
const Pulse = {
  clients: new Set<ServerResponse>(),
  working: 0,
  /** The latest sketch per path, in memory only: a draft is a show, not a record. */
  drafts: new Map<string, { spec: Spec; previous?: Spec }>(),
  /** Interactive designs wait here after each phase until the owner says go on, or what to change. */
  gates: new Map<string, (d: { decision: "continue" | "revise" | "abort"; note?: string }) => void>(),
  /** The latest phase event per path: what an MCP client reads to see the same fold the page shows. */
  phases: new Map<string, Record<string, unknown>>(),
  wait(path: string) {
    return new Promise<{ decision: "continue" | "revise" | "abort"; note?: string }>((resolve) => Pulse.gates.set(path, resolve));
  },
  emit(event: "working" | "idle" | "changed" | "gesture" | "draft" | "phase" | "gate", data: object = {}) {
    if (event === "phase") { const d = data as Record<string, unknown>; Pulse.phases.set(String(d.path), { ...d, waiting: Pulse.gates.has(String(d.path)) || Boolean(d.awaiting) }); }
    for (const c of Pulse.clients) c.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  },
  subscribe(res: ServerResponse) {
    res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
    res.write(`event: ${Pulse.working ? "working" : "idle"}\ndata: {}\n\n`);
    // A page opened mid-design catches up: the last phase of every path, and whether it waits.
    for (const phase of Pulse.phases.values()) res.write(`event: phase\ndata: ${JSON.stringify({ ...phase, awaiting: Pulse.gates.has(String(phase.path)) || undefined })}\n\n`);
    Pulse.clients.add(res);
    res.on("close", () => Pulse.clients.delete(res));
  },
};

/** One long-lived ACP session that resolves operations nobody taught the backend yet. */
class Interpreter {
  #conn: acp.ClientSideConnection;
  #sessionId: string;
  #cwd: string;
  #mcp?: string;
  toolCalls = 0;
  /** Reply text per session: fresh sessions run concurrently, and one buffer would mix their answers. */
  #text = new Map<string, string>();
  #queue: Promise<unknown> = Promise.resolve();
  readonly agent: string;

  private constructor(agent: string, conn: acp.ClientSideConnection, cwd: string) {
    this.agent = agent; this.#conn = conn; this.#cwd = cwd; this.#sessionId = "";
  }

  static PROMPT = `You are the runtime of a backend that has no code. You receive one HTTP
operation as JSON and decide how this backend answers it. The body may carry
"instructions" from the client. Do not use tools.

State lives in SurrealDB (SurrealQL). Tables you create are yours; never touch
operation, execution, learning or capability. Use INFO FOR DB to see what exists.
To run a query, reply with ONLY: {"query": "<SurrealQL>"}
and you will get its JSON result back. Repeat as needed.

When done, reply with ONLY one JSON object, no prose, no code fence:
{"status": <http status>, "content_type": "<mime>", "body": <json, or a string for non-JSON>, "side_effects": <bool>, "reusable": <bool>}
Honor the "accept" of the operation: text/html gets a complete HTML page as a string.
"teachings" are what the owner said this operation means; follow them.
"screens" are the views that exist: their "reads" are the exact queries they run. Write rows those queries will
return (same table, same field names), and answer the action paths they declare. "{$item.id}" in a path is the
record id as the screen read it.
"reusable" is true only when the same request must always get this exact answer
regardless of stored state.

When this operation is one of a FAMILY (same method, same route shape, different data or ids), also return
"program": the deterministic version of what you just did, so the next ones run without you:
{"route": "/todos/{id}/complete", "sql": "<SurrealQL>", "status": <http status>, "one": <bool>}
- "route" names path parameters with {braces}; the sql reads them as $id, and body.data fields as $data.<field>.
- Parameters are strings. A record id arrives as "table:id": use type::record($id).
- The response body is the result of the LAST statement ("one": true takes its first row).
- Write exactly what you wrote by hand, with the same fields and defaults, so the screens keep reading it.
Omit "program" when the answer needs judgement a query cannot make.`;

  /** How many query round trips one operation may take. */
  static MAX_TURNS = 8;

  static async start(agent: string, mcpUrl?: string) {
    let self: Interpreter | undefined;
    const { conn } = Agent.connect(agent, {
      async sessionUpdate({ sessionId, update }) {
        if (update.sessionUpdate === "agent_message_chunk" && update.content.type === "text" && self) {
          self.#text.set(sessionId, (self.#text.get(sessionId) ?? "") + update.content.text);
        }
        if (update.sessionUpdate === "tool_call" && self) self.toolCalls++;
      },
      // Only the system's own MCP may run; every built-in tool (Bash, Write, …) is refused.
      async requestPermission({ options, toolCall }) {
        const ours = /mcp__system__|system/.test(`${toolCall.title} ${JSON.stringify(toolCall.rawInput ?? "")}`);
        const allow = options.find((o) => o.kind === "allow_once");
        return ours && allow ? { outcome: { outcome: "selected", optionId: allow.optionId } } : { outcome: { outcome: "cancelled" } };
      },
    });
    await Agent.initialize(conn);
    const cwd = join(HERE, ".run", "agent");
    mkdirSync(cwd, { recursive: true });
    self = new Interpreter(agent, conn, cwd);
    self.#mcp = mcpUrl;
    self.#sessionId = await self.open();
    return self;
  }

  /** No settings sources: the owner's output style and hooks must not leak into the JSON. */
  /** A design session reads and queries, but cannot send operations: designing must not write app data. */
  async open(designing = false) {
    const mcpServers = this.#mcp ? [{ type: "http" as const, name: "system", url: this.#mcp, headers: [] }] : [];
    const options = this.#mcp
      ? { settingSources: [], allowedTools: designing
            ? ["mcp__system__query", "mcp__system__sketch", "ListMcpResourcesTool", "ReadMcpResourceTool"]
            : ["mcp__system__query", "mcp__system__request", "mcp__system__teach", "ListMcpResourcesTool", "ReadMcpResourceTool"],
          disallowedTools: [...(designing ? ["mcp__system__request", "mcp__system__teach", "mcp__system__intent", "mcp__system__feedback", "mcp__system__accept"] : []), "Bash", "Write", "Edit", "Read", "Glob", "Grep", "WebFetch", "WebSearch", "Task", "NotebookEdit"] }
      : { settingSources: [] };
    const { sessionId } = await this.#conn.newSession({ cwd: this.#cwd, mcpServers, _meta: { claudeCode: { options } } });
    return sessionId;
  }

  /** Prompts are serialized: one session answers one operation at a time. */
  resolve(operation: object, execute: (sql: string) => Promise<unknown>) {
    return this.run(`${Interpreter.PROMPT}\n\nOPERATION ${JSON.stringify(operation)}`, execute) as Promise<{
      transcript: string[]; ms: number; answer: { status: number; body: unknown; content_type?: string; side_effects: boolean; reusable: boolean } }>;
  }

  static DESIGN = `You design views for a backend that has no code. Views are data, not HTML.
${Catalog.DOC}
${Catalog.TOKENS}
State lives in SurrealDB. To inspect it, reply with ONLY {"query": "<SurrealQL>"} (e.g. INFO FOR DB) and you get the result.
Actions may point at paths that do not exist yet: the backend resolves them on first use, with body {"data": {...form fields}}.
Prefer resource paths like POST /todos, POST /todos/{$item.id}/complete. Never touch the tables operation, execution, learning,
capability, teaching, view or theme. When done, reply with ONLY one JSON object, no prose, no fence:
{"view": <view>} to create or replace the view, or {"tokens": {...}} to change design tokens, or both.
What earlier designs got wrong, now rules of this kernel:
- Do what the intent literally asks for its structure: "grouped by project" is one section per project (a repeat over
  projects whose child list reads that project's rows), not a flat list with a project column.
- A list of labels is a Tag repeated over the labels, one chip each, color = a tone name (primary, success, warning,
  error, info, accent, neutral). Never join labels into one text.
- No vanity numbers: no Stat or Badge that only counts what the list right below already shows.
- Every action on every screen (the template views too) gets a program; a screen that works needs no agent to click.
- Seed only what the intent implies (e.g. one starter notebook), and say nothing about it in the UI.
- Form fields for relations use Select with options read from a data query; the program writes the record id.
If the "sketch" tool is available, build in public: first sketch the skeleton (root, layout and section ids, sections
still unwritten), then sketch again after writing each section, with a short "note" of what you are drawing. The
owner watches the page assemble. Always pass the path you were given in the task.
An app with more than one screen also returns "views": [{"path": "/notebooks/{id}", "view": <view>}], one per route template
its links point to; every one follows the same rules, and all their actions get programs.
With a view, also return "programs": one per action the view declares, so the screen works deterministically
from its first click: [{"method": "POST", "route": "/todos/{id}/complete", "sql": "<SurrealQL>", "status": 200, "one": true}]
- You wrote the view's "data" queries, so write rows they will read: same table, same fields, same defaults.
- {braces} in the route are path params read as $id; form fields are $data.<name>; a record id arrives as "table:id",
  use type::record($id). The response is the LAST statement's result.
"preferences" in the task are what this owner accepted before; apply the ones whose scope fits, before your own taste.`;

  /**
   * A new screen is designed in phases the owner watches: understand, plan, UX, skeleton, screen. Each phase is
   * one turn of the same session, announced on /_events; the skeleton is sketched by the runtime itself, so the
   * page assembles whether or not the agent remembers to call a tool. Small edits (feedback) skip the phases.
   */
  /** Set by the runtime: where a phase correction is stored as a preference. */
  static remember?: (p: { scope: string; rule: string; confidence: number; evidence: string[] }) => Promise<unknown>;
  /** Set by the runtime: every approved phase is kept, so a design can start again from any phase already lived. */
  static keep?: (p: { path: string; intent: string; step: number; name: string; text: string; view?: unknown }) => Promise<unknown>;

  /** Every phase text is read by a person with little attention: no obvious statements, no narration of the obvious. */
  static PHASE_RULE = `The owner reads this in one glance. Never state the obvious or narrate your process ("the database is empty",
"everything is born now", "I will", "let me"). No preamble, no restating the request. Only what the owner must see to approve.
A drawing says it exists: an entity in the erDiagram IS the table to create, so never write "will create". Mark only
what is not new — an entity or field that already exists and changes gets "(existente)" or "+ campo" in its name.`;

  static PHASES = [
    { name: "entendendo", ask: `PHASE 1 of 5 — understand. Apply every preference scoped "phase:entendendo" to how you write this. ${Interpreter.PHASE_RULE} Do not design yet. Reply ONLY {"text": "<Portuguese: one short first line naming what will exist, then 3-5 '- ' items of at most 8 words each, in spoken language>"}` },
    { name: "planejando", ask: `PHASE 2 of 5 — plan. Apply every preference scoped "phase:planejando". ${Interpreter.PHASE_RULE} Inspect the state if useful. Reply ONLY {"text": "<Portuguese markdown that fits one screen: sections '## Telas' and '## Ações' with 2-5 '- ' items of at most 10 words each; '## Eventos' with the 3-6 facts that prove the app works, each as '- ' + a PascalCase past-tense name and at most 6 words (e.g. '- TaskCreated: tarefa nova num projeto'); and '## Entidades' holding ONLY a fenced mermaid erDiagram of the entities with their key fields and relations (no prose)>"}` },
    { name: "pensando a UX", ask: `PHASE 3 of 5 — UX. Apply every preference scoped "phase:pensando a UX". ${Interpreter.PHASE_RULE} Reply ONLY {"text": "<Portuguese markdown that fits one screen: sections '## Hierarquia', '## Ação principal', '## Navegação', '## Vazios', each with 1-3 '- ' items of at most 12 words>"}` },
    { name: "esboçando", ask: `PHASE 4 of 5 — mockup. Reply ONLY {"text": "<one line>", "view": <the view with its layout, sections and their real elements written with short representative Portuguese text: titles, labels, placeholders, button names, and 2-3 example rows where a list goes, each at the size the real content will have; only what decides the structure: a list row carries its title and at most one secondary element, secondary actions stay out; no data queries, no repeat, no programs>}` },
  ];

  design(task: object, execute: (sql: string) => Promise<unknown>, phasedPath?: string, interactive = false,
      replay?: { from: number; phases: { step: number; name: string; text: string; view?: Spec }[] }) {
    return this.run(`${Interpreter.DESIGN}\n\nTASK ${JSON.stringify(task)}`, execute, true, Interpreter.checkView(execute), phasedPath, interactive, replay) as Promise<{
      transcript: string[]; ms: number; turns: number; tool_calls: number; answer: { view?: Spec; tokens?: Record<string, string>; programs?: (Program & { method: string })[] } }>;
  }

  static COMPILE = `You compile a design journey into preferences. You get every version of a view in order,
each with the owner's instruction that produced it, and the last version is the one the owner accepted.
Find what the corrections have in common, not what each one said: what the owner kept removing, adding
or changing, and what the first draft got wrong that the accepted one got right.
Write rules a designer can apply to a DIFFERENT page tomorrow, in terms of the view DSL and design tokens.
Scope each rule: "global" (any view), "kind:<landing|dashboard|form|…>", or "path:<path>" when it only
fits this page. Skip rules already in "existing". Evidence cites version numbers and instructions.
${Catalog.DOC}
Reply with ONLY: {"preferences": [{"scope": str, "rule": str, "confidence": 0..1, "evidence": [str]}]}`;

  compile(journey: object, execute: (sql: string) => Promise<unknown>) {
    return this.run(`${Interpreter.COMPILE}\n\nJOURNEY ${JSON.stringify(journey)}`, execute, true) as Promise<{
      transcript: string[]; ms: number; answer: { preferences?: { scope: string; rule: string; confidence: number; evidence: string[] }[] } }>;
  }

  static JUDGE = `You audit two views, A and B, against a list of preferences. You do not know how either was made.
For each preference that applies, decide whether each view complies. Judge the spec, not your taste.
${Catalog.DOC}
Reply with ONLY: {"a": [bool per preference, same order], "b": [bool per preference], "notes": str}`;

  judge(task: object) {
    return this.run(`${Interpreter.JUDGE}\n\nTASK ${JSON.stringify(task)}`, async () => ({ error: "no queries" }), true) as Promise<{
      transcript: string[]; ms: number; answer: { a: boolean[]; b: boolean[]; notes: string } }>;
  }

  /**
   * One exchange with the agent. Operations share the long-lived session; design, compile and judge
   * each open a FRESH one, so nothing crosses between tasks except what the database hands over.
   */
  /** A view is not done until every data query runs; the error goes back to the same session. */
  static checkView(execute: (sql: string) => Promise<unknown>) {
    return async (answer: Record<string, unknown>) => {
      const spec = answer.view as Spec | undefined;
      if (!spec) return undefined;
      const problems: string[] = [];
      for (const [name, sql] of Object.entries(spec.data ?? {})) {
        await execute(sql).catch((e) => { if (!/does not exist/.test(String(e))) problems.push(`data.${name}: ${e}`); });
      }
      for (const [id, el] of Object.entries(spec.elements ?? {})) {
        if (!(el.type in Catalog.components)) problems.push(`elements.${id}: unknown type ${el.type}`);
        for (const c of el.children ?? []) if (!spec.elements[c]) problems.push(`elements.${id}: child ${c} does not exist`);
      }
      if (!spec.elements?.[spec.root]) problems.push(`root ${spec.root} does not exist`);
      return problems.length ? `The view is invalid, fix it and reply with the whole JSON again:\n${problems.join("\n")}` : undefined;
    };
  }

  run(first: string, execute: (sql: string) => Promise<unknown>, fresh = false,
      check?: (answer: Record<string, unknown>) => Promise<string | undefined>, phasedPath?: string, interactive = false,
      replay?: { from: number; phases: { step: number; name: string; text: string; view?: Spec }[] }) {
    const work = async () => {
      if (Pulse.working++ === 0) Pulse.emit("working", { task: first.slice(0, 40) });
      try { return await run(); } finally { if (--Pulse.working === 0) Pulse.emit("idle"); }
    };
    const run = async () => {
      const session = fresh ? await this.open(true) : this.#sessionId;
      // A fresh session is a live `claude` process until closed: without this, every design task leaked one.
      try {
        if (!phasedPath) return await this.turns(session, first, execute, check);
        const started = Date.now();
        let prefix = `${first}\n\n`;
        const intentText = String((first.match(/"intent":"([^"]*)"/) ?? [])[1] ?? "");
        for (const [i, phase] of Interpreter.PHASES.entries()) {
          // Replay: a phase before "from" is not asked again — its approved text is handed to the agent and shown as done.
          const kept = replay && i + 1 < replay.from ? replay.phases.find((p) => p.step === i + 1) : undefined;
          if (kept) {
            prefix += `Phase ${i + 1} (${phase.name}) is already approved by the owner, use it as is:\n${kept.text}\n${kept.view ? `VIEW ${JSON.stringify(kept.view)}\n` : ""}\n`;
            if (kept.view) { Pulse.drafts.set(phasedPath, { spec: kept.view }); Pulse.emit("draft", { path: phasedPath, note: kept.text }); }
            Pulse.emit("phase", { path: phasedPath, name: phase.name, step: i + 1, total: Interpreter.PHASES.length + 1, text: kept.text, done: true });
            continue;
          }
          Pulse.emit("phase", { path: phasedPath, name: phase.name, step: i + 1, total: Interpreter.PHASES.length + 1 });
          let ask = prefix + phase.ask;
          prefix = "";
          // Interactive: the phase is shown whole and the design waits. "revise" re-runs the same phase with the note.
          for (;;) {
            const { answer } = await this.turns(session, ask, execute);
            const text = typeof answer.text === "string" ? answer.text : "";
            if (answer.view) {
              const previous = Pulse.drafts.get(phasedPath)?.spec;
              Pulse.drafts.set(phasedPath, { spec: answer.view as Spec, previous });
              Pulse.emit("draft", { path: phasedPath, note: text || phase.name });
            }
            Pulse.emit("phase", { path: phasedPath, name: phase.name, step: i + 1, total: Interpreter.PHASES.length + 1, text, done: true, awaiting: interactive });
            if (!interactive) break;
            const gate = await Pulse.wait(phasedPath);
            if (gate.decision === "abort") throw new Error("design restarted from another phase");
            if (gate.decision === "continue") {
              await Interpreter.keep?.({ path: phasedPath, intent: intentText, step: i + 1, name: phase.name, text, view: answer.view });
              break;
            }
            Pulse.emit("phase", { path: phasedPath, name: `${phase.name} de novo`, step: i + 1, total: Interpreter.PHASES.length + 1 });
            ask = `The owner read your ${phase.name} and asks: "${gate.note ?? ""}". Redo ${phase.ask}`;
            // A correction to how a phase is written is a preference for that phase in every future design.
            if (gate.note) await Interpreter.remember?.({ scope: `phase:${phase.name}`, rule: gate.note, confidence: 0.8, evidence: [`refazer em ${phasedPath}`] });
          }
        }
        // Phase 5 fills the skeleton one section at a time, and the page shows each section as it lands,
        // instead of waiting for the whole screen. Only the wiring (programs, template views) comes at the end.
        const draft = Pulse.drafts.get(phasedPath)?.spec;
        const containers = new Set(["Card", "List", "Stack", "Sidebar", "Form", "Split", "Page"]);
        const pending: string[] = [];
        const walk = (id: string) => {
          const el = draft?.elements?.[id];
          if (!el) { pending.push(id); return; }
          const kids = el.children ?? [];
          if (containers.has(el.type) && kids.length === 0 && el.type !== "Page") pending.push(id);
          kids.forEach(walk);
        };
        if (draft) walk(draft.root);
        let view: Spec | undefined = draft ? structuredClone(draft) : undefined;
        if (view && pending.length && pending.length <= 12) {
          for (const [k, id] of pending.entries()) {
            const title = String((view.elements[id]?.props as { title?: string } | undefined)?.title ?? id);
            Pulse.emit("phase", { path: phasedPath, name: `desenhando ${title}`, step: 5, total: 5 });
            const { answer } = await this.turns(session, `PHASE 5 of 5 — section ${k + 1} of ${pending.length}: "${id}" (${title}). ` +
              `Write this section only. Reply ONLY {"text": "<one line>", "elements": {"${id}": <the element with its children ids>, <every descendant>}, "data": {<queries it reads>}}`, execute);
            const previous = view;
            view = { ...view, data: { ...(view.data ?? {}), ...((answer.data as Record<string, string>) ?? {}) },
              elements: { ...view.elements, ...((answer.elements as Record<string, Spec["elements"][string]>) ?? {}) } };
            Pulse.drafts.set(phasedPath, { spec: view, previous });
            Pulse.emit("draft", { path: phasedPath, note: typeof answer.text === "string" ? answer.text : title });
          }
          Pulse.emit("phase", { path: phasedPath, name: "ligando as ações", step: 5, total: 5 });
          const wiring = await this.turns(session, `FINAL — the assembled view is below. Reply ONLY {"programs": [...one per action of every screen...], ` +
            `"views": [{"path": "/x/{id}", "view": <view>}] for the route templates its links point to (empty if none)}.\nVIEW ${JSON.stringify(view)}`, execute);
          const answer = { view, programs: wiring.answer.programs, views: wiring.answer.views } as Record<string, unknown>;
          const problem = check ? await check(answer) : undefined;
          if (!problem) return { ...wiring, answer, ms: Date.now() - started };
          const fixed = await this.turns(session, `${problem}\nReply with the whole final JSON (view, programs, views).`, execute, check);
          return { ...fixed, ms: Date.now() - started };
        }
        Pulse.emit("phase", { path: phasedPath, name: "desenhando a tela", step: 5, total: 5 });
        const last = await this.turns(session, "PHASE 5 of 5 — the screen. Now reply with the final JSON exactly as the instructions specify (view, programs, views).", execute, check);
        return { ...last, ms: Date.now() - started };
      }
      finally { if (fresh) await this.#conn.closeSession({ sessionId: session }).catch(() => undefined); }
    };
    // Only the shared session needs a queue. A fresh session is independent, and queueing it would
    // deadlock: a designer that calls the request tool starts an operation that waits behind itself.
    return fresh ? work() : this.enqueue(work);
  }

  enqueue<T>(work: () => Promise<T>) {
    const next = this.#queue.then(work, work);
    this.#queue = next.catch(() => {});
    return next;
  }

  async turns(session: string, first: string, execute: (sql: string) => Promise<unknown>,
      check?: (answer: Record<string, unknown>) => Promise<string | undefined>) {
    {
      const started = Date.now();
      const transcript: string[] = [];
      let message = this.#mcp
        ? `${first}\n\nTOOLS: this session has the "system" MCP server. Do NOT reply with {"query"}: read its resources and use its tools, then reply with the final JSON only.`
        : first;
      const calls = this.toolCalls;
      for (let turn = 0; turn < Interpreter.MAX_TURNS; turn++) {
        const reply = Interpreter.parse(await this.ask(session, message));
        transcript.push(message, JSON.stringify(reply));
        if (typeof reply.query !== "string") {
          const problem = check && turn < Interpreter.MAX_TURNS - 1 ? await check(reply) : undefined;
          if (problem) { console.error("[design] rejected:", problem); message = problem; continue; }
          return { transcript, ms: Date.now() - started, turns: turn + 1, tool_calls: this.toolCalls - calls, answer: reply as any };
        }
        const result = await execute(reply.query).catch((e) => ({ error: String(e) }));
        message = `RESULT ${JSON.stringify(result)}`;
      }
      throw new Error(`agent took more than ${Interpreter.MAX_TURNS} turns`);
    }
  }

  async ask(sessionId: string, text: string) {
    this.#text.set(sessionId, "");
    await this.#conn.prompt({ sessionId, prompt: [{ type: "text", text }] });
    const reply = this.#text.get(sessionId) ?? "";
    this.#text.delete(sessionId);
    return reply;
  }

  /** The first complete JSON object in the reply; agents sometimes send two, or prose around one. */
  static parse(raw: string): Record<string, unknown> {
    for (let start = raw.indexOf("{"); start >= 0; start = raw.indexOf("{", start + 1)) {
      let depth = 0, inString = false, escaped = false;
      for (let i = start; i < raw.length; i++) {
        const ch = raw[i];
        if (inString) { if (escaped) escaped = false; else if (ch === "\\") escaped = true; else if (ch === '"') inString = false; continue; }
        if (ch === '"') inString = true;
        else if (ch === "{") depth++;
        else if (ch === "}" && --depth === 0) {
          try { return JSON.parse(raw.slice(start, i + 1)); } catch { break; }
        }
      }
    }
    throw new Error(`no JSON object in agent reply: ${raw.slice(0, 200)}`);
  }
}

/** The single entry point: every method on every path lands here. */
class Runtime {
  private memory: Memory;
  private interpreter: Interpreter;
  port: SystemPort;
  constructor(memory: Memory, interpreter: Interpreter, base: string) {
    this.memory = memory; this.interpreter = interpreter;
    this.port = memory.port(base, { design: Interpreter.DESIGN, compile: Interpreter.COMPILE, judge: Interpreter.JUDGE, operate: Interpreter.PROMPT });
  }

  async handle(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? "/", "http://local");
    if (url.pathname === "/_system") return Runtime.send(res, 200, await this.memory.system());
    if (url.pathname === "/_teach" && req.method === "POST") {
      const { scope, instruction } = (await Runtime.readBody(req)) as { scope: string; instruction: string };
      await this.memory.teach(scope, instruction);
      return Runtime.send(res, 201, { scope, instruction });
    }

    if (url.pathname === "/_events") return Pulse.subscribe(res);
    if (url.pathname === "/_gate" && req.method === "POST") {
      const { path = "/", decision = "continue", note } = ((await Runtime.readBody(req)) ?? {}) as { path?: string; decision?: "continue" | "revise"; note?: string };
      const open = Pulse.gates.get(path);
      if (!open) return Runtime.send(res, 409, { error: "nothing is waiting on " + path });
      Pulse.gates.delete(path);
      open({ decision, note });
      Pulse.emit("gate", { path, decision });
      return Runtime.send(res, 200, { path, decision });
    }
    if (url.pathname === "/_draft") {
      const draft = Pulse.drafts.get(url.searchParams.get("path") ?? "/");
      if (!draft) return Runtime.send(res, 404, { error: "no draft" });
      const fresh = Object.keys(draft.spec.elements ?? {}).filter((id) => !draft.previous?.elements?.[id]);
      return Runtime.send(res, 200, render(draft.spec, {}, {}, { fresh }), "text/html; charset=utf-8");
    }
    // What a browser asks on its own is not an operation: without this, Safari's touch-icon probes woke the agent.
    if (/^\/(favicon\.ico|apple-touch-icon[\w-]*\.png|robots\.txt|manifest\.json|\.well-known\/.*)$/.test(url.pathname)) return res.writeHead(204).end();
    // The design system catalog is the static Storybook build (`pnpm build-storybook -o storybook-static`).
    if (url.pathname === "/_ds" || url.pathname.startsWith("/_ds/")) return Runtime.static(res, url.pathname);
    if (url.pathname === "/_design") {
      const body = render(DESIGN_SYSTEM.spec, DESIGN_SYSTEM.data);
      return Runtime.send(res, 200, Shell({ kernelCss: Kernel.css, kernelJs: Kernel.js, title: "design system", body, path: "/_design", tokens: await this.memory.tokens() }), "text/html; charset=utf-8");
    }
    if (url.pathname === "/_mcp") {
      const body = req.method === "POST" ? await Runtime.readBody(req) : undefined;
      return SystemMcp.handle(this.port, req, res, body);
    }
    // A gesture that did not come from this page's own palette (the MCP, another tab) is replayed on
    // every open page, so whoever watches sees the menu open and the words being typed.
    const gesture = { "/_intent": "intent", "/_feedback": "feedback", "/_accept": "accept" }[url.pathname];
    if (gesture && req.method === "POST") {
      const body = ((await Runtime.readBody(req)) ?? {}) as Record<string, string>;
      if (req.headers["x-origin"] !== "palette") {
        Pulse.emit("gesture", { tool: gesture, path: body.path ?? "/", text: body.intent ?? body.instruction ?? "", target: body.target });
      }
      const replay = { ...req, headers: req.headers } as IncomingMessage;
      (replay as any).parsed = body;
      if (gesture === "intent") return this.intent(replay, res);
      if (gesture === "feedback") return this.feedback(replay, res);
      return this.accept(replay, res);
    }
    if (url.pathname === "/_judge" && req.method === "POST") return this.judge(req, res);
    const match = { method: req.method ?? "GET", path: url.pathname };
    if (match.method === "GET" && String(req.headers.accept ?? "").includes("text/html")) return this.page(match.path, res);
    const body = await Runtime.readBody(req);
    const op = await this.memory.record({ ...match, query: url.search, headers: req.headers, body });
    try {
      const r = await this.resolve(op, match, body, req.headers, url.search);
      await this.memory.complete(op, r);
      res.setHeader("x-operation", String(op));
      res.setHeader("x-resolved-by", r.by);
      Runtime.send(res, r.status, r.body, r.content_type);
    } catch (e) {
      await this.memory.fail(op, String(e));
      Runtime.send(res, 500, { error: String(e), operation: String(op) });
    }
  }

  /** A page is a stored view rendered with fresh data; the model only runs when there is no view yet. */
  async page(path: string, res: ServerResponse) {
    const found = await this.memory.viewFor(path);
    let spec = found?.spec;
    const params = found?.params ?? {};
    let by = found && found.path !== path ? `view ${found.path}` : "view";
    if (!spec && path === "/" && (await this.memory.empty())) { spec = BOOTSTRAP; by = "bootstrap"; }
    // An agent is already designing: show the blank page with the drafting pill instead of starting a second
    // design on this GET (which also held the request open for minutes).
    if (!spec && Pulse.working > 0) { spec = BOOTSTRAP; by = "designing"; }
    if (!spec) {
      const teachings = [...(await this.memory.teachings({ method: "SYSTEM", path: "" })), ...(await this.memory.teachings({ method: "GET", path }))];
      const { ms, answer } = await this.interpreter.design({ goal: `write the view for GET ${path}`, teachings, preferences: await this.memory.preferences() }, (sql) => this.memory.app(sql));
      if (!answer.view) return Runtime.send(res, 404, { error: `no view for ${path}` });
      spec = answer.view;
      await this.memory.saveView(path, spec, { kind: "first_visit", ms });
      by = `agent (${ms} ms)`;
    }
    const { data, errors } = await this.memory.viewData(spec, params);
    if (Object.keys(errors).length) console.error(`[view ${path}] query errors`, errors);
    const body = (Object.keys(errors).length
      ? `<div role="alert" class="alert alert-error m-4 text-sm">a view ${path} tem query quebrada: ${Object.keys(errors).join(", ")}</div>` : "")
      + render(spec, data, params);
    res.setHeader("x-resolved-by", by);
    Runtime.send(res, 200, Shell({ kernelCss: Kernel.css, kernelJs: Kernel.js, title: spec.title ?? path, body, path, tokens: await this.memory.tokens(), bootstrap: by === "bootstrap" }), "text/html; charset=utf-8");
  }

  async intent(req: IncomingMessage, res: ServerResponse) {
    const body = ((await Runtime.readBody(req)) ?? {}) as { intent?: string; path?: string; preferences?: string; interactive?: boolean; from?: number };
    const { path = "/", preferences, from } = body;
    // Starting again from a phase already lived: the earlier approved phases come back, and a design waiting now is stopped.
    const lived = from ? await this.memory.phasesOf(path) : undefined;
    const intent = body.intent || lived?.intent;
    const interactive = Boolean(body.interactive || from);
    if (!intent) return Runtime.send(res, 400, { error: "intent is required" });
    if (from) { Pulse.gates.get(path)?.({ decision: "abort" }); Pulse.gates.delete(path); }
    await this.memory.teach("SYSTEM ", intent);
    const { ms, turns, tool_calls, answer } = await this.interpreter.design(
      { goal: `The owner just said what this should become. Write the view for GET ${path}.`, intent,
        preferences: preferences === "off" ? [] : await this.memory.preferences() },
      (sql) => this.memory.app(sql), path, interactive, from && lived ? { from, phases: lived.phases } : undefined);
    if (answer.view) await this.memory.saveView(path, answer.view, { kind: "intent", intent, ms, preferences: preferences !== "off" });
    // A design may also bring the views for its route templates (e.g. /notebooks/{id}).
    for (const extra of (answer as { views?: { path: string; view: Spec }[] }).views ?? []) {
      if (extra?.path && extra.view) await this.memory.saveView(extra.path, extra.view, { kind: "intent", intent, ms, template: true });
    }
    // Programs are matched against the actions of EVERY screen the design brought, not only the home:
    // the notebook screen's "add task" lives in the template view.
    await this.memory.adopt(answer.programs, answer.view, ((answer as { views?: { view: Spec }[] }).views ?? []).map((x) => x.view));
    if (answer.tokens) await this.memory.saveTokens(answer.tokens, { kind: "intent", intent });
    Runtime.send(res, 200, { ms, turns, tool_calls, view: Boolean(answer.view), tokens: Boolean(answer.tokens) });
  }

  async feedback(req: IncomingMessage, res: ServerResponse) {
    const { path, target, instruction } = (await Runtime.readBody(req)) as Record<string, string>;
    // Feedback on /notebooks/notebook:x edits the /notebooks/{id} view it came from, not a new one.
    const found = await this.memory.viewFor(path);
    const current = found?.spec ?? BOOTSTRAP;
    const viewPath = found?.path ?? path;
    const { ms, answer } = await this.interpreter.design(
      { goal: "The owner pointed at an element and said what should change. Return the whole updated view, or tokens.",
        path, target, element: current.elements[target], instruction, view: current, tokens: await this.memory.tokens(),
        preferences: await this.memory.preferences() },
      (sql) => this.memory.app(sql));
    const origin = { kind: "feedback", target, instruction, ms };
    if (answer.view) await this.memory.saveView(viewPath, answer.view, origin);
    await this.memory.adopt(answer.programs, answer.view);
    if (answer.tokens) await this.memory.saveTokens({ ...(await this.memory.tokens()), ...answer.tokens }, origin);
    Runtime.send(res, 200, { ms, view: Boolean(answer.view), tokens: Boolean(answer.tokens) });
  }

  /**
   * Acceptance closes a journey. Its length is the metric — prompts until the owner said yes —
   * and its corrections are compiled into scoped preferences that every later design task reads.
   */
  async accept(req: IncomingMessage, res: ServerResponse) {
    const { path = "/" } = ((await Runtime.readBody(req)) ?? {}) as { path?: string };
    const views = await this.memory.journey(path);
    if (!views.length) return Runtime.send(res, 400, { error: `nothing to accept at ${path}` });
    const steps = views.map((v, i) => ({
      version: i + 1, origin: v.origin, elements: Object.keys(v.spec.elements).length, spec: v.spec }));
    const { ms, answer } = await this.interpreter.compile({
      path, steps, existing: await this.memory.preferences() }, (sql) => this.memory.app(sql));
    const ids = views.map((v) => v.id);
    const created = [];
    for (const p of answer.preferences ?? []) created.push(await this.memory.prefer(p, ids));
    const turns = views.filter((v) => ["intent", "feedback"].includes(v.origin?.kind)).length;
    const corrections = views.filter((v) => v.origin?.kind === "feedback").length;
    await this.memory.accept(path, turns, corrections, views.at(-1)!.id, created);
    Runtime.send(res, 200, { path, turns_to_accept: turns, corrections_to_accept: corrections, preferences: answer.preferences ?? [], ms });
  }

  /** Blind audit: the judge sees two first drafts as A and B in random order, and the preferences. */
  async judge(req: IncomingMessage, res: ServerResponse) {
    const { control, treatment } = ((await Runtime.readBody(req)) ?? {}) as { control: string; treatment: string };
    const preferences = await this.memory.preferences();
    const [c, t] = [await this.memory.view(control), await this.memory.view(treatment)];
    if (!c || !t) return Runtime.send(res, 400, { error: "both paths need a view" });
    const flip = Math.random() < 0.5;
    const { ms, answer } = await this.interpreter.judge({
      preferences: preferences.map((p) => `[${p.scope}] ${p.rule}`), a: flip ? t : c, b: flip ? c : t });
    const [ctl, trt] = flip ? [answer.b, answer.a] : [answer.a, answer.b];
    const score = (xs: boolean[] = []) => `${xs.filter(Boolean).length}/${preferences.length}`;
    Runtime.send(res, 200, { control: score(ctl), treatment: score(trt), flip, notes: answer.notes, ms });
  }

  /**
   * capability → program → learning → agent, cheapest first. A program is the agent's own SurrealQL for a
   * family of operations; it runs without a model once the agent wrote the same one twice.
   */
  async resolve(op: RecordId, match: Match, body: unknown, headers: IncomingMessage["headers"], query: string): Promise<Resolution> {
    const capability = await this.memory.find<{ id: RecordId; behavior: Behavior }>("capability", match);
    if (capability) return { ...Runtime.staticBody(capability.behavior), by: String(capability.id) };

    const program = await this.memory.program(match);
    // A program answers the known shape. A request that brings new instructions is asking for something the
    // program was not written for, so the agent takes it.
    const instructed = typeof (body as { instructions?: unknown })?.instructions === "string" && (body as { instructions: string }).instructions.trim() !== "";
    if (program?.promoted && !instructed) {
      try {
        const started = Date.now();
        const result = (await this.memory.app(program.sql, { ...program.params, data: (body as any)?.data ?? {} })) as unknown[];
        const last = result.at(-1);
        const out = program.one && Array.isArray(last) ? last[0] : last;
        await this.memory.witness(program.id, op, "ran");
        return { status: program.status, body: out, by: `${program.id} (${Date.now() - started} ms)` };
      } catch (e) {
        // A program that breaks goes back to being a candidate; the agent answers this one.
        await this.memory.demote(program.id, String(e));
      }
    }

    const learning = await this.memory.find<Parameters<Memory["confirm"]>[1]>("learning", match);
    if (learning) {
      const promoted = await this.memory.confirm(op, learning);
      return { ...Runtime.staticBody(learning.behavior), by: `${learning.id}${promoted ? " (promoted)" : ""}` };
    }

    const accept = String(headers.accept ?? "application/json");
    const teachings = await this.memory.teachings(match);
    const { transcript, ms, answer } = await this.interpreter.resolve(
      { ...match, accept, query, body, teachings, screens: await this.memory.contracts() }, (sql) => this.memory.app(sql));
    await this.memory.execution(op, this.interpreter.agent, transcript, ms);
    const written = (answer as { program?: Program }).program;
    if (written?.sql && written.route && Memory.routeMatch(written.route, match.path)) {
      await this.memory.propose(op, match.method, written);
    }
    if (answer.reusable && !answer.side_effects) {
      await this.memory.learn(op, match,
        { type: "static_response", status: answer.status, body: answer.body, content_type: answer.content_type });
    }
    return { status: answer.status, body: answer.body, content_type: answer.content_type, by: `agent (${ms} ms)` };
  }

  static staticBody(b: Behavior) { return { status: b.status, body: b.body, content_type: b.content_type }; }

  static async static(res: ServerResponse, pathname: string) {
    if (pathname === "/_ds") return res.writeHead(308, { location: "/_ds/" }).end();
    const root = join(HERE, "storybook-static");
    const rel = decodeURIComponent(pathname.slice("/_ds/".length)) || "index.html";
    const file = join(root, rel);
    if (!file.startsWith(root)) return res.writeHead(403).end();
    try {
      const body = await readFile(file);
      const types: Record<string, string> = { html: "text/html; charset=utf-8", js: "text/javascript", mjs: "text/javascript", css: "text/css",
        json: "application/json", svg: "image/svg+xml", png: "image/png", woff2: "font/woff2", map: "application/json" };
      res.writeHead(200, { "content-type": types[file.split(".").pop() ?? ""] ?? "application/octet-stream" }).end(body);
    } catch {
      res.writeHead(404, { "content-type": "text/plain" }).end("storybook not built: pnpm build-storybook -o storybook-static");
    }
  }

  static async readBody(req: IncomingMessage) {
    if ((req as any).parsed !== undefined) return (req as any).parsed;
    let text = "";
    for await (const chunk of req) text += chunk;
    if (!text) return null;
    // HTMX sends forms urlencoded: the fields are the operation's data, as the JSON clients send it.
    if (String(req.headers["content-type"]).includes("application/x-www-form-urlencoded")) {
      const fields = Object.fromEntries(new URLSearchParams(text));
      return req.url?.startsWith("/_") ? fields : { data: fields };
    }
    try { return JSON.parse(text); } catch { return text; }
  }

  static send(res: ServerResponse, status: number, body: unknown, contentType = "application/json") {
    const raw = typeof body === "string" && !contentType.includes("json");
    res.writeHead(status, { "content-type": contentType }).end(raw ? body : JSON.stringify(jsonSafe(body)));
  }
}

async function main() {
  const args = process.argv.slice(2);
  const flag = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
  const slug = flag("--slug");
  const port = Number(flag("--port") ?? (slug ? await Caddy.freePort() : 3000));
  mkdirSync(join(HERE, ".run"), { recursive: true });
  // --new starts a blank system in the current directory: the whole backend is .system/.
  const fresh = args.includes("--new");
  if (fresh) mkdirSync(join(process.cwd(), ".system"), { recursive: true });
  const db = flag("--db") ?? `surrealkv://${fresh ? join(process.cwd(), ".system", "system.skv") : join(HERE, ".run", "backend.skv")}`;

  const memory = await Memory.open(db);
  const base = `http://localhost:${port}`;
  const tools = flag("--tools") ?? "json";
  const interpreter = await Interpreter.start(flag("--agent") ?? "claude-agent-acp", tools === "mcp" ? `${base}/_mcp` : undefined);
  const runtime = new Runtime(memory, interpreter, base);
  Interpreter.remember = (p) => memory.prefer(p, []);
  Interpreter.keep = (p) => memory.keepPhase(p);
  createServer((req, res) => void runtime.handle(req, res).catch((e) => Runtime.send(res, 500, { error: String(e) }))).listen(port, () =>
    console.error(`backend on :${port} · db ${db} · agent ${interpreter.agent} · tools ${tools}`));
  let url = `http://localhost:${port}/`;
  if (slug) {
    url = `${await Caddy.publish(slug, port)}/`;
    console.error(`published ${url}`);
    const leave = () => { void Caddy.unpublish(slug).finally(() => process.exit(0)); };
    process.on("SIGINT", leave).on("SIGTERM", leave);
  }
  if (fresh && !args.includes("--no-open")) execFile("open", [url]);
}

main().catch((e) => { console.error(e); process.exit(1); });
