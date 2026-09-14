import type { Meta, StoryObj } from "@storybook/html-vite";

const meta: Meta = { title: "DaisyUI/Navigation" };
export default meta;
type Story = StoryObj;

export const Breadcrumbs: Story = {
  render: () => `<div class="flex flex-col gap-2">
  <div class="breadcrumbs text-sm">
    <ul><li><a>Início</a></li><li><a>Imóveis</a></li><li>Apartamento</li></ul>
  </div>
  <div class="breadcrumbs max-w-xs text-xs">
    <ul><li>Longo</li><li>caminho</li><li>que</li><li>rola</li><li>na</li><li>horizontal</li></ul>
  </div>
</div>`,
};

export const Dock: Story = {
  render: () => `<div class="flex flex-col gap-4 w-96">
  <div class="dock dock-xs relative!"><button>🏠</button><button class="dock-active">📥</button><button>⚙️</button></div>
  <div class="dock dock-sm relative!">
    <button><span>🏠</span><span class="dock-label">Início</span></button>
    <button class="dock-active"><span>📥</span><span class="dock-label">Caixa</span></button>
    <button><span>⚙️</span><span class="dock-label">Ajustes</span></button>
  </div>
  <div class="dock dock-md relative!"><button>🏠</button><button>📥</button><button class="dock-active">⚙️</button></div>
  <div class="dock dock-lg relative!"><button class="dock-active">🏠</button><button>📥</button><button>⚙️</button></div>
  <div class="dock dock-xl relative!"><button>🏠</button><button class="dock-active">📥</button><button>⚙️</button></div>
</div>`,
};

export const Link: Story = {
  render: () => `<div class="flex flex-wrap gap-3">
  <a class="link">Padrão</a>
  <a class="link link-hover">Hover</a>
  <a class="link link-neutral">Neutral</a>
  <a class="link link-primary">Primary</a>
  <a class="link link-secondary">Secondary</a>
  <a class="link link-accent">Accent</a>
  <a class="link link-info">Info</a>
  <a class="link link-success">Success</a>
  <a class="link link-warning">Warning</a>
  <a class="link link-error">Error</a>
</div>`,
};

export const Megamenu: Story = {
  render: () => `<div class="min-h-64">
  <div class="megamenu megamenu-wide p-2 border border-base-300 rounded-box">
    <span class="megamenu-active"></span>
    <button popovertarget="sb-mega-1">Produtos</button>
    <div id="sb-mega-1" popover>
      <ul class="menu p-4"><li><a>Busca</a></li><li><a>Anúncios</a></li></ul>
    </div>
    <button popovertarget="sb-mega-2">Recursos</button>
    <div id="sb-mega-2" popover>
      <div class="p-4">Blog, guias e ajuda.</div>
    </div>
    <button popovertarget="sb-mega-3">Empresa</button>
    <div id="sb-mega-3" popover>
      <div class="p-4">Sobre nós.</div>
    </div>
  </div>
  <div class="megamenu megamenu-vertical megamenu-sm mt-4 w-48 p-2 border border-base-300 rounded-box">
    <span class="megamenu-active"></span>
    <button popovertarget="sb-mega-4">Vertical SM</button>
    <div id="sb-mega-4" popover><div class="p-4">Conteúdo.</div></div>
  </div>
</div>`,
};

export const Menu: Story = {
  render: () => `<div class="flex flex-wrap items-start gap-6">
  <ul class="menu bg-base-200 rounded-box w-56">
    <li class="menu-title">Título</li>
    <li><a>Item 1</a></li>
    <li><a class="menu-active">Ativo</a></li>
    <li class="menu-disabled"><a>Desabilitado</a></li>
    <li>
      <details open>
        <summary>Submenu</summary>
        <ul><li><a>Filho 1</a></li><li><a>Filho 2</a></li></ul>
      </details>
    </li>
  </ul>
  <ul class="menu menu-horizontal menu-sm bg-base-200 rounded-box">
    <li><a>Horizontal</a></li><li><a>SM</a></li><li><a>Três</a></li>
  </ul>
  <ul class="menu menu-xs bg-base-200 rounded-box w-40"><li><a>XS</a></li></ul>
  <ul class="menu menu-lg bg-base-200 rounded-box w-40"><li><a>LG</a></li></ul>
</div>`,
};

