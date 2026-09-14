import type { Meta, StoryObj } from "@storybook/html-vite";

const meta: Meta = { title: "DaisyUI/Data display" };
export default meta;
type Story = StoryObj;

const IMG = "https://img.daisyui.com/images";

export const Accordion: Story = {
  render: () => `<div class="flex flex-col gap-2 max-w-md">
  <div class="collapse collapse-arrow bg-base-100 border border-base-300">
    <input type="radio" name="acc-1" checked />
    <div class="collapse-title font-semibold">Pergunta 1</div>
    <div class="collapse-content text-sm">Resposta 1.</div>
  </div>
  <div class="collapse collapse-plus bg-base-100 border border-base-300">
    <input type="radio" name="acc-1" />
    <div class="collapse-title font-semibold">Pergunta 2</div>
    <div class="collapse-content text-sm">Resposta 2.</div>
  </div>
  <details class="collapse collapse-arrow bg-base-100 border border-base-300" name="acc-2">
    <summary class="collapse-title font-semibold">Com details</summary>
    <div class="collapse-content text-sm">Resposta 3.</div>
  </details>
</div>`,
};

export const Avatar: Story = {
  render: () => `<div class="flex flex-wrap items-center gap-4">
  <div class="avatar"><div class="w-8 rounded"><img src="${IMG}/profile/demo/yellingcat@192.webp" /></div></div>
  <div class="avatar"><div class="w-12 rounded-full"><img src="${IMG}/profile/demo/batperson@192.webp" /></div></div>
  <div class="avatar avatar-online"><div class="w-16 rounded-full"><img src="${IMG}/profile/demo/gordon@192.webp" /></div></div>
  <div class="avatar avatar-offline"><div class="mask mask-squircle w-16"><img src="${IMG}/profile/demo/distracted1@192.webp" /></div></div>
  <div class="avatar"><div class="ring-primary ring-offset-base-100 w-16 rounded-full ring-2 ring-offset-2"><img src="${IMG}/profile/demo/spiderperson@192.webp" /></div></div>
  <div class="avatar avatar-placeholder"><div class="bg-neutral text-neutral-content w-16 rounded-full"><span class="text-xl">GB</span></div></div>
  <div class="avatar-group -space-x-6">
    <div class="avatar"><div class="w-12"><img src="${IMG}/profile/demo/batperson@192.webp" /></div></div>
    <div class="avatar"><div class="w-12"><img src="${IMG}/profile/demo/gordon@192.webp" /></div></div>
    <div class="avatar avatar-placeholder"><div class="bg-neutral text-neutral-content w-12"><span>+9</span></div></div>
  </div>
</div>`,
};

export const Aura: Story = {
  render: () => `<div class="flex flex-wrap items-center gap-8 p-6">
  <div class="aura"><div class="card bg-base-100"><div class="card-body"><p>Aura</p></div></div></div>
  <div class="aura aura-dual"><button class="btn">Dual</button></div>
  <div class="aura aura-rainbow"><button class="btn">Rainbow</button></div>
  <div class="aura aura-holo"><button class="btn">Holo</button></div>
  <div class="aura aura-gold aura-lg"><button class="btn">Gold LG</button></div>
  <div class="aura aura-silver aura-sm"><button class="btn">Silver SM</button></div>
  <div class="aura aura-glow"><button class="btn">Glow</button></div>
</div>`,
};

export const Badge: Story = {
  render: () => `<div class="flex flex-col gap-3">
  <div class="flex flex-wrap gap-2">
    <span class="badge">Padrão</span>
    <span class="badge badge-neutral">Neutral</span>
    <span class="badge badge-primary">Primary</span>
    <span class="badge badge-secondary">Secondary</span>
    <span class="badge badge-accent">Accent</span>
    <span class="badge badge-info">Info</span>
    <span class="badge badge-success">Success</span>
    <span class="badge badge-warning">Warning</span>
    <span class="badge badge-error">Error</span>
  </div>
  <div class="flex flex-wrap gap-2">
    <span class="badge badge-primary badge-outline">Outline</span>
    <span class="badge badge-primary badge-dash">Dash</span>
    <span class="badge badge-primary badge-soft">Soft</span>
    <span class="badge badge-ghost">Ghost</span>
  </div>
  <div class="flex flex-wrap items-center gap-2">
    <span class="badge badge-xs">XS</span>
    <span class="badge badge-sm">SM</span>
    <span class="badge badge-md">MD</span>
    <span class="badge badge-lg">LG</span>
    <span class="badge badge-xl">XL</span>
  </div>
</div>`,
};

