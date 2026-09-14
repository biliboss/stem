import type { Meta, StoryObj } from "@storybook/html-vite";

const meta: Meta = { title: "WebAwesome/Feedback" };
export default meta;
type Story = StoryObj;

const col = (s: string) => `<div style="display:flex;flex-direction:column;gap:1rem;max-width:32rem">${s}</div>`;
const row = (s: string) => `<div style="display:flex;flex-wrap:wrap;gap:1rem;align-items:center">${s}</div>`;

export const Callout: Story = {
  render: () => col(`<wa-callout variant="brand"><wa-icon slot="icon" name="circle-info"></wa-icon>Informação útil.</wa-callout>
  <wa-callout variant="success"><wa-icon slot="icon" name="circle-check"></wa-icon>Salvo com sucesso.</wa-callout>
  <wa-callout variant="warning" appearance="outlined"><wa-icon slot="icon" name="triangle-exclamation"></wa-icon>Atenção ao prazo.</wa-callout>
  <wa-callout variant="danger" appearance="filled-outlined" size="s"><wa-icon slot="icon" name="circle-xmark"></wa-icon>Algo deu errado.</wa-callout>
  <wa-callout variant="neutral" appearance="plain">Nota simples.</wa-callout>`),
};

export const Badge: Story = {
  render: () => col(`${row(["brand", "neutral", "success", "warning", "danger"].map((v) => `<wa-badge variant="${v}">${v}</wa-badge>`).join(""))}
  ${row(["accent", "filled", "outlined", "filled-outlined"].map((a) => `<wa-badge appearance="${a}">${a}</wa-badge>`).join(""))}
  ${row(`<wa-badge pill>12</wa-badge><wa-badge variant="danger" attention="pulse" pill>Novo</wa-badge><wa-badge variant="warning" attention="bounce">!</wa-badge>
  <wa-button>Mensagens <wa-badge slot="end" pill>3</wa-badge></wa-button>`)}`),
};

export const ProgressBar: Story = {
  render: () => col(`<wa-progress-bar value="40" label="Envio"></wa-progress-bar>
  <wa-progress-bar value="75" label="Com texto">75%</wa-progress-bar>
  <wa-progress-bar indeterminate label="Carregando"></wa-progress-bar>`),
};

export const ProgressRing: Story = {
  render: () => row(`<wa-progress-ring value="25" label="Progresso"></wa-progress-ring>
  <wa-progress-ring value="68" label="Com texto">68%</wa-progress-ring>
  <wa-progress-ring value="90" style="--size:4rem;--track-width:6px;--indicator-color:var(--wa-color-success-fill-loud)"></wa-progress-ring>`),
};

export const Spinner: Story = {
  render: () => row(`<wa-spinner></wa-spinner><wa-spinner style="font-size:2rem"></wa-spinner>
  <wa-spinner style="font-size:3rem;--track-width:6px;--indicator-color:var(--wa-color-danger-fill-loud)"></wa-spinner>`),
};

export const Skeleton: Story = {
  render: () => col(`${["pulse", "sheen", "none"].map((e) => `<div style="display:flex;gap:1rem;align-items:center">
    <wa-skeleton effect="${e}" style="width:3rem;height:3rem;--border-radius:50%"></wa-skeleton>
    <div style="flex:1;display:flex;flex-direction:column;gap:.5rem"><wa-skeleton effect="${e}"></wa-skeleton><wa-skeleton effect="${e}" style="width:60%"></wa-skeleton></div>
  </div>`).join("")}`),
};
