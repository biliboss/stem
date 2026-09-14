// mcp — /_mcp, the meta MCP of the system. It tells an agent what exists (resources), lets it
// change things only through the runtime (tools), and carries the instructions for operating
// the system (prompts). Stateless: one McpServer per HTTP request, as the SDK recommends.
import { request, type IncomingMessage, type ServerResponse } from "node:http";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

/** What /_mcp needs from the runtime; kept narrow so the MCP cannot reach around it. */
export type SystemPort = {
  schema(): Promise<unknown>;
  views(): Promise<{ path: string; versions: number }[]>;
  view(path: string): Promise<unknown>;
  journey(path: string): Promise<unknown>;
  preferences(): Promise<unknown>;
  capabilities(): Promise<unknown>;
  query(sql: string): Promise<unknown>;
  teach(scope: string, instruction: string): Promise<void>;
  sketch(path: string, view: unknown, note: string): Promise<void>;
  design(path: string): Promise<unknown>;
  prefer(p: { scope: string; rule: string }): Promise<unknown>;
  prompts: Record<string, string>;
  base: string;
};

export const SystemMcp = {
  INSTRUCTIONS: `This server IS the system you operate. Read before you write: system://schema for the
application tables, system://views and system://view/{path} for screens, system://preferences for what the
owner accepted before, system://capabilities for what already runs without a model.
Change state with the query tool (application tables only) or the request tool (an HTTP operation through the
runtime, recorded like any client's). Never try to reach the database another way.`,

  build(port: SystemPort) {
    const mcp = new McpServer({ name: "system", version: "0.1.0" }, { instructions: SystemMcp.INSTRUCTIONS });
    const json = (uri: string, value: unknown) => ({ contents: [{ uri, mimeType: "application/json", text: JSON.stringify(value, null, 2) }] });

    mcp.registerResource("schema", "system://schema", { description: "INFO FOR DB: the application tables" },
      async (uri) => json(uri.href, await port.schema()));
    mcp.registerResource("views", "system://views", { description: "Every path that has a view, with its version count" },
      async (uri) => json(uri.href, await port.views()));
    mcp.registerResource("view", new ResourceTemplate("system://view/{path}", { list: undefined }),
      { description: "The current spec of a view; path is URL-encoded, e.g. system://view/%2F" },
      async (uri, { path }) => json(uri.href, await port.view(decodeURIComponent(String(path)))));
    mcp.registerResource("journey", new ResourceTemplate("system://journey/{path}", { list: undefined }),
      { description: "Every version of a view since its last acceptance, with the instruction behind each" },
      async (uri, { path }) => json(uri.href, await port.journey(decodeURIComponent(String(path)))));
    // The fold, for agents: the phase a design is in, its text, whether it waits for an answer, and the current draft.
    mcp.registerResource("design", new ResourceTemplate("system://design/{path}", { list: undefined }),
      { description: "The interactive design on a path: current phase, its text, waiting (answer with the gate tool), and the draft view" },
      async (uri, { path }) => json(uri.href, await port.design(decodeURIComponent(String(path)))));
    mcp.registerResource("preferences", "system://preferences", { description: "Rules compiled from accepted journeys, scoped" },
      async (uri) => json(uri.href, await port.preferences()));
    mcp.registerResource("capabilities", "system://capabilities", { description: "Behaviors already compiled: no model runs for these" },
      async (uri) => json(uri.href, await port.capabilities()));

    mcp.registerTool("query", {
      description: "Run SurrealQL on the application tables. Operational tables are refused.",
      inputSchema: { sql: z.string() },
    }, async ({ sql }) => {
      try { return { content: [{ type: "text", text: JSON.stringify(await port.query(sql)) }] }; }
      catch (e) { return { isError: true, content: [{ type: "text", text: String(e) }] }; }
    });
    mcp.registerTool("request", {
      description: "Send an HTTP operation through the runtime, exactly as a client would; it is recorded.",
      inputSchema: { method: z.string(), path: z.string(), data: z.record(z.string(), z.unknown()).optional(), instructions: z.string().optional() },
    }, async ({ method, path, data, instructions }) => {
      const res = await fetch(port.base + path, {
        method, headers: { "content-type": "application/json" },
        body: method === "GET" ? undefined : JSON.stringify({ data, instructions }),
      });
      return { content: [{ type: "text", text: `${res.status} ${await res.text()}` }] };
    });
    // The screen's three gestures, so an agent can shape the system exactly as the owner does.
    // node:http, not fetch: a design can take minutes, and undici's fetch drops the response at 300 s.
    const runtime = (path: string, body: object) => new Promise<{ isError: boolean; content: { type: "text"; text: string }[] }>((resolve) => {
      const payload = JSON.stringify(body);
      const req = request(port.base + path, { method: "POST", headers: { "content-type": "application/json", "content-length": Buffer.byteLength(payload) } }, (res) => {
        let text = ""; res.on("data", (c) => (text += c));
        res.on("end", () => resolve({ isError: (res.statusCode ?? 500) >= 400, content: [{ type: "text", text: `${res.statusCode} ${text}` }] }));
      });
      req.on("error", (e) => resolve({ isError: true, content: [{ type: "text", text: String(e) }] }));
      req.end(payload);
    });
    mcp.registerTool("intent", {
      description: "Say what a path should become; an agent writes its view. Same as ⌘K. interactive: true is ⌘↵ — the design stops after each phase; read system://design/{path} and answer with gate. path defaults to /.",
      inputSchema: { intent: z.string(), path: z.string().optional(), interactive: z.boolean().optional() },
    }, ({ intent, path, interactive }) => runtime("/_intent", { intent, path, interactive }));
    mcp.registerTool("gate", {
      description: "Answer an interactive design waiting on a path: continue, or revise the current phase with a note. Same as ⌘↵ / typing in the fold. Read system://design/{path} first to see the phase text.",
      inputSchema: { path: z.string(), decision: z.enum(["continue", "revise"]), note: z.string().optional() },
    }, ({ path, decision, note }) => runtime("/_gate", { path, decision, note }));
    mcp.registerTool("feedback", {
      description: "Point at an element of a view (its data-system-id, or 'page') and say what should change. Same as right click.",
      inputSchema: { path: z.string(), target: z.string(), instruction: z.string() },
    }, ({ path, target, instruction }) => runtime("/_feedback", { path, target, instruction }));
    mcp.registerTool("accept", {
      description: "The current view of a path is what the owner wanted: close the journey and compile preferences. Same as ✓ aceitar.",
      inputSchema: { path: z.string() },
    }, ({ path }) => runtime("/_accept", { path }));

    mcp.registerTool("sketch", {
      description: "While designing, show the partial view on every open page of that path: call it once with the skeleton (root and sections, children may not exist yet) and again after each section. Nothing is saved; the final JSON reply still is the view.",
      inputSchema: { path: z.string(), view: z.record(z.string(), z.unknown()), note: z.string().optional() },
    }, async ({ path, view, note }) => {
      await port.sketch(path, view, note ?? "");
      return { content: [{ type: "text", text: "sketched" }] };
    });

    mcp.registerTool("prefer", {
      description: "Record a scoped preference the designers apply from now on: scope 'global', 'kind:landing', 'phase:entendendo'…",
      inputSchema: { scope: z.string(), rule: z.string() },
    }, async ({ scope, rule }) => { await port.prefer({ scope, rule }); return { content: [{ type: "text", text: "preferred" }] }; });

    mcp.registerTool("teach", {
      description: "Record what an operation means, ahead of its use. scope is 'METHOD /path' or 'SYSTEM '.",
      inputSchema: { scope: z.string(), instruction: z.string() },
    }, async ({ scope, instruction }) => {
      await port.teach(scope, instruction);
      return { content: [{ type: "text", text: "taught" }] };
    });

    for (const [name, text] of Object.entries(port.prompts)) {
      mcp.registerPrompt(name, { description: `The ${name} instructions of this system` },
        () => ({ messages: [{ role: "user", content: { type: "text", text } }] }));
    }
    return mcp;
  },

  async handle(port: SystemPort, req: IncomingMessage, res: ServerResponse, body: unknown) {
    const mcp = SystemMcp.build(port);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => { void transport.close(); void mcp.close(); });
    await mcp.connect(transport);
    await transport.handleRequest(req, res, body);
  },
};