export const Card: Story = {
  render: () => `<div class="flex flex-wrap gap-4 items-start">
  <div class="card bg-base-100 w-64 shadow-sm">
    <figure><img src="${IMG}/stock/photo-1606107557195-0e29a4b5b4aa.webp" alt="Tênis" /></figure>
    <div class="card-body">
      <h2 class="card-title">Card <span class="badge badge-secondary">novo</span></h2>
      <p>Texto curto do card.</p>
      <div class="card-actions justify-end"><button class="btn btn-primary">Comprar</button></div>
    </div>
  </div>
  <div class="card card-border bg-base-100 w-64">
    <div class="card-body">
      <h2 class="card-title">Border</h2>
      <p>card-border</p>
    </div>
  </div>
  <div class="card card-dash card-sm bg-base-100 w-56">
    <div class="card-body"><h2 class="card-title">Dash SM</h2><p>card-dash card-sm</p></div>
  </div>
  <div class="card image-full w-64 shadow-sm">
    <figure><img src="${IMG}/stock/photo-1606107557195-0e29a4b5b4aa.webp" alt="Tênis" /></figure>
    <div class="card-body"><h2 class="card-title">image-full</h2><p>Sobre a imagem.</p></div>
  </div>
  <div class="card card-side bg-base-100 shadow-sm w-96">
    <figure class="w-32"><img src="${IMG}/stock/photo-1635805737707-575885ab0820.webp" alt="Filme" /></figure>
    <div class="card-body"><h2 class="card-title">card-side</h2><p>Lado a lado.</p></div>
  </div>
</div>`,
};

export const Carousel: Story = {
  render: () => `<div class="flex flex-col gap-4">
  <div class="carousel carousel-start rounded-box w-96">
    <div class="carousel-item"><img src="${IMG}/stock/photo-1559703248-dcaaec9fab78.webp" class="h-40" /></div>
    <div class="carousel-item"><img src="${IMG}/stock/photo-1565098772267-60af42b81ef2.webp" class="h-40" /></div>
    <div class="carousel-item"><img src="${IMG}/stock/photo-1572635148818-ef6fd45eb394.webp" class="h-40" /></div>
    <div class="carousel-item"><img src="${IMG}/stock/photo-1494253109108-2e30c049369b.webp" class="h-40" /></div>
  </div>
  <div class="carousel carousel-center carousel-vertical rounded-box h-40 w-64">
    <div class="carousel-item h-full"><img src="${IMG}/stock/photo-1559703248-dcaaec9fab78.webp" /></div>
    <div class="carousel-item h-full"><img src="${IMG}/stock/photo-1565098772267-60af42b81ef2.webp" /></div>
  </div>
</div>`,
};

export const ChatBubble: Story = {
  render: () => `<div class="max-w-md">
  <div class="chat chat-start">
    <div class="chat-image avatar"><div class="w-10 rounded-full"><img src="${IMG}/profile/demo/kenobee@192.webp" /></div></div>
    <div class="chat-header">Obi-Wan <time class="text-xs opacity-50">12:45</time></div>
    <div class="chat-bubble">Você era o escolhido!</div>
    <div class="chat-footer opacity-50">Entregue</div>
  </div>
  <div class="chat chat-end">
    <div class="chat-bubble chat-bubble-primary">Primary</div>
  </div>
  <div class="chat chat-start"><div class="chat-bubble chat-bubble-secondary">Secondary</div></div>
  <div class="chat chat-end"><div class="chat-bubble chat-bubble-accent">Accent</div></div>
  <div class="chat chat-start"><div class="chat-bubble chat-bubble-info">Info</div></div>
  <div class="chat chat-end"><div class="chat-bubble chat-bubble-success">Success</div></div>
  <div class="chat chat-start"><div class="chat-bubble chat-bubble-warning">Warning</div></div>
  <div class="chat chat-end"><div class="chat-bubble chat-bubble-error">Error</div></div>
</div>`,
};

export const Collapse: Story = {
  render: () => `<div class="flex flex-col gap-2 max-w-md">
  <div tabindex="0" class="collapse bg-base-100 border border-base-300">
    <div class="collapse-title font-semibold">Foco</div>
    <div class="collapse-content text-sm">Abre com foco.</div>
  </div>
  <div class="collapse collapse-arrow bg-base-100 border border-base-300">
    <input type="checkbox" />
    <div class="collapse-title font-semibold">Checkbox + arrow</div>
    <div class="collapse-content text-sm">Conteúdo.</div>
  </div>
  <div class="collapse collapse-plus collapse-open bg-base-100 border border-base-300">
    <div class="collapse-title font-semibold">Forçado aberto</div>
    <div class="collapse-content text-sm">collapse-open</div>
  </div>
  <details class="collapse bg-base-100 border border-base-300">
    <summary class="collapse-title font-semibold">Details</summary>
    <div class="collapse-content text-sm">Conteúdo.</div>
  </details>
</div>`,
};

