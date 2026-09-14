import type { Meta, StoryObj } from "@storybook/html-vite";

const meta: Meta = { title: "WebAwesome/Display" };
export default meta;
type Story = StoryObj;

const row = (s: string) => `<div style="display:flex;flex-wrap:wrap;gap:1rem;align-items:center">${s}</div>`;
const col = (s: string) => `<div style="display:flex;flex-direction:column;gap:1rem">${s}</div>`;
const IMG = "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600";

export const Icon: Story = {
  render: () => col(`${row(["house", "user", "gear", "heart", "star", "bell", "magnifying-glass"].map((n) => `<wa-icon name="${n}" style="font-size:1.5rem"></wa-icon>`).join(""))}
  ${row(`<wa-icon name="heart" variant="regular" style="font-size:1.5rem"></wa-icon>
  <wa-icon family="brands" name="github" style="font-size:1.5rem"></wa-icon>
  <wa-icon family="brands" name="whatsapp" style="font-size:1.5rem;color:#25d366"></wa-icon>
  <wa-icon name="arrow-right" rotate="90"></wa-icon><wa-icon name="arrow-right" flip="x"></wa-icon>
  <wa-icon name="spinner" animation="spin"></wa-icon><wa-icon name="heart" animation="beat"></wa-icon>
  <wa-icon name="house" label="Início" auto-width></wa-icon>`)}`),
};

export const Avatar: Story = {
  render: () => row(`<wa-avatar label="Usuário"></wa-avatar>
  <wa-avatar initials="MS" label="Maria Silva"></wa-avatar>
  <wa-avatar image="https://i.pravatar.cc/120?img=5" label="Foto"></wa-avatar>
  <wa-avatar shape="square" initials="VC" label="Quadrado"></wa-avatar>
  <wa-avatar shape="rounded" image="https://i.pravatar.cc/120?img=8" loading="lazy" label="Arredondado"></wa-avatar>
  <wa-avatar label="Ícone"><wa-icon slot="icon" name="building"></wa-icon></wa-avatar>`),
};

export const Card: Story = {
  render: () => row(`<wa-card with-header with-footer style="max-width:18rem">
    <div slot="header">Apartamento</div>
    Três quartos, 90 m², perto do metrô.
    <div slot="footer" style="display:flex;justify-content:space-between;align-items:center"><strong>R$ 650 mil</strong><wa-button variant="brand" size="s">Ver</wa-button></div>
  </wa-card>
  <wa-card with-media style="max-width:18rem">
    <img slot="media" src="${IMG}" alt="Sala">
    <strong>Com mídia</strong><br>Imagem no topo do card.
  </wa-card>
  <wa-card appearance="filled" style="max-width:14rem">Filled, sem header.</wa-card>
  <wa-card appearance="accent" style="max-width:14rem">Accent.</wa-card>
  <wa-card orientation="horizontal" with-media appearance="outlined" style="max-width:26rem">
    <img slot="media" src="${IMG}" alt="Sala" style="width:8rem">Horizontal.
  </wa-card>`),
};

export const Divider: Story = {
  render: () => col(`<p>Acima</p><wa-divider></wa-divider><p>Abaixo</p>
  <wa-divider style="--color:var(--wa-color-brand-fill-loud);--width:3px;--spacing:.5rem"></wa-divider>
  <div style="display:flex;align-items:center;height:2rem">Um<wa-divider orientation="vertical"></wa-divider>Dois<wa-divider orientation="vertical"></wa-divider>Três</div>`),
};

export const Tag: Story = {
  render: () => col(`${row(["brand", "neutral", "success", "warning", "danger"].map((v) => `<wa-tag variant="${v}">${v}</wa-tag>`).join(""))}
  ${row(["accent", "filled", "outlined", "filled-outlined"].map((a) => `<wa-tag appearance="${a}">${a}</wa-tag>`).join(""))}
  ${row(`<wa-tag size="s">Pequena</wa-tag><wa-tag size="l">Grande</wa-tag><wa-tag pill>Pill</wa-tag><wa-tag with-remove variant="brand">Removível</wa-tag>`)}`),
};

