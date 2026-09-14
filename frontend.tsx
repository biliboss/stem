#!/usr/bin/env -S ../../node_modules/.bin/tsx
/** @jsx h */
/** @jsxFrag Fragment */
// frontend — a TODO app whose backend was never written. Every action is a request
// to backend.ts carrying data and instructions; the page is JSX rendered to strings,
// and HTMX swaps the fragments.
//   frontend [--port 4000] [--backend http://localhost:3999]
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

type Child = string | number | boolean | null | undefined | Child[];
type Todo = { id: string; title: string; completed: boolean };

const VOID = new Set(["input", "meta", "br", "img", "link"]);
function h(tag: string | ((p: any) => string), props: Record<string, unknown> | null, ...children: Child[]): string {
  if (typeof tag === "function") return tag({ ...props, children });
  const attrs = Object.entries(props ?? {})
    .filter(([, v]) => v !== false && v != null)
    .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${escape(String(v))}"`))
    .join("");
  return VOID.has(tag) ? `<${tag}${attrs}>` : `<${tag}${attrs}>${render(children)}</${tag}>`;
}
function Fragment({ children }: { children: Child[] }) { return render(children); }
/** Strings from JSX are already HTML; only data gets escaped, through `text()`. */
function render(c: Child): string { return Array.isArray(c) ? c.map(render).join("") : c == null || c === false ? "" : String(c); }
function escape(s: string) { return s.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`); }
const text = (s: unknown) => escape(String(s ?? ""));

declare global { namespace JSX { type Element = string; interface IntrinsicElements { [tag: string]: any } } }

namespace Components {
  export function Page({ todos, error }: { todos: Todo[]; error?: string }) {
    return "<!doctype html>" + (
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>todo · backendless</title>
          <script src="https://unpkg.com/htmx.org@2.0.4"></script>
          <style>{`
            body { font: 15px/1.5 system-ui; max-width: 520px; margin: 48px auto; padding: 0 16px; }
            form { display: flex; gap: 8px; } input[name=title] { flex: 1; padding: 8px; }
            ul { list-style: none; padding: 0; } li { display: flex; gap: 8px; align-items: center; padding: 6px 0; border-bottom: 1px solid #eee; }
            li.done span { text-decoration: line-through; color: #999; } li span { flex: 1; }
            .htmx-request { opacity: .5; } #busy { display: none; color: #888; } .htmx-request#busy, .htmx-request #busy { display: inline; }
            .error { color: #b00; } small { color: #888; }
          `}</style>
        </head>
        <body hx-indicator="#busy">
          <h1>todo</h1>
          <form hx-post="/add" hx-target="#list" hx-swap="outerHTML" hx-on--after-request="this.reset()">
            <input name="title" placeholder="o que precisa ser feito?" required autofocus />
            <button>adicionar</button>
          </form>
          <p><small>cada ação pergunta ao backend <span id="busy">· pensando…</span></small></p>
          <List todos={todos} error={error} />
        </body>
      </html>
    );
  }

  export function List({ todos, error }: { todos: Todo[]; error?: string }) {
    return (
      <div id="list">
        {error && <p class="error">{text(error)}</p>}
        <ul>
          {todos.map((t) => (
            <li class={t.completed ? "done" : ""}>
              <input type="checkbox" checked={t.completed}
                hx-post={`/toggle?id=${encodeURIComponent(t.id)}&completed=${!t.completed}`}
                hx-target="#list" hx-swap="outerHTML" />
              <span>{text(t.title)}</span>
              <button hx-post={`/delete?id=${encodeURIComponent(t.id)}`} hx-target="#list" hx-swap="outerHTML">×</button>
            </li>
          ))}
        </ul>
        {todos.length === 0 && !error && <p><small>nenhuma tarefa</small></p>}
      </div>
    );
  }
}

/** The whole backend contract of this app: a path, some data, and what it means. */
class Api {
  constructor(readonly base: string) {}

  async call(method: string, path: string, data?: unknown, instructions?: string) {
    const res = await fetch(this.base + path, {
      method,
      headers: { "content-type": "application/json" },
      body: method === "GET" ? undefined : JSON.stringify({ data, instructions }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${JSON.stringify(body)}`);
    return body;
  }

  async todos(): Promise<Todo[]> {
    const body = await this.call("GET", "/todos");
    const list = Array.isArray(body) ? body : body.todos ?? body.items ?? [];
    return list.map((t: any) => ({ id: String(t.id), title: t.title, completed: Boolean(t.completed) }));
  }
  add(title: string) {
    return this.call("POST", "/todos", { title }, "Crie uma tarefa pendente. Responda a tarefa criada com id, title e completed.");
  }
  toggle(id: string, completed: boolean) {
    return this.call("POST", `/todos/${id}/complete`, { completed }, "Marque a tarefa como completed = data.completed.");
  }
  remove(id: string) {
    return this.call("DELETE", `/todos/${id}`, undefined, "Apague essa tarefa.");
  }
}

async function main() {
  const args = process.argv.slice(2);
  const flag = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
  const port = Number(flag("--port") ?? 4000);
  const api = new Api(flag("--backend") ?? "http://localhost:3999");

  const form = async (req: IncomingMessage) => {
    let raw = ""; for await (const c of req) raw += c;
    return new URLSearchParams(raw);
  };
  const html = (res: ServerResponse, body: string) =>
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(body);
  const list = async (res: ServerResponse, action?: () => Promise<unknown>) => {
    try {
      await action?.();
      html(res, <Components.List todos={await api.todos()} />);
    } catch (e) {
      html(res, <Components.List todos={[]} error={String(e)} />);
    }
  };

  createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://local");
    const id = url.searchParams.get("id") ?? "";
    if (req.method === "GET" && url.pathname === "/") {
      const todos = await api.todos().catch((e) => ({ error: String(e) }));
      return html(res, Array.isArray(todos) ? <Components.Page todos={todos} /> : <Components.Page todos={[]} error={todos.error} />);
    }
    if (url.pathname === "/add") { const title = (await form(req)).get("title") ?? ""; return list(res, () => api.add(title)); }
    if (url.pathname === "/toggle") return list(res, () => api.toggle(id, url.searchParams.get("completed") === "true"));
    if (url.pathname === "/delete") return list(res, () => api.remove(id));
    res.writeHead(404).end();
  }).listen(port, () => console.error(`frontend on :${port} · backend ${api.base}`));
}

main();