export const Countdown: Story = {
  render: () => `<div class="flex flex-wrap items-end gap-6">
  <span class="countdown font-mono text-6xl"><span style="--value:59;" aria-live="polite" aria-label="59">59</span></span>
  <span class="countdown font-mono text-2xl">
    <span style="--value:10;">10</span>h
    <span style="--value:24; --digits:2;">24</span>m
    <span style="--value:7; --digits:2;">07</span>s
  </span>
  <div class="grid auto-cols-max grid-flow-col gap-5 text-center">
    <div class="flex flex-col"><span class="countdown font-mono text-4xl"><span style="--value:15;">15</span></span>dias</div>
    <div class="flex flex-col"><span class="countdown font-mono text-4xl"><span style="--value:10;">10</span></span>horas</div>
  </div>
</div>`,
};

export const Diff: Story = {
  render: () => `<figure class="diff aspect-16/9 w-96" tabindex="0">
  <div class="diff-item-1" role="img" tabindex="0"><img alt="daisy" src="${IMG}/stock/photo-1560717789-0ac7c58ac90a.webp" /></div>
  <div class="diff-item-2" role="img"><img alt="daisy" src="${IMG}/stock/photo-1560717789-0ac7c58ac90a-blur.webp" /></div>
  <div class="diff-resizer"></div>
</figure>`,
};

export const Hover3d: Story = {
  render: () => `<div class="flex gap-6">
  <div class="hover-3d">
    <figure class="max-w-80 rounded-2xl">
      <img src="${IMG}/stock/card-1.webp" alt="Cartão" />
    </figure>
    <div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div>
  </div>
  <div class="hover-3d">
    <div class="card bg-neutral text-neutral-content w-64">
      <div class="card-body"><h2 class="card-title">Card 3D</h2><p>Passe o mouse.</p></div>
    </div>
    <div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div>
  </div>
</div>`,
};

export const HoverGallery: Story = {
  render: () => `<div class="flex gap-6">
  <figure class="hover-gallery max-w-60">
    <img alt="Chapéu 1" src="${IMG}/stock/daisyui-hat-1.webp" />
    <img alt="Chapéu 2" src="${IMG}/stock/daisyui-hat-2.webp" />
    <img alt="Chapéu 3" src="${IMG}/stock/daisyui-hat-3.webp" />
    <img alt="Chapéu 4" src="${IMG}/stock/daisyui-hat-4.webp" />
  </figure>
  <div class="card card-sm bg-base-200 max-w-60 shadow">
    <figure class="hover-gallery">
      <img alt="Chapéu 1" src="${IMG}/stock/daisyui-hat-1.webp" />
      <img alt="Chapéu 2" src="${IMG}/stock/daisyui-hat-2.webp" />
    </figure>
    <div class="card-body"><h2 class="card-title">Chapéu</h2><p>R$ 99</p></div>
  </div>
</div>`,
};

export const Kbd: Story = {
  render: () => `<div class="flex flex-wrap items-center gap-2">
  <kbd class="kbd kbd-xs">xs</kbd>
  <kbd class="kbd kbd-sm">sm</kbd>
  <kbd class="kbd kbd-md">md</kbd>
  <kbd class="kbd kbd-lg">lg</kbd>
  <kbd class="kbd kbd-xl">xl</kbd>
  <span class="ml-4"><kbd class="kbd kbd-sm">⌘</kbd> + <kbd class="kbd kbd-sm">K</kbd></span>
</div>`,
};

export const List: Story = {
  render: () => `<ul class="list bg-base-100 rounded-box shadow-md max-w-md">
  <li class="p-4 pb-2 text-xs opacity-60 tracking-wide">Mais tocadas</li>
  <li class="list-row">
    <div><img class="size-10 rounded-box" src="${IMG}/profile/demo/1@94.webp" /></div>
    <div><div>Dio Lupa</div><div class="text-xs uppercase font-semibold opacity-60">Remaining Reason</div></div>
    <button class="btn btn-square btn-ghost">▶</button>
  </li>
  <li class="list-row">
    <div><img class="size-10 rounded-box" src="${IMG}/profile/demo/4@94.webp" /></div>
    <div class="list-col-grow"><div>Ellie Beilish</div><div class="text-xs uppercase font-semibold opacity-60">Bears of a fever</div></div>
    <button class="btn btn-square btn-ghost">▶</button>
  </li>
  <li class="list-row">
    <div class="text-4xl font-thin opacity-30 tabular-nums">03</div>
    <div><div>Sabrino Gardener</div><p class="list-col-wrap text-xs">list-col-wrap joga este texto para a linha de baixo.</p></div>
  </li>
</ul>`,
};

