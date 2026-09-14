import type { Meta, StoryObj } from "@storybook/html-vite";

const meta: Meta = { title: "WebAwesome/Navigation" };
export default meta;
type Story = StoryObj;

const col = (s: string) => `<div style="display:flex;flex-direction:column;gap:1.5rem">${s}</div>`;

export const Breadcrumb: Story = {
  render: () => col(`<wa-breadcrumb label="Trilha">
    <wa-breadcrumb-item href="#"><wa-icon slot="start" name="house"></wa-icon>Início</wa-breadcrumb-item>
    <wa-breadcrumb-item href="#">Imóveis</wa-breadcrumb-item>
    <wa-breadcrumb-item>Apartamento 42</wa-breadcrumb-item>
  </wa-breadcrumb>
  <wa-breadcrumb>
    <wa-icon slot="separator" name="angle-right"></wa-icon>
    <wa-breadcrumb-item href="#">Docs</wa-breadcrumb-item><wa-breadcrumb-item href="#">Componentes</wa-breadcrumb-item><wa-breadcrumb-item>Breadcrumb</wa-breadcrumb-item>
  </wa-breadcrumb>`),
};

const tabs = (attrs = "") => `<wa-tab-group ${attrs}>
  <wa-tab panel="geral">Geral</wa-tab><wa-tab panel="fotos">Fotos</wa-tab><wa-tab panel="off" disabled>Desativada</wa-tab>
  <wa-tab-panel name="geral">Visão geral do imóvel.</wa-tab-panel>
  <wa-tab-panel name="fotos">Galeria de fotos.</wa-tab-panel>
  <wa-tab-panel name="off">—</wa-tab-panel>
</wa-tab-group>`;

export const TabGroup: Story = {
  render: () => col(`${tabs()}${tabs(`placement="bottom" active="fotos"`)}${tabs(`placement="start" activation="manual"`)}`),
};

export const Pagination: Story = {
  render: () => col(`<wa-pagination total="200" page-size="10" page="5" label="Resultados"></wa-pagination>
  <wa-pagination total="200" page-size="10" page="1" with-edges with-summary appearance="filled"></wa-pagination>
  <wa-pagination total="50" page-size="10" page="3" format="compact" appearance="plain"></wa-pagination>
  <wa-pagination total="100" page-size="10" page="2" sibling-count="2" boundary-count="2" disabled></wa-pagination>`),
};

export const Tree: Story = {
  render: () => `<div style="display:flex;gap:3rem">
  <wa-tree selection="single">
    <wa-tree-item expanded><wa-icon name="folder"></wa-icon>Projetos
      <wa-tree-item selected><wa-icon name="file"></wa-icon>leia-me.md</wa-tree-item>
      <wa-tree-item>src
        <wa-tree-item>index.ts</wa-tree-item><wa-tree-item disabled>gerado.ts</wa-tree-item>
      </wa-tree-item>
    </wa-tree-item>
    <wa-tree-item lazy>Carrega sob demanda</wa-tree-item>
  </wa-tree>
  <wa-tree selection="multiple">
    <wa-tree-item expanded>Cômodos<wa-tree-item>Sala</wa-tree-item><wa-tree-item>Cozinha</wa-tree-item><wa-tree-item>Quarto</wa-tree-item></wa-tree-item>
  </wa-tree>
</div>`,
};

export const Accordion: Story = {
  render: () => col(`<wa-accordion>
    <wa-accordion-item label="Como agendo uma visita?" expanded>Pelo botão Agendar na página do imóvel.</wa-accordion-item>
    <wa-accordion-item label="Posso financiar?">Sim, com os principais bancos.</wa-accordion-item>
    <wa-accordion-item label="Indisponível" disabled>—</wa-accordion-item>
  </wa-accordion>
  <wa-accordion mode="multiple" appearance="outlined" icon-placement="start">
    <wa-accordion-item><span slot="label">Com ícone</span><wa-icon slot="icon" name="plus"></wa-icon>Vários abertos ao mesmo tempo.</wa-accordion-item>
    <wa-accordion-item label="Segundo">Conteúdo.</wa-accordion-item>
  </wa-accordion>`),
};

export const Details: Story = {
  render: () => col(`<wa-details summary="Ver mais">Conteúdo recolhível.</wa-details>
  <wa-details summary="Aberto, filled" open appearance="filled">Já começa aberto.</wa-details>
  <wa-details summary="Ícone no início" icon-placement="start" appearance="plain">Plain.</wa-details>
  <wa-details summary="Desativado" disabled>—</wa-details>
  <div>
    <wa-details name="grupo" summary="Grupo A">Só um do grupo abre.</wa-details>
    <wa-details name="grupo" summary="Grupo B">Abrir fecha o A.</wa-details>
  </div>`),
};