export const Navbar: Story = {
  render: () => `<div class="flex flex-col gap-4">
  <div class="navbar bg-base-100 shadow-sm">
    <div class="navbar-start"><a class="btn btn-ghost text-xl">daisyUI</a></div>
    <div class="navbar-center"><ul class="menu menu-horizontal px-1"><li><a>Link</a></li><li><a>Outro</a></li></ul></div>
    <div class="navbar-end"><a class="btn btn-primary">Entrar</a></div>
  </div>
  <div class="navbar bg-neutral text-neutral-content">
    <button class="btn btn-ghost text-xl">Neutral</button>
  </div>
  <div class="navbar bg-primary text-primary-content">
    <div class="flex-1"><button class="btn btn-ghost text-xl">Primary</button></div>
    <div class="flex-none"><input type="text" placeholder="Buscar" class="input input-sm w-32" /></div>
  </div>
</div>`,
};

export const Pagination: Story = {
  render: () => `<div class="flex flex-col gap-3">
  <div class="join">
    <button class="join-item btn">1</button>
    <button class="join-item btn btn-active">2</button>
    <button class="join-item btn">3</button>
    <button class="join-item btn btn-disabled">...</button>
    <button class="join-item btn">99</button>
  </div>
  <div class="join">
    <button class="join-item btn btn-xs">«</button>
    <button class="join-item btn btn-xs">Página 2</button>
    <button class="join-item btn btn-xs">»</button>
  </div>
  <div class="join grid grid-cols-2 w-64">
    <button class="join-item btn btn-outline">Anterior</button>
    <button class="join-item btn btn-outline">Próxima</button>
  </div>
</div>`,
};

export const Steps: Story = {
  render: () => `<div class="flex flex-col gap-6">
  <ul class="steps">
    <li class="step step-primary">Cadastro</li>
    <li class="step step-primary">Plano</li>
    <li class="step">Pagamento</li>
    <li class="step">Pronto</li>
  </ul>
  <ul class="steps">
    <li class="step step-neutral">Neutral</li>
    <li class="step step-secondary">Secondary</li>
    <li class="step step-accent">Accent</li>
    <li class="step step-info">Info</li>
    <li class="step step-success">Success</li>
    <li class="step step-warning">Warning</li>
    <li class="step step-error" data-content="✕">Error</li>
  </ul>
  <ul class="steps steps-vertical">
    <li class="step step-primary"><span class="step-icon">😀</span>Vertical</li>
    <li class="step">Dois</li>
  </ul>
</div>`,
};

export const Tab: Story = {
  render: () => `<div class="flex flex-col gap-4">
  <div role="tablist" class="tabs">
    <a role="tab" class="tab">Tab 1</a><a role="tab" class="tab tab-active">Tab 2</a><a role="tab" class="tab tab-disabled">Tab 3</a>
  </div>
  <div role="tablist" class="tabs tabs-border">
    <a role="tab" class="tab">Border</a><a role="tab" class="tab tab-active">Ativa</a><a role="tab" class="tab">Três</a>
  </div>
  <div role="tablist" class="tabs tabs-lift">
    <a role="tab" class="tab">Lift</a><a role="tab" class="tab tab-active">Ativa</a><a role="tab" class="tab">Três</a>
  </div>
  <div role="tablist" class="tabs tabs-box tabs-sm">
    <a role="tab" class="tab">Box SM</a><a role="tab" class="tab tab-active">Ativa</a><a role="tab" class="tab">Três</a>
  </div>
  <div class="tabs tabs-lift">
    <input type="radio" name="sb-tabs" class="tab" aria-label="Com conteúdo" checked />
    <div class="tab-content bg-base-100 border-base-300 p-6">Painel 1</div>
    <input type="radio" name="sb-tabs" class="tab" aria-label="Outra" />
    <div class="tab-content bg-base-100 border-base-300 p-6">Painel 2</div>
  </div>
</div>`,
};
