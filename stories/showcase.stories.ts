import type { Meta, StoryObj } from "@storybook/html-vite";
import { View } from "../stem.ts";

const { render } = View;
type Spec = View.Spec;

// The home of /_ds: the kernel shown doing its job, before anyone opens a component. Every block here
// is the same markup a generated system renders, so what looks right here looks right in the app.

const meta: Meta = { title: "Showcase", includeStories: ["Home"], parameters: { layout: "fullscreen" } };
export default meta;
type Story = StoryObj;

namespace Showcase {
  const TODO: Spec = {
    v: 1, root: "page",
    elements: {
      page: { type: "Page", props: { title: "Tarefas" }, children: ["add", "pending", "done"] },
      add: { type: "Form", props: { inline: true }, action: { method: "POST", path: "/todos" }, children: ["add.title", "add.go"] },
      "add.title": { type: "Input", props: { name: "title", placeholder: "O que precisa ser feito?" } },
      "add.go": { type: "Button", props: { label: "Adicionar", submit: true } },
      pending: { type: "Card", props: { title: "Pendentes" }, children: ["pending.list"] },
      "pending.list": { type: "List", children: ["pending.row"] },
      "pending.row": { type: "Row", repeat: { path: "/pending", key: "id" }, children: ["p.check", "p.title", "p.when"] },
      "p.check": { type: "Checkbox", props: { checked: false } },
      "p.title": { type: "Text", props: { text: { $item: "title" } } },
      "p.when": { type: "Text", props: { meta: true, text: { $item: "when" } } },
      done: { type: "Card", props: { title: "Concluídas" }, children: ["done.list"] },
      "done.list": { type: "List", children: ["done.row"] },
      "done.row": { type: "Row", repeat: { path: "/done", key: "id" }, children: ["d.check", "d.title", "d.when"] },
      "d.check": { type: "Checkbox", props: { checked: true } },
      "d.title": { type: "Text", props: { strike: true, muted: true, text: { $item: "title" } } },
      "d.when": { type: "Text", props: { meta: true, text: { $item: "when" } } },
    },
  };
  const DATA = {
    pending: [
      { id: "todo:1", title: "Revisar a proposta da Glaucilene", when: "hoje 09:12" },
      { id: "todo:2", title: "Levar a moto na revisão", when: "hoje 10:40" },
      { id: "todo:3", title: "Responder o eKyte", when: "ontem 18:05" },
    ],
    done: [{ id: "todo:4", title: "Comprar leite", when: "concluída 08:58" }],
  };

  export function section(label: string, body: string, note = "") {
    return `<section class="grid gap-6 border-t border-base-300 py-12 lg:grid-cols-[14rem_1fr]">
      <header class="flex flex-col gap-2"><h2 class="kernel-heading">${label}</h2>${note ? `<p class="kernel-muted text-sm max-w-[28ch]">${note}</p>` : ""}</header>
      <div class="min-w-0">${body}</div></section>`;
  }

  export function app() {
    return `<div class="mockup-browser border border-base-300 bg-base-200">
      <div class="mockup-browser-toolbar"><div class="input">tarefas.localhost</div></div>
      <div class="bg-base-100 border-t border-base-300 [&_main]:pt-8 [&_main]:pb-10">${render(TODO, DATA)}</div></div>`;
  }

  export function palette() {
    return `<div class="rounded-box border border-base-300 bg-base-100 shadow-[0_24px_60px_-20px_oklch(21%_.012_257/.35)] overflow-hidden">
      <div class="px-5 py-4 text-lg">mostre a data de conclusão à direita</div>
      <ul class="border-t border-base-300 p-1.5 text-[.95rem]">
        <li class="flex gap-3 rounded-field bg-base-200 px-3.5 py-2.5"><b class="font-semibold whitespace-nowrap">Mudar esta tela</b><span class="kernel-muted truncate">«mostre a data de conclusão…»</span><small class="kernel-meta">feedback</small></li>
        <li class="flex gap-3 px-3.5 py-2.5"><b class="font-semibold whitespace-nowrap">Apontar um elemento</b><small class="kernel-meta">⌘.</small></li>
        <li class="flex gap-3 px-3.5 py-2.5"><b class="font-semibold whitespace-nowrap">Aceitar esta versão</b><small class="kernel-meta">aprende com a jornada</small></li>
        <li class="flex gap-3 px-3.5 py-2.5"><b class="font-semibold whitespace-nowrap">Design system</b><small class="kernel-meta">g d</small></li>
      </ul>
      <footer class="flex gap-4 border-t border-base-300 px-5 py-2 text-[.8125rem] kernel-muted"><span>↑↓ escolher</span><span>↵ executar</span><span>esc fechar</span></footer></div>`;
  }

  export function type() {
    const rows: [string, string, string][] = [
      ["display", "kernel-display", "Um sistema que começa em branco"],
      ["heading", "kernel-heading", "Pendentes, concluídas e o que mudou"],
      ["body", "", "Cada correção vira preferência, e o próximo rascunho já nasce mais perto do que você queria."],
      ["muted", "kernel-muted", "O que acompanha sem disputar atenção."],
      ["meta", "kernel-meta !ml-0 !pl-0", "hoje 09:12 · 14 de 14 · 20 ms"],
    ];
    return `<div class="flex flex-col divide-y divide-base-300">${rows.map(([n, c, t]) =>
      `<div class="grid grid-cols-[6rem_1fr] items-baseline gap-4 py-4"><span class="kernel-meta !ml-0 !pl-0">${n}</span><p class="${c}">${t}</p></div>`).join("")}</div>`;
  }

