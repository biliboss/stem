// kernel.js — the behavior the native components need in the browser. The server inlines it as a module;
// Storybook imports it. mount(root) is idempotent: it only touches elements it has not seen.
//   [data-mermaid]  source in textContent → rendered SVG inside a zoom surface
//   [data-markdown] source in textContent → HTML
//   [data-zoom]     wheel/pinch zooms around the pointer, drag pans, double click resets
//   [data-lightbox] click opens the image full screen, zoomable; esc closes
//   [data-copy]     copies the text of the nearest <code>

const MERMAID = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
const MARKED = "https://cdn.jsdelivr.net/npm/marked@15/lib/marked.esm.js";
let mermaidReady, markedReady;

function zoomable(surface) {
  if (surface.dataset.zoomReady) return;
  surface.dataset.zoomReady = "1";
  const content = surface.firstElementChild;
  if (!content) return;
  let scale = 1, x = 0, y = 0, drag;
  const apply = () => { content.style.transform = `translate(${x}px, ${y}px) scale(${scale})`; };
  content.style.transformOrigin = "0 0";
  surface.addEventListener("wheel", (e) => {
    e.preventDefault();
    const r = surface.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;
    const next = Math.min(8, Math.max(0.25, scale * Math.exp(-e.deltaY * 0.0015)));
    x = px - (px - x) * (next / scale); y = py - (py - y) * (next / scale); scale = next; apply();
  }, { passive: false });
  surface.addEventListener("pointerdown", (e) => { drag = { px: e.clientX - x, py: e.clientY - y }; surface.setPointerCapture(e.pointerId); surface.classList.add("is-dragging"); });
  surface.addEventListener("pointermove", (e) => { if (!drag) return; x = e.clientX - drag.px; y = e.clientY - drag.py; apply(); });
  surface.addEventListener("pointerup", () => { drag = undefined; surface.classList.remove("is-dragging"); });
  surface.addEventListener("dblclick", () => { scale = 1; x = 0; y = 0; apply(); });
  (surface.closest("figure") ?? surface).querySelectorAll("[data-zoom-step]").forEach((b) => b.addEventListener("click", (e) => {
    e.stopPropagation();
    const step = Number(b.dataset.zoomStep);
    if (step === 0) { scale = 1; x = 0; y = 0; } else { scale = Math.min(8, Math.max(0.25, scale * step)); }
    apply();
  }));
}

function lightbox(img) {
  if (img.dataset.lightboxReady) return;
  img.dataset.lightboxReady = "1";
  img.addEventListener("click", () => {
    const dialog = document.createElement("dialog");
    dialog.className = "kernel-lightbox";
    dialog.innerHTML = `<div class="kernel-zoom h-full w-full" data-zoom><img src="${img.currentSrc || img.src}" alt="${img.alt}"></div>
      <button class="btn btn-sm btn-ghost kernel-lightbox-close" aria-label="fechar">esc</button>`;
    document.body.append(dialog);
    dialog.querySelector("button").onclick = () => dialog.close();
    dialog.addEventListener("close", () => dialog.remove());
    dialog.showModal();
    zoomable(dialog.querySelector("[data-zoom]"));
  });
}

export async function mount(root = document) {
  for (const el of root.querySelectorAll("[data-mermaid]:not([data-rendered])")) {
    el.dataset.rendered = "1";
    const source = el.textContent;
    mermaidReady ??= import(MERMAID).then((m) => { m.default.initialize({ startOnLoad: false, theme: "neutral", fontFamily: "Mona Sans Variable, sans-serif" }); return m.default; });
    try {
      const mermaid = await mermaidReady;
      const { svg } = await mermaid.render(`m${Math.random().toString(36).slice(2)}`, source);
      el.innerHTML = `<div>${svg}</div>`;
      zoomable(el);
    } catch (e) {
      el.innerHTML = `<pre class="text-error text-sm whitespace-pre-wrap">${String(e.message ?? e)}</pre>`;
    }
  }
  for (const el of root.querySelectorAll("[data-markdown]:not([data-rendered])")) {
    el.dataset.rendered = "1";
    markedReady ??= import(MARKED).then((m) => m.marked);
    el.innerHTML = (await markedReady).parse(el.textContent);
  }
  root.querySelectorAll("[data-zoom]").forEach(zoomable);
  root.querySelectorAll("[data-lightbox]").forEach(lightbox);
  root.querySelectorAll("[data-copy]:not([data-copy-ready])").forEach((b) => {
    b.dataset.copyReady = "1";
    b.addEventListener("click", async () => {
      await navigator.clipboard.writeText(b.closest("figure")?.querySelector("code")?.textContent ?? "");
      const label = b.textContent; b.textContent = "copiado"; setTimeout(() => (b.textContent = label), 1200);
    });
  });
}

// The fold floats over the page, so the owner can drag it aside to see what it covers; a double click on it puts it back.
function dragFold() {
  let drag;
  const fold = (t) => t instanceof Element ? t.closest(".kernel-narration") : null;
  document.addEventListener("pointerdown", (e) => {
    const f = fold(e.target);
    if (!f || e.button !== 0 || e.target.closest("input, button, a, textarea, select")) return;
    const x = parseFloat(f.style.getPropertyValue("--fold-dx")) || 0, y = parseFloat(f.style.getPropertyValue("--fold-dy")) || 0;
    drag = { f, px: e.clientX - x, py: e.clientY - y, id: e.pointerId };
    f.setPointerCapture(e.pointerId); f.classList.add("is-dragging"); e.preventDefault();
  });
  document.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag.f.style.setProperty("--fold-dx", `${e.clientX - drag.px}px`);
    drag.f.style.setProperty("--fold-dy", `${e.clientY - drag.py}px`);
  });
  const end = () => { if (drag) { drag.f.classList.remove("is-dragging"); drag = undefined; } };
  document.addEventListener("pointerup", end); document.addEventListener("pointercancel", end);
  document.addEventListener("dblclick", (e) => {
    const f = fold(e.target); if (!f || e.target.closest("input, button")) return;
    f.style.removeProperty("--fold-dx"); f.style.removeProperty("--fold-dy");
  });
}

// `o` outside a field shows or hides the sketch's outlines; the choice survives a reload.
function outlineToggle() {
  if (localStorage.getItem("kernel-outline") === "off") document.body.classList.add("no-outline");
  document.addEventListener("keydown", (e) => {
    if (e.key !== "o" || e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.("input, textarea, select, [contenteditable]")) return;
    const off = document.body.classList.toggle("no-outline");
    localStorage.setItem("kernel-outline", off ? "off" : "on");
  });
}

if (typeof document !== "undefined") {
  dragFold();
  if (document.body) outlineToggle(); else document.addEventListener("DOMContentLoaded", outlineToggle);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => mount());
  else mount();
  document.addEventListener("htmx:afterSwap", (e) => mount(e.target));
}
