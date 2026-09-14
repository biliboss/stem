/** @jsx h */
/** @jsxFrag Fragment */
// view — the UI DSL. A view is a JSON spec the agent writes once: a flat map of
// addressable elements (json-render / A2UI shape) plus the SurrealQL that feeds it.
// Rendering is deterministic: spec + query results → JSX → DaisyUI 5 + HTMX 2.
// Every element carries data-system-id, so the page can be edited by pointing at it.

export type Action = { method: string; path: string; data?: Record<string, unknown>; confirm?: string };
export type Element = {
  type: keyof typeof Catalog.components;
  props?: Record<string, unknown>;
  children?: string[];
  repeat?: { path: string; key?: string };
  action?: Action;
};
export type Spec = { v: 1; title?: string; root: string; data?: Record<string, string>; elements: Record<string, Element>; routes?: string[] };
type Data = Record<string, unknown>;

type Child = string | number | boolean | null | undefined | Child[];
const VOID = new Set(["input", "meta", "br", "img", "link", "hr"]);
export function h(tag: string | ((p: any) => string), props: Record<string, unknown> | null, ...children: Child[]): string {
  if (typeof tag === "function") return tag({ ...props, children });
  const attrs = Object.entries(props ?? {})
    .filter(([, v]) => v !== false && v != null)
    .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${escape(String(v))}"`))
    .join("");
  return VOID.has(tag) ? `<${tag}${attrs}>` : `<${tag}${attrs}>${flat(children)}</${tag}>`;
}
export function Fragment({ children }: { children: Child[] }) { return flat(children); }
function flat(c: Child): string { return Array.isArray(c) ? c.map(flat).join("") : c == null || c === false ? "" : String(c); }
function escape(s: string) { return s.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`); }
declare global { namespace JSX { type Element = string; interface IntrinsicElements { [tag: string]: any } } }

/** Bindings: {"$item": "title"} · {"$data": "/todos/0/title"} · "{$item.id}" inside strings. */
namespace Binding {
  export type Scope = { data: Data; item?: Record<string, unknown>; params?: Record<string, string>; path?: string };

  export function pointer(root: unknown, path: string): unknown {
    return path.split("/").filter(Boolean).reduce<any>((o, k) => (o == null ? undefined : o[k]), root);
  }

  export function resolve(value: unknown, scope: Scope): unknown {
    if (typeof value === "string") {
      return value.replace(/\{\$(item|data|param)\.?([^}]*)\}/g, (_m, src, p) =>
        String((src === "item" ? pointer(scope.item, p.replaceAll(".", "/")) : src === "param" ? scope.params?.[p] : pointer(scope.data, p)) ?? ""));
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const o = value as Record<string, unknown>;
      if (typeof o.$item === "string") return pointer(scope.item, o.$item.replaceAll(".", "/"));
      if (typeof o.$data === "string") return pointer(scope.data, o.$data);
      if (typeof o.$param === "string") return scope.params?.[o.$param];
      // {"$eq": [a, b]} — the one comparison a screen needs: is this row the one in the URL?
      if (Array.isArray(o.$eq)) { const [a, b] = o.$eq.map((v) => String(resolve(v, scope) ?? "")); return a === b; }
      if ("$not" in o) return !resolve(o.$not, scope);
      if ("$count" in o) { const v = resolve(o.$count, scope); return Array.isArray(v) ? v.length : 0; }
      return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, resolve(v, scope)]));
    }
    return value;
  }
}

/** The native components. Each one is a function of (resolved props, rendered children, element). */
export namespace Catalog {
  type Render = (p: any, children: string, el: { id: string; action?: Action }) => string;

  const act = (a: Action | undefined) => a && {
    [`hx-${a.method.toLowerCase()}`]: a.path,
    "hx-vals": a.data ? JSON.stringify(a.data) : undefined,
    "hx-confirm": a.confirm,
    "hx-swap": "none",
  };

  export const components = {
    Page: ((p, c) => <main class={`kernel-page mx-auto w-full ${p.wide ? "max-w-[80rem]" : "max-w-[44rem]"} px-6 pt-16 pb-24 flex flex-col gap-10`}>{p.title && <h1 class="kernel-display">{escape(p.title)}</h1>}{c}</main>) as Render,
    /** An app shell: the first child is the sidebar, the rest is the content. Stacks under lg. */
    Split: ((_p, c) => <div class="kernel-split">{c}</div>) as Render,
    Sidebar: ((p, c) => <aside class="kernel-sidebar">{p.title && <p class="kernel-sidebar-title">{escape(p.title)}</p>}<nav class="flex flex-col gap-0.5">{c}</nav></aside>) as Render,
    Link: ((p) => <a class={`kernel-link ${p.active ? "is-active" : ""}`} href={p.href} aria-current={p.active ? "page" : undefined}>
      {p.dot && <span class="kernel-dot" style={`background:${escape(String(p.dot))}`}></span>}<span class="truncate">{escape(String(p.label ?? ""))}</span>
      {p.meta != null && p.meta !== "" && <span class="kernel-meta">{escape(String(p.meta))}</span>}</a>) as Render,
    // color is a tone name (primary, error, success…) or any CSS color; agents reach for tone names first.
    Tag: ((p) => { const c = String(p.color ?? ""); const tone = /^(primary|secondary|accent|neutral|info|success|warning|error)$/.test(c);
      return <span class="kernel-tag" style={c ? `--tag:${tone ? `var(--color-${c})` : escape(c)}` : undefined}>{escape(String(p.text ?? ""))}</span>; }) as Render,
    Select: ((p) => <label class="flex flex-col gap-1">{p.label && <span class="text-sm">{escape(p.label)}</span>}<select class="select" name={p.name}>
      {(Array.isArray(p.options) ? p.options : []).map((o: any) => <option value={o.value} selected={String(o.value) === String(p.value ?? "")}>{escape(String(o.label ?? o.value))}</option>)}</select></label>) as Render,
    Stack: ((p, c) => <div class={`flex ${p.direction === "row" ? "flex-row items-center" : "flex-col"} gap-${p.gap ?? 3}`}>{c}</div>) as Render,
    Card: ((p, c) => <section class="kernel-section flex flex-col gap-4 pt-6">{p.title && <h2 class="kernel-heading">{escape(p.title)}</h2>}{c}</section>) as Render,
    Heading: ((p) => <h2 class="kernel-heading">{escape(String(p.text ?? ""))}</h2>) as Render,
    Text: ((p) => p.meta
      ? <span class="kernel-meta">{escape(String(p.text ?? ""))}</span>
      : <p class={`max-w-[65ch] ${p.muted ? "kernel-muted" : ""}`} style={p.strike ? "text-decoration:line-through;text-decoration-thickness:1px" : undefined}>{escape(String(p.text ?? ""))}</p>) as Render,
    Badge: ((p) => <span class={`badge badge-${p.tone ?? "neutral"}`}>{escape(String(p.text ?? ""))}</span>) as Render,
    Stat: ((p) => <div class="flex flex-col gap-1"><span class="text-sm kernel-muted">{escape(String(p.label ?? ""))}</span><span class="kernel-figure">{escape(String(p.value ?? ""))}</span></div>) as Render,
    Form: ((p, c, el) => <form class={`flex ${p.inline ? "flex-col sm:flex-row sm:items-end" : "flex-col"} gap-2 [&_label]:min-w-0`} {...act(el.action)} hx-swap="none" hx-on--after-request="if(event.detail.successful){this.reset()}">{c}</form>) as Render,
    Input: ((p) => <label class="form-control flex-1">{p.label && <span class="label-text text-sm">{escape(p.label)}</span>}<input class="input input-bordered w-full" name={p.name} placeholder={p.placeholder} type={p.inputType ?? "text"} required={p.required} /></label>) as Render,
    Textarea: ((p) => <label class="form-control">{p.label && <span class="label-text text-sm">{escape(p.label)}</span>}<textarea class="textarea textarea-bordered w-full" name={p.name} rows={p.rows ?? 4} placeholder={p.placeholder} required={p.required}></textarea></label>) as Render,
    Button: ((p, _c, el) => <button class={`btn btn-${p.tone ?? "primary"} ${p.size === "sm" ? "btn-sm" : ""}`} type={p.submit ? "submit" : "button"} {...(p.submit ? {} : act(el.action))}>{escape(String(p.label ?? ""))}</button>) as Render,
    Checkbox: ((p, _c, el) => <input type="checkbox" class="checkbox" checked={Boolean(p.checked)} {...act(el.action)} />) as Render,
    List: ((p, c) => <ul class="flex flex-col border-t border-base-300">{c}{!c && p.empty && <li class="py-4 kernel-muted">{escape(p.empty)}</li>}</ul>) as Render,
    /** Kernel-only: the screen of a system that was never told anything. Not offered to the agent. */
    Blank: ((p) => <main class="kernel-blank"><h1 class="kernel-display">{escape(String(p.title ?? ""))}</h1>
      <p class="kernel-hint"><kbd class="kbd">⌘</kbd><kbd class="kbd">K</kbd> <span>{escape(String(p.hint ?? ""))}</span></p>
      <p class="kernel-hint"><kbd class="kbd">g</kbd><kbd class="kbd">d</kbd> <span>o design system</span></p></main>) as Render,
    /** Kernel-only: the tokens of the current theme, read live from the CSS variables. */
    Swatches: ((p) => <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">{(p.tokens as string[]).map((t) =>
      <div class="flex flex-col gap-2"><span class="h-14 rounded-box border border-base-300" style={`background: var(${t})`}></span>
        <span class="kernel-meta !ml-0 !pl-0">{escape(t.replace("--color-", ""))}</span></div>)}</div>) as Render,
    /** A diagram: the source is text the agent writes; the browser renders it and makes it zoomable. */
    Mermaid: ((p) => <figure class="kernel-figure-block"><div class="kernel-zoom h-[min(28rem,60vh)]" data-mermaid>{escape(String(p.code ?? ""))}</div>
      <ZoomBar />{p.caption && <figcaption class="kernel-meta !ml-0 !pl-0">{escape(p.caption)}</figcaption>}</figure>) as Render,
    Image: ((p) => <figure class="kernel-figure-block"><img class="kernel-image" src={p.src} alt={p.alt ?? ""} loading="lazy" data-lightbox />
      {p.caption && <figcaption class="kernel-meta !ml-0 !pl-0">{escape(p.caption)}</figcaption>}</figure>) as Render,
    Code: ((p) => <figure class="kernel-figure-block kernel-code"><div class="flex items-center justify-between px-4 py-2 border-b border-base-300">
      <span class="kernel-meta !ml-0 !pl-0">{escape(String(p.lang ?? "texto"))}</span><button class="btn btn-xs btn-ghost" type="button" data-copy>copiar</button></div>
      <pre class="overflow-auto p-4 text-sm"><code>{escape(String(p.code ?? ""))}</code></pre></figure>) as Render,
    Markdown: ((p) => <div class="kernel-prose" data-markdown>{escape(String(p.text ?? ""))}</div>) as Render,
    Row: ((_p, c) => <li class="flex flex-row items-center gap-4 py-3 border-b border-base-300">{c}</li>) as Render,
  };

  function ZoomBar() {
    return <div class="kernel-zoombar"><button type="button" class="btn btn-xs btn-ghost" data-zoom-step="0.8" aria-label="afastar">−</button>
      <button type="button" class="btn btn-xs btn-ghost" data-zoom-step="0" aria-label="ajustar">1:1</button>
      <button type="button" class="btn btn-xs btn-ghost" data-zoom-step="1.25" aria-label="aproximar">+</button></div>;
  }

  /** What the agent reads to write a spec. Kept next to the components so they cannot drift. */
  export const TOKENS = `Design tokens are DaisyUI 5 CSS variables, e.g. {"--color-primary":"oklch(65% .2 250)",
"--color-base-100":"…","--radius-box":"0.25rem","--radius-field":"0.25rem","--size-field":"0.22rem","--border":"1px"}.
A change like "more compact" or "less rounded" is a token change, not a view change.`;

  export const DOC = `A view is JSON: {"v":1,"title":str,"root":id,"data":{name: SurrealQL},"elements":{id: element}}.
element = {"type", "props"?, "children"?: [id], "repeat"?: {"path": "/name", "key": "id"}, "action"?: {"method","path","data"?,"confirm"?}}
Element ids are semantic and stable (e.g. "pending.item.complete"); they are how the owner points at things.
"data" queries run on every render; results are bound by JSON pointer.
A view may serve a ROUTE TEMPLATE: return {"view", "path": "/notebooks/{id}"}; its queries read $id (a record id
"table:id" as a string: use type::record($id)) and bindings read {"$param":"id"} or "{$param.id}".
{"$eq":[a,b]} compares two bindings (e.g. active link: {"$eq":[{"$item":"id"},{"$param":"id"}]}). Links are plain hrefs. A "repeat" element is a template rendered once per row (put it on the Row, inside the List); inside it, $item is the row.
Every "data" query must run as written: SurrealQL ORDER BY fields must be in the SELECT list, and record ids come back as "table:id".
Bindings in props, action.path and action.data: {"$item":"title"} · {"$data":"/todos"} · {"$count":{"$data":"/todos"}} · {"$not":…} · "text {$item.id}".
Components and props:
  Page{title} Stack{direction:"row"|"col",gap} Card{title} Heading{text} Text{text,muted,strike,meta} (meta: a secondary fact of a row — date, count, status — small, muted, pushed to the row's end) Badge{text,tone}
  Stat{label,value} Form{inline}+action (children inputs + a submit Button; input fields are sent automatically as body.data — never repeat them in action.data)
  Input{name,label,placeholder,required,inputType} Textarea{name,label,rows} Button{label,tone,size:"sm",submit}+action
  Mermaid{code,caption} (a diagram, zoomable) Image{src,alt,caption} (click opens full screen, zoomable)
  Code{code,lang} (with copy) Markdown{text} (long prose the owner wrote or asked for)
  Split (app shell: 1st child Sidebar, then content) Sidebar{title} (children: Link/Heading) Link{label,href,active,meta,dot}
  Page{title,wide} (wide for app shells) Tag{text,color} (ONE label chip; color = tone name or CSS color; several labels = a repeat over them) Select{name,label,options:[{value,label}],value}
  Checkbox{checked}+action  List{empty}  Row (a list item; usually the repeated child)
tone: primary|secondary|accent|neutral|ghost|error|success|warning. After any action the page re-renders itself.`;
}

export function render(spec: Spec, data: Data, params: Record<string, string> = {}, draft?: { fresh?: string[] }): string {
  // A "repeat" element is a template: it renders ITSELF once per row, with the row as $item.
  // In a draft, an element referenced but not written yet is a skeleton in its place, and the
  // elements the agent just wrote carry .is-fresh so the eye finds them.
  const node = (id: string, scope: Binding.Scope): string => {
    const el = spec.elements[id];
    if (!el) return draft ? `<div class="kernel-draft-slot skeleton" data-system-id="${escape(id)}"></div>` : "";
    if (draft && el.repeat) return [0, 1, 2].map(() => one(id, el, { ...scope, item: {} })).join("");
    if (!el.repeat) return one(id, el, scope);
    const rows = Binding.pointer(scope.data, el.repeat.path);
    return (Array.isArray(rows) ? rows : []).map((item) => one(id, el, { ...scope, item })).join("");
  };
  const one = (id: string, el: Element, scope: Binding.Scope): string => {
    const component = Catalog.components[el.type];
    if (!component) return `<!-- unknown ${escape(String(el.type))} -->`;
    let children = (el.children ?? []).map((c) => node(c, scope)).join("");
    // A draft container with nothing written inside yet shows where content will go: a few wire lines.
    if (draft && !children && ["Card", "List", "Stack", "Sidebar", "Split", "Form"].includes(el.type)) {
      children = `<div class="kernel-wire-lines" aria-hidden="true"><i></i><i></i><i></i></div>`;
    }
    const props = Binding.resolve(el.props ?? {}, scope) as Record<string, unknown>;
    const action = el.action && (Binding.resolve(el.action, scope) as Action);
    const html = component(props, children, { id, action });
    // The address goes on the outermost tag, so edit mode can find the element behind any click.
    const fresh = draft?.fresh?.includes(id) ? ` data-fresh` : "";
    return html.replace(/^<([a-z][a-z0-9]*)/, `<$1 data-system-id="${escape(id)}"${fresh}`);
  };
  return node(spec.root, { data, params });
}

/** kernelCss is kernel.css, read by the server: this module stays importable in a browser (Storybook). */
export function Shell({ title, body, path, kernelCss, kernelJs = "", tokens = {}, bootstrap = false }: { title: string; body: string; path: string; kernelCss: string; kernelJs?: string; tokens?: Record<string, string>; bootstrap?: boolean }) {
  const css = Object.entries(tokens).map(([k, v]) => `${k}:${v}`).join(";");
  return "<!doctype html>" + (
    <html lang="pt-BR" data-theme="kernel">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{escape(title)}</title>
        <link href="https://cdn.jsdelivr.net/npm/daisyui@5" rel="stylesheet" type="text/css" />
        <link href="https://cdn.jsdelivr.net/npm/@fontsource-variable/mona-sans@5/index.css" rel="stylesheet" />
        <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
        <script src="https://cdn.jsdelivr.net/npm/htmx.org@2.0.4/dist/htmx.min.js"></script>
        <style>{`
          ${kernelCss}
          ${css ? `[data-theme] { ${css} }` : ""}
        `}</style>
      </head>
      <body hx-on--after-request={`if(event.detail.successful && event.detail.requestConfig.verb!=='get' && !event.detail.elt.closest('#feedback')) location.reload()`}>
        <div id="kernel-body">{body}</div>
        <div id="kernel-studio" class="kernel-studio" aria-live="polite">
          <ol class="kernel-rail">{["entender", "planejar", "pensar a UX", "esboçar", "desenhar"].map((label, i) =>
            <li data-step={String(i + 1)}><span class="kernel-rail-bar"></span><span class="kernel-rail-label">{label}</span></li>)}</ol>
          <figure class="kernel-narration"><figcaption id="kernel-narration-phase"></figcaption><blockquote id="kernel-narration-text"></blockquote>
            <form id="kernel-gate" class="kernel-gate" autocomplete="off">
              <input id="kernel-gate-note" name="note" placeholder="Ajustar esta fase… (↵ para refazer)" />
              <button type="submit" class="btn btn-primary btn-sm" data-continue>Seguir <kbd class="kernel-kbd">⌘↵</kbd></button>
            </form></figure>
        </div>
        <dialog id="palette" aria-label="próximo passo">
          <div class="sheet">
            <input id="palette-input" placeholder={bootstrap ? "Diga o que isto deve se tornar…" : "Diga o que mudar, ou escolha uma ferramenta…"} autocomplete="off" />
            <ul id="palette-list" role="listbox"></ul>
            <footer><span>↑↓ escolher</span><span>↵ executar</span><span>⌘↵ passo a passo</span><span>esc fechar</span></footer>
          </div>
        </dialog>
        <dialog id="feedback" class="modal">
          <form class="modal-box flex flex-col gap-3" hx-post="/_feedback" hx-swap="none"
            hx-on--before-request="this.querySelector('button').classList.add('loading')"
            hx-on--after-request="location.reload()">
            <h3 class="font-bold">O que deve mudar?</h3>
            <code class="text-xs opacity-60" id="feedback-target"></code>
            <input type="hidden" name="path" value={path} />
            <input type="hidden" name="target" />
            <textarea class="textarea textarea-bordered" name="instruction" rows="3" required placeholder="aponte e diga"></textarea>
            <button class="btn btn-primary">aplicar</button>
          </form>
          <form method="dialog" class="modal-backdrop"><button>fechar</button></form>
        </dialog>
        {bootstrap || path.startsWith("/_") ? "" : <button class="btn btn-sm btn-ghost fixed bottom-4 right-4" hx-post="/_accept" hx-vals={JSON.stringify({ path })}
          hx-confirm="Esta versão é o que você queria?" title="fecha a jornada e aprende com ela">✓ aceitar</button>}
        <script type="module">{kernelJs}</script>
        <div id="working"><span class="flex items-center gap-3 rounded-box bg-base-100 px-5 py-3 text-base shadow-[0_12px_40px_-12px_oklch(23%_.014_60/.35)]"><span class="loading loading-dots loading-sm text-primary"></span> o agente está trabalhando</span></div>
        <script>{`
          // The server says when an agent works and when the system changed — from this page, another tab or /_mcp.
          const pulse = new EventSource('/_events');
          let dirty = false;
          pulse.addEventListener('working', () => document.body.classList.add('working'));
          // The finished screen does not reload the page: it develops out of the wireframe in a view transition.
          const develop = async () => {
            const html = await fetch(location.href, { headers: { accept: 'text/html' } }).then((r) => r.text());
            const next = new DOMParser().parseFromString(html, 'text/html');
            const swap = () => {
              document.getElementById('kernel-body').innerHTML = next.getElementById('kernel-body')?.innerHTML ?? '';
              document.getElementById('kernel-body').classList.remove('kernel-wireframe');
              document.body.classList.remove('working', 'studio', 'drafted');
              document.title = next.title;
            };
            document.startViewTransition ? await document.startViewTransition(swap).finished : swap();
            window.htmx?.process(document.getElementById('kernel-body'));
            document.dispatchEvent(new CustomEvent('htmx:afterSwap', { detail: {} }));
          };
          // "changed" can arrive after "idle": the view is saved once the agent's turn is over.
          pulse.addEventListener('changed', (e) => {
            const p = JSON.parse(e.data).path; if (p !== '*' && !samePath(p)) return;
            if (document.body.classList.contains('working')) dirty = true; else develop();
          });
          pulse.addEventListener('idle', () => { if (dirty) { dirty = false; develop(); } else document.body.classList.remove('working', 'studio', 'drafted'); });
          // The studio: a rail of five phases at the top, and the agent's current thought in the middle of the
          // page. Once a skeleton exists the thought steps aside to the corner and the wireframe takes the stage.
          const rail = document.querySelectorAll('.kernel-rail li');
          // A lived phase is a place to start again: click it on the rail and the design replays from there,
          // keeping every phase before it as approved.
          rail.forEach((li) => li.addEventListener('click', () => {
            if (!li.classList.contains('is-done') && !li.classList.contains('is-current')) return;
            fetch('/_intent', { method: 'POST', headers: { 'content-type': 'application/json', 'x-origin': 'palette' },
              body: JSON.stringify({ path: location.pathname, from: Number(li.dataset.step), interactive: true }) });
            document.body.classList.remove('awaiting');
          }));
          // The label is what the agent is doing NOW; the quote is the last thing it concluded, and says from which phase.
          let doing = '';
          const narrate = (phase, text, from) => {
            const cap = document.getElementById('kernel-narration-phase'), quote = document.getElementById('kernel-narration-text');
            const figure = cap.parentElement;
            figure.classList.remove('is-in'); void figure.offsetWidth;
            if (phase) doing = phase;
            cap.textContent = doing;
            if (from) quote.dataset.from = ({ 'entendendo': 'o que entendi', 'planejando': 'o plano', 'pensando a UX': 'as decisões de UX', 'esboço': 'o esboço' })[from] ?? from;
            // Waiting for the owner, the thought is read whole in the fold; running, it is a glimpse.
            const whole = document.body.classList.contains('awaiting');
            if (text !== undefined) {
              // Paragraphs, not raw newlines: a line that ends in ":" introduces the next one and sits tight to it.
              const shown = whole || text.length <= 280 ? text : text.slice(0, 277).trimEnd() + '…';
              // A phase reads at a glance. "## Title" lines start a column; "- " lines are a list; a fenced mermaid
              // block becomes a diagram; anything else is a paragraph. Two or more sections lay out side by side,
              // so a plan fits one fold instead of scrolling. (No regex here: this script lives in a TS template
              // literal, which eats backslashes.)
              // Text between backticks is a route or a field: set it as code, never show the backticks.
              const inline = (el, t) => t.split(String.fromCharCode(96)).forEach((part, k) => {
                if (k % 2) { const c = document.createElement('code'); c.textContent = part; el.append(c); } else el.append(part);
              });
              const diagram = (src) => { const d = document.createElement('div'); d.className = 'kernel-zoom kernel-fold-diagram'; d.dataset.mermaid = ''; d.textContent = src.join(String.fromCharCode(10)); return d; };
              // An erDiagram reads better as entity cards than as a tall chart: one card per entity (field, type) and
              // the relations as short lines under the cards. Parsed without regex (TS template literal).
              const entities = (src) => {
                const wrap = document.createElement('div'); wrap.className = 'kernel-entities'; const rels = document.createElement('ul'); rels.className = 'kernel-relations';
                let card = null;
                for (const raw of src.slice(1)) {
                  const t = raw.trim(); if (!t) continue;
                  if (t.endsWith('{')) { card = document.createElement('table'); const cap = document.createElement('caption'); cap.textContent = t.slice(0, -1).trim(); card.append(cap); wrap.append(card); continue; }
                  if (t === '}') { card = null; continue; }
                  if (card) { const [type, name, ...rest] = t.split(' ').filter(Boolean); const tr = document.createElement('tr');
                    const a = document.createElement('td'); a.textContent = name ?? type; const b = document.createElement('td'); b.textContent = (type ?? '') + (rest.includes('PK') ? ' · pk' : rest.includes('FK') ? ' · fk' : '');
                    tr.append(a, b); card.append(tr); continue; }
                  const colon = t.indexOf(':'); if (colon < 0) continue;
                  const ends = t.slice(0, colon).split(' ').filter(Boolean); const label = t.slice(colon + 1).trim().split('"').join('');
                  const li = document.createElement('li'); li.textContent = ends[0] + ' ' + (label || '→') + ' ' + ends[ends.length - 1]; rels.append(li);
                }
                const out = document.createElement('div'); out.className = 'kernel-entities-block'; out.append(wrap); if (rels.childNodes.length) out.append(rels); return out;
              };
              const block = (host) => { let list = null, fence = null;
                return (t) => {
                  if (fence) { if (t.startsWith('~~~') || t.startsWith(String.fromCharCode(96).repeat(3))) { host.append(fence[0]?.trim().startsWith('erDiagram') ? entities(fence) : diagram(fence)); fence = null; } else fence.push(t); return; }
                  if (t.startsWith(String.fromCharCode(96).repeat(3) + 'mermaid') || t.startsWith('~~~mermaid')) { fence = []; list = null; return; }
                  if (!t.trim()) { list = null; return; }
                  t = t.trim();
                  if (t.startsWith('- ')) { if (!list) { list = document.createElement('ul'); host.append(list); } const li = document.createElement('li'); inline(li, t.slice(2)); list.append(li); return; }
                  list = null; const p = document.createElement('p'); inline(p, t); if (t.endsWith(':')) p.className = 'is-lead'; host.append(p);
                }; };
              const intro = document.createElement('div'); intro.className = 'kernel-fold-intro';
              const sections = []; let write = block(intro);
              for (const raw of shown.split(String.fromCharCode(10))) {
                if (raw.trim().startsWith('## ')) {
                  const sec = document.createElement('section'); const h = document.createElement('h3'); h.textContent = raw.trim().slice(3); sec.append(h);
                  sections.push(sec); write = block(sec); continue;
                }
                write(raw);
              }
              const nodes = [];
              if (intro.childNodes.length) nodes.push(intro);
              // Text sections flow in newspaper columns on the left; a diagram gets its own column on the right.
              if (sections.length) {
                const grid = document.createElement('div'); grid.className = 'kernel-fold-grid';
                const text = document.createElement('div'); text.className = 'kernel-fold-text';
                const drawn = sections.filter((sec) => sec.querySelector('[data-mermaid], .kernel-entities-block'));
                text.append(...sections.filter((sec) => !drawn.includes(sec)));
                grid.append(text, ...drawn); grid.classList.toggle('has-diagram', drawn.length > 0); nodes.push(grid);
              }
              quote.replaceChildren(...nodes);
              quote.closest('.kernel-narration').classList.toggle('is-wide', sections.length > 1);
              document.dispatchEvent(new CustomEvent('htmx:afterSwap', { detail: {} }));
              requestAnimationFrame(() => quote.classList.toggle('is-overflow', quote.scrollHeight > quote.clientHeight + 2));
            }
            figure.classList.add('is-in');
          };
          pulse.addEventListener('phase', (e) => {
            const p = JSON.parse(e.data); if (!samePath(p.path)) return;
            document.body.classList.add('studio');
            rail.forEach((li) => {
              const n = Number(li.dataset.step);
              li.classList.toggle('is-done', n < p.step || (n === p.step && !!p.done));
              li.classList.toggle('is-current', n === p.step && !p.done);
            });
            document.body.classList.toggle('awaiting', !!p.awaiting);
            if (!p.done) narrate(p.name + '…', p.step === 1 ? '' : undefined);
            else if (p.awaiting) { narrate('sua vez: ' + p.name, p.text || '(sem texto)', p.name); document.getElementById('kernel-gate-note').focus(); }
            else if (p.text) narrate('', p.text, p.name);
          });
          // The fold answers the waiting phase: ⌘↵ (or Seguir) goes on; a note + ↵ redoes the phase with it.
          const gate = document.getElementById('kernel-gate'), gateNote = document.getElementById('kernel-gate-note');
          const answer = (decision) => {
            const note = gateNote.value.trim();
            if (decision === 'revise' && !note) return;
            document.body.classList.remove('awaiting'); gateNote.value = '';
            fetch('/_gate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path: GATE_PATH(), decision, note }) });
          };
          const GATE_PATH = () => location.pathname;
          gate.addEventListener('submit', (e) => { e.preventDefault(); answer(document.activeElement === gateNote && gateNote.value.trim() ? 'revise' : 'continue'); });
          document.addEventListener('keydown', (e) => {
            if (!document.body.classList.contains('awaiting')) return;
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); answer('continue'); }
          });
          pulse.addEventListener('gate', (e) => { const g = JSON.parse(e.data); if (samePath(g.path)) document.body.classList.remove('awaiting'); });
          const paintDraft = async (path, note) => {
            const r = await fetch('/_draft?path=' + encodeURIComponent(path)); if (!r.ok) return;
            const html = await r.text(), body = document.getElementById('kernel-body');
            const paint = () => { body.innerHTML = html; body.classList.add('kernel-wireframe'); document.body.classList.add('studio', 'drafted'); };
            document.startViewTransition ? document.startViewTransition(paint) : paint();
            if (note) narrate('', note, 'esboço');
          };
          pulse.addEventListener('draft', (e) => { const d = JSON.parse(e.data); if (samePath(d.path)) paintDraft(d.path, d.note); });
          // A reload in the middle of a design finds the sketch again instead of the empty page behind it.
          paintDraft(location.pathname);
          // Right click on any addressed element, or ⌘. / Ctrl+. to toggle edit mode and click.
          const pick = (el) => {
            const target = el.closest('[data-system-id]'); if (!target) return false;
            const d = document.getElementById('feedback');
            d.querySelector('[name=target]').value = target.dataset.systemId;
            document.getElementById('feedback-target').textContent = target.dataset.systemId;
            d.showModal(); d.querySelector('textarea').focus(); return true;
          };
          document.addEventListener('contextmenu', (e) => { if (e.shiftKey) return; if (pick(e.target)) e.preventDefault(); });
          document.addEventListener('keydown', (e) => { if ((e.metaKey || e.ctrlKey) && e.key === '.') document.body.classList.toggle('editing'); });
          // Vim motions, as two-key sequences outside inputs: g d → design system, g h → home. Esc on the
          // design system goes back to where you came from.
          let leader = 0;
          document.addEventListener('keydown', (e) => {
            if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest('input, textarea, dialog[open]')) return;
            if (e.key === 'Escape' && location.pathname === '/_design') { e.preventDefault(); history.length > 1 && document.referrer.startsWith(location.origin) ? history.back() : location.assign('/'); return; }
            if (e.key === 'g') { leader = Date.now(); return; }
            if (Date.now() - leader < 900) {
              leader = 0;
              if (e.key === 'd') window.open('/_ds/', 'design-system');
              if (e.key === 'h' && location.pathname !== '/') location.assign('/');
            }
          });
          // ⌘K — the one way in. Typing is always an instruction; the list is the tools that act on it.
          // "/notebooks/{id}" is the same screen as "/notebooks/notebook:x": compare by segment, {name} matches any.
          const samePath = (p) => { const a = p.split('/'), b = location.pathname.split('/'); return a.length === b.length && a.every((seg, k) => seg.startsWith('{') || seg === b[k]); };
          const BLANK = ${JSON.stringify(bootstrap)};
          const PATH = ${JSON.stringify(path)};
          const palette = document.getElementById('palette'), input = document.getElementById('palette-input'), list = document.getElementById('palette-list');
          const post = (url, body) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-origin': 'palette' }, body: JSON.stringify(body) });
          const tools = [
            { title: BLANK ? 'Tornar isto' : 'Refazer esta tela como', hint: 'intent', needsText: true, run: (t, step) => post('/_intent', { interactive: !!step, intent: t, path: PATH }) },
            ...(BLANK ? [] : [
              { title: 'Mudar esta tela', hint: 'feedback', needsText: true, run: (t) => post('/_feedback', { path: PATH, target: 'page', instruction: t }) },
              { title: 'Apontar um elemento', hint: 'modo edição · ⌘.', run: () => document.body.classList.add('editing') },
              { title: 'Aceitar esta versão', hint: 'aprende com a jornada', run: () => post('/_accept', { path: PATH }) },
            ]),
            { title: 'Design system', hint: 'g d · nova aba', run: () => window.open('/_ds/', 'design-system') },
            { title: 'O que o sistema sabe', hint: '/_system', run: () => window.open('/_system', '_blank') },
          ];
          let items = [], active = 0;
          const draw = () => {
            const text = input.value.trim();
            items = tools.filter((t) => !t.needsText || text).filter((t) => t.needsText || !text || t.title.toLowerCase().includes(text.toLowerCase()));
            if (!items.length) items = tools.filter((t) => t.needsText);
            active = Math.min(active, Math.max(items.length - 1, 0));
            list.replaceChildren(...items.map((t, i) => {
              const li = document.createElement('li');
              li.setAttribute('role', 'option'); li.setAttribute('aria-selected', String(i === active));
              const b = document.createElement('b'); b.textContent = t.title;
              const q = document.createElement('span'); q.textContent = t.needsText && text ? '«' + text + '»' : '';
              const small = document.createElement('small'); small.textContent = t.hint;
              li.append(b, q, small); li.onclick = () => exec(i); return li;
            }));
          };
          const exec = (i, step = false) => { const t = items[i]; if (!t) return; const text = input.value.trim(); palette.close(); input.value = ''; t.run(text, step); };
          const open = () => { active = 0; draw(); palette.showModal(); input.focus(); };
          document.addEventListener('keydown', (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); palette.open ? palette.close() : open(); } });
          input.addEventListener('input', () => { active = 0; draw(); });
          input.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') { active = (active + 1) % items.length; draw(); e.preventDefault(); }
            else if (e.key === 'ArrowUp') { active = (active - 1 + items.length) % items.length; draw(); e.preventDefault(); }
            else if (e.key === 'Enter') { exec(active, e.metaKey || e.ctrlKey); e.preventDefault(); }
          });
          palette.addEventListener('click', (e) => { if (e.target === palette) palette.close(); });
          // Someone else (the MCP, another tab) made a gesture: play it here, slowly, without re-sending it.
          const TITLES = { intent: BLANK ? 'Tornar isto' : 'Refazer esta tela como', feedback: 'Mudar esta tela', accept: 'Aceitar esta versão' };
          const wait = (ms) => new Promise((r) => setTimeout(r, ms));
          pulse.addEventListener('gesture', async (e) => {
            const g = JSON.parse(e.data);
            if (g.path !== PATH || palette.open) return;
            open(); input.readOnly = true;
            await wait(350);
            for (const ch of g.text) { input.value += ch; draw(); await wait(Math.max(12, Math.min(38, 1400 / g.text.length))); }
            active = Math.max(0, items.findIndex((t) => t.title === TITLES[g.tool])); draw();
            await wait(650);
            input.readOnly = false; input.value = ''; palette.close();
          });
          document.addEventListener('click', (e) => {
            if (!document.body.classList.contains('editing') || e.target.closest('#feedback')) return;
            e.preventDefault(); e.stopPropagation(); pick(e.target);
          }, true);
          document.addEventListener('mouseover', (e) => {
            if (!document.body.classList.contains('editing')) return;
            document.querySelectorAll('.target').forEach((n) => n.classList.remove('target'));
            e.target.closest('[data-system-id]')?.classList.add('target');
          });
        `}</script>
      </body>
    </html>
  );
}

/** The one view the binary ships: what a system with no knowledge shows. */
export const BOOTSTRAP: Spec = {
  v: 1,
  title: "em branco",
  root: "blank",
  elements: {
    blank: { type: "Blank", props: { title: "Em branco.", hint: "para dar o primeiro passo" } },
  },
};

/** The other view the binary ships: every native component, with sample data, and the live tokens. */
export const DESIGN_SYSTEM: { spec: Spec; data: Record<string, unknown> } = {
  data: {
    rows: [
      { id: "exemplo:1", title: "Revisar a proposta", when: "14/09 09:12", done: false },
      { id: "exemplo:2", title: "Ligar para o fornecedor", when: "14/09 10:40", done: false },
      { id: "exemplo:3", title: "Fechar o mês", when: "13/09 18:05", done: true },
    ],
  },
  spec: {
    v: 1,
    title: "design system",
    root: "page",
    elements: {
      page: { type: "Page", props: { title: "Design system" }, children: ["intro", "tokens", "type", "actions", "form", "list", "figures", "media"] },
      media: { type: "Card", props: { title: "Mídia" }, children: ["media.mermaid", "media.image", "media.code", "media.md"] },
      "media.mermaid": { type: "Mermaid", props: { caption: "Mermaid · roda, arrasta, duplo clique volta", code: "flowchart LR\n  pedido[Pedido] --> op[operation]\n  op --> cap{capability?}\n  cap -- sim --> prog[program 20 ms]\n  cap -- não --> agente[agente ACP]\n  agente --> learn[learning] --> prog" } },
      "media.image": { type: "Image", props: { src: "https://img.daisyui.com/images/stock/photo-1606107557195-0e29a4b5b4aa.webp", alt: "Tênis sobre fundo verde", caption: "Image · clique abre em tela cheia" } },
      "media.code": { type: "Code", props: { lang: "surrealql", code: "CREATE todo SET title = $data.title, done = false, created = time::now()" } },
      "media.md": { type: "Markdown", props: { text: "**Markdown** · para o texto longo. Listas, *ênfase* e [links](https://daisyui.com) sem componente novo.\n\n- um\n- dois" } },
      intro: { type: "Text", props: { muted: true, text: "O vocabulário que todo sistema recebe ao nascer. esc volta, g h vai para a home." } },
      tokens: { type: "Card", props: { title: "Cores" }, children: ["tokens.swatches"] },
      "tokens.swatches": { type: "Swatches", props: { tokens: ["--color-base-100", "--color-base-200", "--color-base-300", "--color-base-content", "--color-primary", "--color-accent", "--color-success", "--color-error"] } },
      type: { type: "Card", props: { title: "Texto" }, children: ["type.heading", "type.text", "type.muted", "type.strike"] },
      "type.heading": { type: "Heading", props: { text: "Heading · a voz de uma seção" } },
      "type.text": { type: "Text", props: { text: "Text · o corpo. Uma ideia por parágrafo, medida de até 65 caracteres para a leitura não cansar." } },
      "type.muted": { type: "Text", props: { muted: true, text: "Text muted · o que acompanha sem disputar atenção." } },
      "type.strike": { type: "Text", props: { strike: true, text: "Text strike · o que já foi feito." } },
      actions: { type: "Card", props: { title: "Ações" }, children: ["actions.row"] },
      "actions.row": { type: "Stack", props: { direction: "row", gap: 3 }, children: ["b.primary", "b.neutral", "b.ghost", "b.badge"] },
      "b.primary": { type: "Button", props: { label: "Primária", tone: "primary" } },
      "b.neutral": { type: "Button", props: { label: "Neutra", tone: "neutral" } },
      "b.ghost": { type: "Button", props: { label: "Discreta", tone: "ghost" } },
      "b.badge": { type: "Badge", props: { text: "badge", tone: "neutral" } },
      form: { type: "Card", props: { title: "Formulário" }, children: ["form.inline"] },
      "form.inline": { type: "Form", props: { inline: true }, children: ["form.input", "form.submit"] },
      "form.input": { type: "Input", props: { name: "exemplo", placeholder: "Input · o que precisa ser feito?" } },
      "form.submit": { type: "Button", props: { label: "Enviar", submit: true } },
      list: { type: "Card", props: { title: "Lista" }, children: ["list.list"] },
      "list.list": { type: "List", props: { empty: "List empty · nada aqui ainda." }, children: ["list.row"] },
      "list.row": { type: "Row", repeat: { path: "/rows", key: "id" }, children: ["list.check", "list.title", "list.when"] },
      "list.check": { type: "Checkbox", props: { checked: { $item: "done" } } },
      "list.title": { type: "Text", props: { text: { $item: "title" }, strike: { $item: "done" } } },
      "list.when": { type: "Text", props: { meta: true, text: { $item: "when" } } },
      figures: { type: "Card", props: { title: "Números" }, children: ["figures.row"] },
      "figures.row": { type: "Stack", props: { direction: "row", gap: 10 }, children: ["stat.a", "stat.b"] },
      "stat.a": { type: "Stat", props: { label: "Pendentes", value: { $count: { $data: "/rows" } } } },
      "stat.b": { type: "Stat", props: { label: "Stat · número com rótulo", value: "12,4%" } },
    },
  },
};
