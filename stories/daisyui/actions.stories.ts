import type { Meta, StoryObj } from "@storybook/html-vite";

const meta: Meta = { title: "DaisyUI/Actions" };
export default meta;
type Story = StoryObj;

export const Button: Story = {
  render: () => `<div class="flex flex-col gap-3">
  <div class="flex flex-wrap gap-2">
    <button class="btn">Padrão</button>
    <button class="btn btn-neutral">Neutral</button>
    <button class="btn btn-primary">Primary</button>
    <button class="btn btn-secondary">Secondary</button>
    <button class="btn btn-accent">Accent</button>
    <button class="btn btn-info">Info</button>
    <button class="btn btn-success">Success</button>
    <button class="btn btn-warning">Warning</button>
    <button class="btn btn-error">Error</button>
  </div>
  <div class="flex flex-wrap gap-2">
    <button class="btn btn-primary btn-outline">Outline</button>
    <button class="btn btn-primary btn-dash">Dash</button>
    <button class="btn btn-primary btn-soft">Soft</button>
    <button class="btn btn-ghost">Ghost</button>
    <button class="btn btn-link">Link</button>
    <button class="btn btn-active">Active</button>
    <button class="btn" disabled>Disabled</button>
  </div>
  <div class="flex flex-wrap items-center gap-2">
    <button class="btn btn-xs">XS</button>
    <button class="btn btn-sm">SM</button>
    <button class="btn btn-md">MD</button>
    <button class="btn btn-lg">LG</button>
    <button class="btn btn-xl">XL</button>
    <button class="btn btn-square">□</button>
    <button class="btn btn-circle">○</button>
    <button class="btn btn-wide">Wide</button>
    <button class="btn"><span class="loading loading-spinner"></span>Carregando</button>
  </div>
</div>`,
};

export const Dropdown: Story = {
  render: () => `<div class="flex flex-wrap gap-4 min-h-56">
  <details class="dropdown" open>
    <summary class="btn m-1">Details</summary>
    <ul class="menu dropdown-content bg-base-100 rounded-box z-1 w-40 p-2 shadow-sm">
      <li><a>Item 1</a></li>
      <li><a>Item 2</a></li>
    </ul>
  </details>
  <div class="dropdown dropdown-end">
    <div tabindex="0" role="button" class="btn m-1">Focus (end)</div>
    <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-1 w-40 p-2 shadow-sm">
      <li><a>Item 1</a></li>
      <li><a>Item 2</a></li>
    </ul>
  </div>
  <div class="dropdown dropdown-hover dropdown-right">
    <div tabindex="0" role="button" class="btn m-1">Hover (right)</div>
    <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-1 w-40 p-2 shadow-sm">
      <li><a>Item 1</a></li>
    </ul>
  </div>
  <div class="dropdown dropdown-open dropdown-top mt-24">
    <div tabindex="0" role="button" class="btn m-1">Open (top)</div>
    <div tabindex="0" class="dropdown-content card card-sm bg-base-100 z-1 w-48 shadow-md">
      <div class="card-body"><p>Conteúdo em card.</p></div>
    </div>
  </div>
</div>`,
};

export const Fab: Story = {
  render: () => `<div class="flex gap-16 min-h-72 items-end">
  <div class="relative h-64 w-40">
    <div class="fab absolute! bottom-0 right-0">
      <div tabindex="0" role="button" class="btn btn-lg btn-circle btn-primary">F</div>
      <button class="btn btn-lg btn-circle">A</button>
      <button class="btn btn-lg btn-circle">B</button>
      <button class="btn btn-lg btn-circle">C</button>
    </div>
  </div>
  <div class="relative h-64 w-56">
    <div class="fab fab-flower absolute! bottom-0 right-0">
      <div tabindex="0" role="button" class="btn btn-lg btn-circle btn-secondary">+</div>
      <div class="fab-main-action"><button class="btn btn-circle btn-lg btn-secondary">M</button></div>
      <button class="btn btn-lg btn-circle">A</button>
      <button class="btn btn-lg btn-circle">B</button>
      <button class="btn btn-lg btn-circle">C</button>
    </div>
  </div>
</div>`,
};

export const Modal: Story = {
  render: () => `<div class="relative min-h-64">
  <dialog class="modal modal-open modal-bottom sm:modal-middle" open>
    <div class="modal-box">
      <form method="dialog"><button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button></form>
      <h3 class="text-lg font-bold">Olá!</h3>
      <p class="py-4">Modal aberto com o atributo open.</p>
      <div class="modal-action">
        <form method="dialog"><button class="btn">Fechar</button></form>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop"><button>fechar</button></form>
  </dialog>
</div>`,
};

export const Swap: Story = {
  render: () => `<div class="flex flex-wrap items-center gap-6">
  <label class="swap">
    <input type="checkbox" />
    <div class="swap-on">ON</div>
    <div class="swap-off">OFF</div>
  </label>
  <label class="swap swap-rotate text-3xl">
    <input type="checkbox" />
    <div class="swap-on">☀️</div>
    <div class="swap-off">🌙</div>
  </label>
  <label class="swap swap-flip text-3xl">
    <input type="checkbox" />
    <div class="swap-on">😈</div>
    <div class="swap-off">😇</div>
  </label>
  <div class="swap swap-active text-xl">
    <div class="swap-on">ativo</div>
    <div class="swap-off">inativo</div>
  </div>
</div>`,
};

export const ThemeController: Story = {
  render: () => `<div class="flex flex-wrap items-center gap-6">
  <input type="checkbox" value="dark" class="toggle theme-controller" />
  <label class="swap swap-rotate">
    <input type="checkbox" class="theme-controller" value="dark" />
    <span class="swap-off">claro</span>
    <span class="swap-on">escuro</span>
  </label>
  <div class="join">
    <input type="radio" name="theme-buttons" class="btn theme-controller join-item" aria-label="Default" value="default" checked />
    <input type="radio" name="theme-buttons" class="btn theme-controller join-item" aria-label="Retro" value="retro" />
    <input type="radio" name="theme-buttons" class="btn theme-controller join-item" aria-label="Cyberpunk" value="cyberpunk" />
  </div>
</div>`,
};
