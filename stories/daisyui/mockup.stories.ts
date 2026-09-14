import type { Meta, StoryObj } from "@storybook/html-vite";

const meta: Meta = { title: "DaisyUI/Mockup" };
export default meta;
type Story = StoryObj;

export const Browser: Story = {
  render: () => `<div class="mockup-browser border-base-300 border w-full max-w-2xl">
  <div class="mockup-browser-toolbar">
    <div class="input">https://viacorretor.com.br</div>
  </div>
  <div class="grid place-content-center border-t border-base-300 h-64">Olá!</div>
</div>`,
};

export const Code: Story = {
  render: () => `<div class="flex flex-col gap-4 max-w-xl">
  <div class="mockup-code w-full">
    <pre data-prefix="$"><code>pnpm add -D daisyui</code></pre>
    <pre data-prefix=">" class="text-warning"><code>instalando...</code></pre>
    <pre data-prefix=">" class="text-success"><code>Pronto!</code></pre>
  </div>
  <div class="mockup-code bg-primary text-primary-content w-full">
    <pre data-prefix="1"><code>npm i daisyui</code></pre>
    <pre data-prefix="2" class="bg-warning text-warning-content"><code>linha destacada</code></pre>
    <pre><code>sem prefixo</code></pre>
  </div>
</div>`,
};

export const Phone: Story = {
  render: () => `<div class="mockup-phone border-primary">
  <div class="mockup-phone-camera"></div>
  <div class="mockup-phone-display text-white grid place-content-center bg-neutral-900">Oi, telefone.</div>
</div>`,
};

export const Window: Story = {
  render: () => `<div class="mockup-window border border-base-300 w-full max-w-2xl">
  <div class="grid place-content-center border-t border-base-300 h-64">Olá!</div>
</div>`,
};
