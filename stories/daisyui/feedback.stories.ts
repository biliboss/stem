import type { Meta, StoryObj } from "@storybook/html-vite";

const meta: Meta = { title: "DaisyUI/Feedback" };
export default meta;
type Story = StoryObj;

export const Alert: Story = {
  render: () => `<div class="flex flex-col gap-2 max-w-lg">
  <div role="alert" class="alert"><span>Padrão</span></div>
  <div role="alert" class="alert alert-info"><span>Info</span></div>
  <div role="alert" class="alert alert-success"><span>Success</span></div>
  <div role="alert" class="alert alert-warning"><span>Warning</span></div>
  <div role="alert" class="alert alert-error"><span>Error</span></div>
  <div role="alert" class="alert alert-info alert-soft"><span>Soft</span></div>
  <div role="alert" class="alert alert-success alert-outline"><span>Outline</span></div>
  <div role="alert" class="alert alert-warning alert-dash"><span>Dash</span></div>
  <div role="alert" class="alert alert-vertical sm:alert-horizontal">
    <span>Com ações</span>
    <div><button class="btn btn-sm">Negar</button> <button class="btn btn-sm btn-primary">Aceitar</button></div>
  </div>
</div>`,
};

export const Loading: Story = {
  render: () => `<div class="flex flex-col gap-3">
  <div class="flex items-center gap-4">
    <span class="loading loading-spinner"></span>
    <span class="loading loading-dots"></span>
    <span class="loading loading-ring"></span>
    <span class="loading loading-ball"></span>
    <span class="loading loading-bars"></span>
    <span class="loading loading-infinity"></span>
  </div>
  <div class="flex items-center gap-4">
    <span class="loading loading-spinner loading-xs"></span>
    <span class="loading loading-spinner loading-sm"></span>
    <span class="loading loading-spinner loading-md"></span>
    <span class="loading loading-spinner loading-lg"></span>
    <span class="loading loading-spinner loading-xl"></span>
    <span class="loading loading-spinner text-primary"></span>
    <span class="loading loading-spinner text-error"></span>
  </div>
</div>`,
};

export const Progress: Story = {
  render: () => `<div class="flex flex-col gap-2 w-64">
  <progress class="progress" value="10" max="100"></progress>
  <progress class="progress progress-neutral" value="20" max="100"></progress>
  <progress class="progress progress-primary" value="30" max="100"></progress>
  <progress class="progress progress-secondary" value="40" max="100"></progress>
  <progress class="progress progress-accent" value="50" max="100"></progress>
  <progress class="progress progress-info" value="60" max="100"></progress>
  <progress class="progress progress-success" value="70" max="100"></progress>
  <progress class="progress progress-warning" value="80" max="100"></progress>
  <progress class="progress progress-error" value="90" max="100"></progress>
  <progress class="progress"></progress>
</div>`,
};

export const RadialProgress: Story = {
  render: () => `<div class="flex flex-wrap items-center gap-4">
  <div class="radial-progress" style="--value:0;" aria-valuenow="0" role="progressbar">0%</div>
  <div class="radial-progress text-primary" style="--value:40;" aria-valuenow="40" role="progressbar">40%</div>
  <div class="radial-progress text-secondary" style="--value:70; --size:6rem; --thickness:4px;" aria-valuenow="70" role="progressbar">70%</div>
  <div class="radial-progress bg-primary text-primary-content border-primary border-4" style="--value:90;" aria-valuenow="90" role="progressbar">90%</div>
</div>`,
};

export const Skeleton: Story = {
  render: () => `<div class="flex flex-wrap gap-8">
  <div class="flex w-52 flex-col gap-4">
    <div class="skeleton h-32 w-full"></div>
    <div class="skeleton h-4 w-28"></div>
    <div class="skeleton h-4 w-full"></div>
  </div>
  <div class="flex items-center gap-4">
    <div class="skeleton h-16 w-16 shrink-0 rounded-full"></div>
    <div class="flex flex-col gap-4"><div class="skeleton h-4 w-20"></div><div class="skeleton h-4 w-28"></div></div>
  </div>
  <span class="skeleton skeleton-text text-2xl">Carregando texto…</span>
</div>`,
};

export const Toast: Story = {
  render: () => `<div class="relative h-72 w-full border border-base-300 rounded-box overflow-hidden">
  <div class="toast toast-top toast-start absolute!">
    <div class="alert alert-info"><span>top start</span></div>
  </div>
  <div class="toast toast-top toast-center absolute!">
    <div class="alert"><span>top center</span></div>
  </div>
  <div class="toast toast-middle toast-end absolute!">
    <div class="alert alert-warning"><span>middle end</span></div>
  </div>
  <div class="toast toast-bottom toast-end absolute!">
    <div class="alert alert-success"><span>Salvo.</span></div>
    <div class="alert alert-error"><span>Falhou.</span></div>
  </div>
</div>`,
};

export const Tooltip: Story = {
  render: () => `<div class="flex flex-col gap-10 p-10">
  <div class="flex flex-wrap gap-4">
    <div class="tooltip tooltip-open" data-tip="top"><button class="btn">Top</button></div>
    <div class="tooltip tooltip-open tooltip-bottom" data-tip="bottom"><button class="btn">Bottom</button></div>
    <div class="tooltip tooltip-open tooltip-left" data-tip="left"><button class="btn">Left</button></div>
    <div class="tooltip tooltip-open tooltip-right" data-tip="right"><button class="btn">Right</button></div>
  </div>
  <div class="flex flex-wrap gap-4">
    <div class="tooltip tooltip-open tooltip-neutral" data-tip="neutral"><button class="btn">N</button></div>
    <div class="tooltip tooltip-open tooltip-primary" data-tip="primary"><button class="btn">P</button></div>
    <div class="tooltip tooltip-open tooltip-secondary" data-tip="secondary"><button class="btn">S</button></div>
    <div class="tooltip tooltip-open tooltip-accent" data-tip="accent"><button class="btn">A</button></div>
    <div class="tooltip tooltip-open tooltip-info" data-tip="info"><button class="btn">I</button></div>
    <div class="tooltip tooltip-open tooltip-success" data-tip="success"><button class="btn">Su</button></div>
    <div class="tooltip tooltip-open tooltip-warning" data-tip="warning"><button class="btn">W</button></div>
    <div class="tooltip tooltip-open tooltip-error" data-tip="error"><button class="btn">E</button></div>
    <div class="tooltip">
      <div class="tooltip-content"><div class="font-black">Rico!</div></div>
      <button class="btn">tooltip-content (hover)</button>
    </div>
  </div>
</div>`,
};