export const Carousel: Story = {
  render: () => `<wa-carousel navigation pagination loop mouse-dragging style="max-width:40rem;--aspect-ratio:16/9">
  ${[1, 2, 3, 4].map((i) => `<wa-carousel-item><img alt="Foto ${i}" src="https://picsum.photos/seed/wa${i}/800/450" style="width:100%;height:100%;object-fit:cover"></wa-carousel-item>`).join("")}
</wa-carousel>
<br>
<wa-carousel pagination slides-per-page="3" slides-per-move="1" autoplay autoplay-interval="2500" loop style="max-width:40rem;--aspect-ratio:3/1">
  ${[1, 2, 3, 4, 5, 6].map((i) => `<wa-carousel-item style="background:var(--wa-color-brand-fill-quiet);display:grid;place-items:center">Slide ${i}</wa-carousel-item>`).join("")}
</wa-carousel>`,
};

export const Comparison: Story = {
  render: () => `<wa-comparison position="40" style="max-width:36rem">
  <img slot="before" alt="Antes" src="https://picsum.photos/seed/before/800/450?grayscale">
  <img slot="after" alt="Depois" src="https://picsum.photos/seed/before/800/450">
</wa-comparison>`,
};

export const AnimatedImage: Story = {
  render: () => row(`<wa-animated-image src="https://shoelace.style/assets/images/walk.gif" alt="Animação" style="width:16rem"></wa-animated-image>
  <wa-animated-image play src="https://shoelace.style/assets/images/walk.gif" alt="Tocando" style="width:16rem"></wa-animated-image>`),
};

export const QrCode: Story = {
  render: () => row(`<wa-qr-code value="https://webawesome.com" label="Site"></wa-qr-code>
  <wa-qr-code value="https://viacorretor.com.br" size="160" fill="#1d4ed8" background="#eef2ff" radius="0.5" error-correction="H"></wa-qr-code>`),
};

export const Markdown: Story = {
  render: () => `<wa-markdown>
<script type="text/markdown">
# Título
Texto com **negrito**, _itálico_ e \`código\`.

- item um
- item dois

| Coluna | Valor |
| --- | --- |
| A | 1 |
</script>
</wa-markdown>`,
};

export const Scroller: Story = {
  render: () => col(`<wa-scroller style="max-width:30rem">
    <div style="display:flex;gap:1rem;width:max-content;padding:.5rem">${Array.from({ length: 12 }, (_, i) => `<wa-card style="width:8rem">Item ${i + 1}</wa-card>`).join("")}</div>
  </wa-scroller>
  <wa-scroller orientation="vertical" without-scrollbar style="height:8rem;max-width:20rem">
    ${Array.from({ length: 12 }, (_, i) => `<p>Linha ${i + 1}</p>`).join("")}
  </wa-scroller>`),
};

export const SplitPanel: Story = {
  render: () => col(`<wa-split-panel position="30" style="height:12rem;border:1px solid var(--wa-color-surface-border)">
    <div slot="start" style="padding:1rem">Início</div><div slot="end" style="padding:1rem">Fim</div>
  </wa-split-panel>
  <wa-split-panel orientation="vertical" snap="25% 50% 75%" style="height:14rem;border:1px solid var(--wa-color-surface-border)">
    <div slot="start" style="padding:1rem">Topo (snap 25/50/75%)</div><div slot="end" style="padding:1rem">Base</div>
  </wa-split-panel>
  <wa-split-panel position-in-pixels="150" primary="start" disabled style="height:6rem;border:1px solid var(--wa-color-surface-border)">
    <div slot="start" style="padding:1rem">Fixo 150px</div><div slot="end" style="padding:1rem">Desativado</div>
  </wa-split-panel>`),
};

export const ZoomableFrame: Story = {
  render: () => `<wa-zoomable-frame srcdoc="<h1 style='font-family:sans-serif'>Olá do iframe</h1><p>Use os controles de zoom.</p>" zoom="1" zoom-levels="50% 75% 100% 150%" style="width:30rem;height:16rem"></wa-zoomable-frame>`,
};
