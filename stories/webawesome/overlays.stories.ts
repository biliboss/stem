import type { Meta, StoryObj } from "@storybook/html-vite";

const meta: Meta = { title: "WebAwesome/Overlays" };
export default meta;
type Story = StoryObj;

const row = (s: string) => `<div style="display:flex;flex-wrap:wrap;gap:1rem;align-items:center">${s}</div>`;

/** Declarative: data-dialog="open <id>" on the trigger, data-dialog="close" inside. */
export const Dialog: Story = {
  render: () => `${row(`<wa-button data-dialog="open wa-dlg-1">Abrir diálogo</wa-button>
  <wa-button data-dialog="open wa-dlg-2" appearance="outlined">Sem header, light-dismiss</wa-button>`)}
<wa-dialog id="wa-dlg-1" label="Confirmar exclusão" with-footer>
  Tem certeza? Esta ação não pode ser desfeita.
  <wa-button slot="header-actions" appearance="plain"><wa-icon name="arrow-up-right-from-square" label="Abrir"></wa-icon></wa-button>
  <div slot="footer" style="display:flex;gap:.5rem;justify-content:flex-end">
    <wa-button data-dialog="close">Cancelar</wa-button><wa-button variant="danger" data-dialog="close">Excluir</wa-button>
  </div>
</wa-dialog>
<wa-dialog id="wa-dlg-2" without-header light-dismiss>Clique fora para fechar.</wa-dialog>`,
};

export const Drawer: Story = {
  render: () => `${row(["end", "start", "top", "bottom"].map((p) => `<wa-button data-drawer="open wa-drw-${p}">Drawer ${p}</wa-button>`).join(""))}
${["end", "start", "top", "bottom"].map((p) => `<wa-drawer id="wa-drw-${p}" label="Filtros (${p})" placement="${p}" light-dismiss with-footer>
  Conteúdo do drawer.
  <wa-button slot="footer" variant="brand" data-drawer="close">Aplicar</wa-button>
</wa-drawer>`).join("")}`,
};

/** Declarative: the popover's for= names the trigger id. */
export const Popover: Story = {
  render: () => row(`<wa-button id="wa-pop-1">Popover</wa-button>
  <wa-popover for="wa-pop-1"><div style="display:flex;flex-direction:column;gap:.5rem"><strong>Detalhes</strong>Conteúdo interativo.<wa-button size="s" variant="brand">Ação</wa-button></div></wa-popover>
  <wa-button id="wa-pop-2" appearance="outlined">À direita, sem seta</wa-button>
  <wa-popover for="wa-pop-2" placement="right" without-arrow distance="12">Sem seta.</wa-popover>`),
};

export const Tooltip: Story = {
  render: () => row(`<wa-button id="wa-tip-1">Hover</wa-button><wa-tooltip for="wa-tip-1">Dica no topo</wa-tooltip>
  <wa-button id="wa-tip-2">Bottom</wa-button><wa-tooltip for="wa-tip-2" placement="bottom" show-delay="300">Com atraso</wa-tooltip>
  <wa-button id="wa-tip-3">Click</wa-button><wa-tooltip for="wa-tip-3" trigger="click" without-arrow>Abre no clique</wa-tooltip>
  <wa-icon id="wa-tip-4" name="circle-question" style="font-size:1.25rem"></wa-icon><wa-tooltip for="wa-tip-4" placement="right">Ajuda</wa-tooltip>`),
};

/** wa-toast has no declarative trigger: the docs call toast.create(); static wa-toast-item children show variants. */
export const Toast: Story = {
  render: () => `<div id="wa-toast-demo">
  ${row(["brand", "success", "warning", "danger", "neutral"].map((v) => `<wa-button data-variant="${v}" variant="${v}">Toast ${v}</wa-button>`).join(""))}
  <wa-toast placement="bottom-end"></wa-toast>
</div>
<script type="module">
  const root = document.getElementById("wa-toast-demo");
  const toast = root.querySelector("wa-toast");
  const icons = { brand: "circle-info", success: "circle-check", warning: "triangle-exclamation", danger: "circle-xmark", neutral: "bell" };
  root.querySelectorAll("wa-button").forEach((b) => b.addEventListener("click", () => {
    const variant = b.dataset.variant;
    toast.create("Notificação " + variant, { variant, icon: icons[variant] });
  }));
</script>`,
};
