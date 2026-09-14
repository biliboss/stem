import type { Meta, StoryObj } from "@storybook/html-vite";
import { View } from "../main.ts";

const { Catalog, DESIGN_SYSTEM, render } = View;
type Spec = View.Spec;

const meta: Meta = { title: "Kernel/Components" };
export default meta;
type Story = StoryObj;

/** One story per native component: the element and its descendants lifted out of the design-system spec. */
const piece = (id: string): Story => ({
  render: () => render({ ...DESIGN_SYSTEM.spec, root: id } as Spec, DESIGN_SYSTEM.data),
});

export const DesignSystem: Story = { render: () => render(DESIGN_SYSTEM.spec, DESIGN_SYSTEM.data) };
export const Colors = piece("tokens");
export const Text = piece("type");
export const Actions = piece("actions");
export const Form = piece("form");
export const List = piece("list");
export const Figures = piece("figures");
export const Media = piece("media");
export const Mermaid = piece("media.mermaid");
export const Image = piece("media.image");

/** Every tone in every state, forced by class so the states sit side by side. */
export const States: Story = {
  render: () => {
    const tones = ["primary", "neutral", "secondary", "accent", "error", "ghost"];
    const states: [string, string][] = [["normal", ""], ["hover", "is-hover"], ["pressed", "is-active"], ["disabled", "btn-disabled"]];
    return `<table class="border-separate border-spacing-3"><thead><tr><th></th>${states.map(([s]) => `<th class="kernel-meta !ml-0 text-left">${s}</th>`).join("")}</tr></thead>
      <tbody>${tones.map((t) => `<tr><td class="kernel-meta !ml-0">${t}</td>${states.map(([, c]) => `<td><button class="btn btn-${t} ${c}">Salvar</button></td>`).join("")}</tr>`).join("")}
      <tr><td class="kernel-meta !ml-0">input</td><td><input class="input" placeholder="normal"></td><td><input class="input is-hover" placeholder="hover"></td><td><input class="input is-active" placeholder="focus"></td><td><input class="input" disabled placeholder="disabled"></td></tr>
      </tbody></table>`;
  },
};

export const Catalogue: Story = { render: () => `<pre class="text-sm whitespace-pre-wrap">${Catalog.DOC.replace(/</g, "&lt;")}</pre>` };