export const Stat: Story = {
  render: () => `<div class="flex flex-col gap-4">
  <div class="stats shadow">
    <div class="stat">
      <div class="stat-figure text-primary">♥</div>
      <div class="stat-title">Curtidas</div>
      <div class="stat-value text-primary">25,6K</div>
      <div class="stat-desc">21% a mais</div>
    </div>
    <div class="stat">
      <div class="stat-title">Visitas</div>
      <div class="stat-value">2,6M</div>
      <div class="stat-desc">jan–fev</div>
      <div class="stat-actions"><button class="btn btn-xs btn-success">Ver</button></div>
    </div>
  </div>
  <div class="stats stats-vertical shadow w-48">
    <div class="stat place-items-center"><div class="stat-title">Vertical</div><div class="stat-value">31K</div></div>
    <div class="stat place-items-center"><div class="stat-title">Usuários</div><div class="stat-value text-secondary">4.200</div></div>
  </div>
</div>`,
};

export const Status: Story = {
  render: () => `<div class="flex flex-col gap-3">
  <div class="flex items-center gap-3">
    <span class="status"></span>
    <span class="status status-neutral"></span>
    <span class="status status-primary"></span>
    <span class="status status-secondary"></span>
    <span class="status status-accent"></span>
    <span class="status status-info"></span>
    <span class="status status-success"></span>
    <span class="status status-warning"></span>
    <span class="status status-error"></span>
  </div>
  <div class="flex items-center gap-3">
    <span class="status status-xs"></span>
    <span class="status status-sm"></span>
    <span class="status status-md"></span>
    <span class="status status-lg"></span>
    <span class="status status-xl"></span>
    <span class="ml-4 inline-grid *:[grid-area:1/1]"><span class="status status-error animate-ping"></span><span class="status status-error"></span></span> Servidor fora
  </div>
</div>`,
};

export const Table: Story = {
  render: () => `<div class="flex flex-col gap-6">
  <div class="overflow-x-auto rounded-box border border-base-content/5 bg-base-100">
    <table class="table table-zebra">
      <thead><tr><th></th><th>Nome</th><th>Cargo</th></tr></thead>
      <tbody>
        <tr><th>1</th><td>Ana</td><td>Corretora</td></tr>
        <tr class="row-hover"><th>2</th><td>Bruno</td><td>Dev</td></tr>
        <tr><th>3</th><td>Carla</td><td>Design</td></tr>
      </tbody>
    </table>
  </div>
  <table class="table table-xs table-pin-rows table-pin-cols">
    <thead><tr><th>#</th><td>XS</td><td>pin</td></tr></thead>
    <tbody><tr><th>1</th><td>a</td><td>b</td></tr></tbody>
  </table>
</div>`,
};

export const TextRotate: Story = {
  render: () => `<div class="flex flex-col gap-4">
  <span class="text-rotate text-4xl">
    <span>
      <span>DESENHE</span>
      <span>CONSTRUA</span>
      <span>ENTREGUE</span>
    </span>
  </span>
  <span class="text-2xl">Feito para
    <span class="text-rotate">
      <span class="justify-items-center">
        <span class="bg-primary text-primary-content px-2">corretores</span>
        <span class="bg-secondary text-secondary-content px-2">designers</span>
        <span class="bg-accent text-accent-content px-2">devs</span>
      </span>
    </span>
  </span>
</div>`,
};

export const Timeline: Story = {
  render: () => `<div class="flex flex-col gap-8">
  <ul class="timeline">
    <li>
      <div class="timeline-start timeline-box">1984</div>
      <div class="timeline-middle">●</div>
      <div class="timeline-end">Mac</div>
      <hr class="bg-primary" />
    </li>
    <li>
      <hr class="bg-primary" />
      <div class="timeline-start">1998</div>
      <div class="timeline-middle">●</div>
      <div class="timeline-end timeline-box">iMac</div>
      <hr />
    </li>
    <li>
      <hr />
      <div class="timeline-start timeline-box">2007</div>
      <div class="timeline-middle">○</div>
      <div class="timeline-end">iPhone</div>
    </li>
  </ul>
  <ul class="timeline timeline-vertical timeline-compact timeline-snap-icon">
    <li><div class="timeline-middle">●</div><div class="timeline-end timeline-box">Vertical compacto</div><hr /></li>
    <li><hr /><div class="timeline-middle">●</div><div class="timeline-end timeline-box">Segundo</div></li>
  </ul>
</div>`,
};
