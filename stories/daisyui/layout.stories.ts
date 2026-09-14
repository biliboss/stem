import type { Meta, StoryObj } from "@storybook/html-vite";

const meta: Meta = { title: "DaisyUI/Layout" };
export default meta;
type Story = StoryObj;

const IMG = "https://img.daisyui.com/images";

export const Divider: Story = {
  render: () => `<div class="flex flex-col gap-4 w-96">
  <div class="flex w-full flex-col">
    <div class="card bg-base-300 rounded-box grid h-12 place-items-center">cima</div>
    <div class="divider">OU</div>
    <div class="card bg-base-300 rounded-box grid h-12 place-items-center">baixo</div>
  </div>
  <div class="flex w-full h-20">
    <div class="card bg-base-300 rounded-box grid grow place-items-center">esq</div>
    <div class="divider divider-horizontal">OU</div>
    <div class="card bg-base-300 rounded-box grid grow place-items-center">dir</div>
  </div>
  <div class="divider divider-primary divider-start">primary start</div>
  <div class="divider divider-success divider-end">success end</div>
  <div class="divider divider-error"></div>
</div>`,
};

export const DrawerSidebar: Story = {
  render: () => `<div class="drawer drawer-open lg:drawer-open h-64 border border-base-300 rounded-box overflow-hidden">
  <input id="sb-drawer" type="checkbox" class="drawer-toggle" checked />
  <div class="drawer-content p-4">
    <p>Conteúdo da página.</p>
    <label for="sb-drawer" class="btn btn-primary btn-sm mt-2">Alternar</label>
  </div>
  <div class="drawer-side absolute! h-full">
    <label for="sb-drawer" aria-label="fechar" class="drawer-overlay"></label>
    <ul class="menu bg-base-200 min-h-full w-48 p-4">
      <li><a>Item 1</a></li>
      <li><a>Item 2</a></li>
    </ul>
  </div>
</div>`,
};

export const Footer: Story = {
  render: () => `<div class="flex flex-col gap-4">
  <footer class="footer sm:footer-horizontal bg-neutral text-neutral-content p-10">
    <nav><h6 class="footer-title">Serviços</h6><a class="link link-hover">Marca</a><a class="link link-hover">Design</a></nav>
    <nav><h6 class="footer-title">Empresa</h6><a class="link link-hover">Sobre</a><a class="link link-hover">Contato</a></nav>
    <nav><h6 class="footer-title">Legal</h6><a class="link link-hover">Termos</a></nav>
  </footer>
  <footer class="footer footer-center bg-base-300 text-base-content p-4">
    <aside><p>© 2026 — footer-center</p></aside>
  </footer>
</div>`,
};

export const Hero: Story = {
  render: () => `<div class="flex flex-col gap-4">
  <div class="hero bg-base-200 min-h-64">
    <div class="hero-content text-center">
      <div class="max-w-md">
        <h1 class="text-4xl font-bold">Olá</h1>
        <p class="py-4">Hero centralizado.</p>
        <button class="btn btn-primary">Começar</button>
      </div>
    </div>
  </div>
  <div class="hero min-h-64" style="background-image: url(${IMG}/stock/photo-1507358522600-9f71e620c44e.webp);">
    <div class="hero-overlay"></div>
    <div class="hero-content text-neutral-content text-center"><h1 class="text-4xl font-bold">Com overlay</h1></div>
  </div>
</div>`,
};

export const Indicator: Story = {
  render: () => `<div class="flex flex-wrap gap-10 p-4">
  <div class="indicator">
    <span class="indicator-item status status-success"></span>
    <div class="bg-base-300 grid h-24 w-24 place-items-center">padrão</div>
  </div>
  <div class="indicator">
    <span class="indicator-item badge badge-secondary">99+</span>
    <button class="btn">Caixa</button>
  </div>
  <div class="indicator">
    <span class="indicator-item indicator-start indicator-middle badge badge-primary">start middle</span>
    <div class="bg-base-300 grid h-24 w-32 place-items-center">conteúdo</div>
  </div>
  <div class="indicator">
    <span class="indicator-item indicator-center indicator-bottom badge">center bottom</span>
    <div class="bg-base-300 grid h-24 w-32 place-items-center">conteúdo</div>
  </div>
</div>`,
};

export const Join: Story = {
  render: () => `<div class="flex flex-col gap-3 items-start">
  <div class="join">
    <button class="btn join-item">Um</button><button class="btn join-item">Dois</button><button class="btn join-item">Três</button>
  </div>
  <div class="join join-vertical">
    <button class="btn join-item">Vertical</button><button class="btn join-item">Dois</button>
  </div>
  <div class="join">
    <input class="input join-item" placeholder="E-mail" />
    <select class="select join-item"><option>Filtro</option></select>
    <button class="btn btn-primary join-item">Buscar</button>
  </div>
</div>`,
};

export const Mask: Story = {
  render: () => {
    const shapes = [
      "squircle", "heart", "hexagon", "hexagon-2", "decagon", "pentagon", "diamond",
      "square", "circle", "star", "star-2", "triangle", "triangle-2", "triangle-3", "triangle-4",
    ];
    return `<div class="flex flex-wrap gap-3">
  ${shapes.map((s) => `<img class="mask mask-${s} size-20" title="mask-${s}" src="${IMG}/stock/photo-1567653418876-5bb0e566e1c2.webp" />`).join("")}
</div>`;
  },
};

export const Stack: Story = {
  render: () => `<div class="flex flex-wrap gap-16 p-8">
  <div class="stack size-28">
    <div class="bg-primary text-primary-content grid place-content-center rounded-box">1</div>
    <div class="bg-accent text-accent-content grid place-content-center rounded-box">2</div>
    <div class="bg-secondary text-secondary-content grid place-content-center rounded-box">3</div>
  </div>
  <div class="stack stack-top size-28">
    <div class="card bg-base-200 border border-base-300 text-center"><div class="card-body">top</div></div>
    <div class="card bg-base-200 border border-base-300 text-center"><div class="card-body">B</div></div>
  </div>
  <div class="stack stack-start size-28">
    <div class="card bg-base-200 border border-base-300 text-center"><div class="card-body">start</div></div>
    <div class="card bg-base-200 border border-base-300 text-center"><div class="card-body">B</div></div>
  </div>
  <div class="stack stack-end size-28">
    <div class="card bg-base-200 border border-base-300 text-center"><div class="card-body">end</div></div>
    <div class="card bg-base-200 border border-base-300 text-center"><div class="card-body">B</div></div>
  </div>
</div>`,
};
