import type { Meta, StoryObj } from "@storybook/html-vite";

const meta: Meta = { title: "WebAwesome/Actions" };
export default meta;
type Story = StoryObj;

const row = (s: string) => `<div style="display:flex;flex-wrap:wrap;gap:.5rem;align-items:center">${s}</div>`;
const variants = ["neutral", "brand", "success", "warning", "danger"];

export const Button: Story = {
  render: () => `<div style="display:flex;flex-direction:column;gap:1rem">
  ${row(variants.map((v) => `<wa-button variant="${v}">${v}</wa-button>`).join(""))}
  ${row(["accent", "filled", "outlined", "filled-outlined", "plain"].map((a) => `<wa-button variant="brand" appearance="${a}">${a}</wa-button>`).join(""))}
  ${row(["xs", "s", "m", "l", "xl"].map((s) => `<wa-button size="${s}">Tamanho ${s}</wa-button>`).join(""))}
  ${row(`<wa-button variant="brand"><wa-icon slot="start" name="floppy-disk"></wa-icon>Salvar</wa-button>
    <wa-button><wa-icon slot="end" name="arrow-right"></wa-icon>Próximo</wa-button>
    <wa-button with-caret>Menu</wa-button>
    <wa-button pill>Pill</wa-button>
    <wa-button loading>Carregando</wa-button>
    <wa-button disabled>Desativado</wa-button>
    <wa-button href="https://webawesome.com" target="_blank">Link</wa-button>`)}
</div>`,
};

export const ButtonGroup: Story = {
  render: () => `<div style="display:flex;gap:2rem">
  <wa-button-group label="Alinhamento">
    <wa-button><wa-icon name="align-left" label="Esquerda"></wa-icon></wa-button>
    <wa-button><wa-icon name="align-center" label="Centro"></wa-icon></wa-button>
    <wa-button><wa-icon name="align-right" label="Direita"></wa-icon></wa-button>
  </wa-button-group>
  <wa-button-group label="Vertical" orientation="vertical">
    <wa-button variant="brand">Um</wa-button><wa-button variant="brand">Dois</wa-button><wa-button variant="brand">Três</wa-button>
  </wa-button-group>
</div>`,
};

export const CopyButton: Story = {
  render: () => row(`<wa-copy-button value="Texto copiado"></wa-copy-button>
  <wa-copy-button value="pt-BR" copy-label="Copiar" success-label="Copiado!" error-label="Falhou" tooltip-placement="right"></wa-copy-button>
  <wa-input id="wa-copy-src" value="copie de um input" style="width:14rem"></wa-input>
  <wa-copy-button from="wa-copy-src.value"></wa-copy-button>
  <wa-copy-button value="x" disabled></wa-copy-button>`),
};

export const Dropdown: Story = {
  render: () => row(`<wa-dropdown>
    <wa-button slot="trigger" with-caret>Ações</wa-button>
    <wa-dropdown-item value="edit"><wa-icon slot="icon" name="pen"></wa-icon>Editar</wa-dropdown-item>
    <wa-dropdown-item value="copy"><wa-icon slot="icon" name="copy"></wa-icon>Duplicar<span slot="details">⌘D</span></wa-dropdown-item>
    <wa-dropdown-item type="checkbox" value="pin" checked>Fixado</wa-dropdown-item>
    <wa-dropdown-item value="more">Mais
      <wa-dropdown-item slot="submenu" value="a">Arquivar</wa-dropdown-item>
      <wa-dropdown-item slot="submenu" value="b">Mover</wa-dropdown-item>
    </wa-dropdown-item>
    <wa-divider></wa-divider>
    <wa-dropdown-item value="off" disabled>Indisponível</wa-dropdown-item>
    <wa-dropdown-item variant="danger" value="delete"><wa-icon slot="icon" name="trash"></wa-icon>Excluir</wa-dropdown-item>
  </wa-dropdown>
  <wa-dropdown placement="top-start" size="s">
    <wa-button slot="trigger" appearance="outlined" with-caret>Pequeno, acima</wa-button>
    <wa-dropdown-item>Um</wa-dropdown-item><wa-dropdown-item>Dois</wa-dropdown-item>
  </wa-dropdown>`),
};