  export function colors() {
    const roles: [string, string][] = [["base-100", "fundo"], ["base-200", "superfície"], ["base-300", "fio"], ["base-content", "tinta"],
      ["primary", "a ação"], ["accent", "o destaque raro"], ["success", "deu certo"], ["warning", "atenção"], ["error", "falhou"]];
    return `<div class="grid grid-cols-3 gap-x-6 gap-y-6 sm:grid-cols-5">${roles.map(([t, r]) =>
      `<div class="flex flex-col gap-2"><span class="h-16 rounded-box border border-base-300" style="background: var(--color-${t})"></span>
        <span class="text-sm font-semibold">${t}</span><span class="kernel-meta !ml-0 !pl-0 -mt-1.5">${r}</span></div>`).join("")}</div>`;
  }

  export function states() {
    const tones = ["primary", "neutral", "error", "ghost"];
    const states: [string, string][] = [["normal", ""], ["hover", "is-hover"], ["pressed", "is-active"], ["disabled", "btn-disabled"]];
    return `<div class="grid grid-cols-[5rem_repeat(4,max-content)] items-center gap-x-4 gap-y-3">
      <span></span>${states.map(([s]) => `<span class="kernel-meta !ml-0 !pl-0">${s}</span>`).join("")}
      ${tones.map((t) => `<span class="kernel-meta !ml-0 !pl-0">${t}</span>${states.map(([, c]) => `<button class="btn btn-${t} ${c}">Salvar</button>`).join("")}`).join("")}</div>`;
  }

  export function feedback() {
    return `<div class="grid gap-6 lg:grid-cols-2">
      <fieldset class="fieldset gap-3">
        <legend class="fieldset-legend">Nova tarefa</legend>
        <label class="label">Título</label><input class="input w-full" value="Responder o eKyte">
        <label class="label">Prazo</label><select class="select w-full"><option>Hoje</option><option>Amanhã</option></select>
        <label class="label cursor-pointer gap-3"><input type="checkbox" class="toggle toggle-primary" checked> lembrar às 9h</label>
        <button class="btn btn-primary mt-2 w-max">Criar tarefa</button>
      </fieldset>
      <div class="flex flex-col gap-3">
        <div role="alert" class="alert alert-success alert-soft"><span>Programa promovido: <b>POST /todos</b> agora roda em 20 ms.</span></div>
        <div role="alert" class="alert alert-warning alert-soft"><span>A view tem uma query quebrada em <b>pending</b>.</span></div>
        <div class="flex items-center gap-3 rounded-box border border-base-300 px-4 py-3"><span class="loading loading-dots loading-sm text-primary"></span> o agente está trabalhando</div>
        <progress class="progress progress-primary w-full" value="62" max="100"></progress>
      </div></div>`;
  }

  export function data() {
    return `<div class="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div class="overflow-x-auto rounded-box border border-base-300"><table class="table">
        <thead><tr><th>rota</th><th>quem resolve</th><th class="text-right">tempo</th></tr></thead>
        <tbody>
          <tr><td><code>POST /todos</code></td><td><span class="badge badge-soft badge-success">program</span></td><td class="text-right tabular-nums">19 ms</td></tr>
          <tr><td><code>POST /todos/{id}/complete</code></td><td><span class="badge badge-soft badge-success">program</span></td><td class="text-right tabular-nums">17 ms</td></tr>
          <tr><td><code>GET /relatorio</code></td><td><span class="badge badge-soft">agente</span></td><td class="text-right tabular-nums">6,5 s</td></tr>
        </tbody></table></div>
      <figure class="kernel-figure-block"><div class="kernel-zoom h-64" data-mermaid>flowchart LR
  pedido[Pedido] --> cap{program?}
  cap -- sim --> prog[20 ms]
  cap -- não --> agente[agente ACP]
  agente --> prog</div></figure></div>`;
  }
}

export const Home: Story = {
  render: () => `<div class="mx-auto max-w-[76rem] px-8 pb-24 pt-14">
    <header class="grid gap-10 pb-12 lg:grid-cols-[1.1fr_1fr] lg:items-end">
      <div class="flex flex-col gap-4">
        <h1 class="kernel-display max-w-[20ch]">O vocabulário com que todo sistema nasce</h1>
        <p class="kernel-muted max-w-[52ch]">DaisyUI 5 por baixo, o tema do kernel por cima e os componentes que o agente usa para escrever telas. O que está aqui é o mesmo markup que o app renderiza.</p>
      </div>
      <div class="flex flex-wrap gap-2 lg:justify-end">
        <a class="btn btn-primary" href="?path=/story/kernel-components--design-system" target="_top">Componentes do kernel</a>
        <a class="btn btn-ghost" href="?path=/story/daisyui-actions--button" target="_top">Os 58 do DaisyUI</a>
      </div>
    </header>
    ${Showcase.section("Em uso", `<div class="grid gap-8 xl:grid-cols-[1.35fr_1fr] xl:items-start">${Showcase.app()}${Showcase.palette()}</div>`, "A tela que nasceu de uma frase, e o ⌘K que muda ela.")}
    ${Showcase.section("Cores", Showcase.colors(), "Neutro, tinta e um azul. Cada cor tem um cargo.")}
    ${Showcase.section("Tipo", Showcase.type(), "Uma família só, Mona Sans, em escala fixa.")}
    ${Showcase.section("Estados", Showcase.states(), "Hover escurece 8%, pressed 16%, disabled mantém o tom.")}
    ${Showcase.section("Formulário e retorno", Showcase.feedback())}
    ${Showcase.section("Dados", Showcase.data(), "Tabela, badge e diagrama com zoom.")}
  </div>`,
};
