import type { Meta, StoryObj } from "@storybook/html-vite";

const meta: Meta = { title: "WebAwesome/Utilities" };
export default meta;
type Story = StoryObj;

const col = (s: string) => `<div style="display:flex;flex-direction:column;gap:.75rem">${s}</div>`;

export const FormatNumber: Story = {
  render: () => col(`<span><wa-format-number value="1234567.891" lang="pt-BR"></wa-format-number></span>
  <span><wa-format-number type="currency" currency="BRL" value="650000" lang="pt-BR"></wa-format-number></span>
  <span><wa-format-number type="percent" value="0.275" maximum-fraction-digits="1" lang="pt-BR"></wa-format-number></span>
  <span><wa-format-number value="1234567" without-grouping></wa-format-number></span>
  <span><wa-format-number type="currency" currency="USD" currency-display="name" value="10"></wa-format-number></span>`),
};

export const FormatBytes: Story = {
  render: () => col(`<span><wa-format-bytes value="1024"></wa-format-bytes></span>
  <span><wa-format-bytes value="1500000" display="long" lang="pt-BR"></wa-format-bytes></span>
  <span><wa-format-bytes value="8000" unit="bit" display="narrow"></wa-format-bytes></span>`),
};

export const FormatDate: Story = {
  render: () => col(`<span><wa-format-date date="2026-09-14T09:30:00" lang="pt-BR"></wa-format-date></span>
  <span><wa-format-date date="2026-09-14T09:30:00" weekday="long" day="numeric" month="long" year="numeric" lang="pt-BR"></wa-format-date></span>
  <span><wa-format-date date="2026-09-14T09:30:00" hour="numeric" minute="numeric" hour-format="24" time-zone="America/Sao_Paulo" time-zone-name="short" lang="pt-BR"></wa-format-date></span>`),
};

export const RelativeTime: Story = {
  render: () => {
    const ago = new Date(Date.now() - 3 * 3600_000).toISOString();
    const soon = new Date(Date.now() + 2 * 86400_000).toISOString();
    return col(`<span><wa-relative-time date="${ago}" lang="pt-BR"></wa-relative-time></span>
    <span><wa-relative-time date="${soon}" format="short" numeric="always" lang="pt-BR"></wa-relative-time></span>
    <span><wa-relative-time date="${new Date().toISOString()}" sync lang="pt-BR"></wa-relative-time> (sync)</span>`);
  },
};

export const Animation: Story = {
  render: () => `<div style="display:flex;gap:2rem">
  <wa-animation name="bounce" duration="2000" iterations="Infinity" play><div style="width:4rem;height:4rem;background:var(--wa-color-brand-fill-loud);border-radius:.5rem"></div></wa-animation>
  <wa-animation name="pulse" duration="1200" easing="ease-in-out" iterations="Infinity" play><wa-icon name="heart" style="font-size:3rem;color:crimson"></wa-icon></wa-animation>
  <wa-animation name="rubberBand" duration="1000" delay="500" direction="alternate" iterations="Infinity" play><wa-button>Rubber band</wa-button></wa-animation>
</div>`,
};

export const RandomContent: Story = {
  render: () => col(`<wa-random-content>
    <wa-callout variant="brand">Dica 1: favorite imóveis.</wa-callout>
    <wa-callout variant="success">Dica 2: ative alertas.</wa-callout>
    <wa-callout variant="warning">Dica 3: agende visitas.</wa-callout>
  </wa-random-content>
  <wa-random-content mode="sequence" autoplay autoplay-interval="2000" animation="fade-up">
    <p>Primeiro</p><p>Segundo</p><p>Terceiro</p>
  </wa-random-content>`),
};

/** wa-popup: the low-level positioning primitive behind tooltip/popover/dropdown. */
export const Popup: Story = {
  render: () => `<div style="padding:5rem">
  <wa-popup placement="right" active arrow distance="8" flip shift>
    <span slot="anchor" style="display:inline-block;width:6rem;height:3rem;border:2px dashed var(--wa-color-neutral-border-loud)"></span>
    <div style="background:var(--wa-color-brand-fill-loud);color:white;padding:.5rem 1rem;border-radius:.25rem">Popup</div>
  </wa-popup>
</div>`,
};

/** Observers render nothing; the story logs their events next to the observed element. */
export const Observers: Story = {
  render: () => `<div id="wa-obs" style="display:flex;flex-direction:column;gap:1rem;max-width:30rem">
  <wa-resize-observer><div style="resize:horizontal;overflow:auto;border:1px solid var(--wa-color-surface-border);padding:1rem;width:12rem">Redimensione-me</div></wa-resize-observer>
  <wa-mutation-observer attr="*" child-list><wa-button>Clique para mudar</wa-button></wa-mutation-observer>
  <wa-scroller orientation="vertical" style="height:8rem" id="wa-io-root">
    <div style="height:14rem;padding-top:10rem"><wa-intersection-observer threshold="0.5" intersect-class="is-visible"><div>Role até aqui</div></wa-intersection-observer></div>
  </wa-scroller>
  <pre id="wa-obs-log" style="font-size:.75rem;max-height:8rem;overflow:auto"></pre>
</div>
<script type="module">
  const root = document.getElementById("wa-obs");
  const log = (m) => { const el = root.querySelector("#wa-obs-log"); el.textContent = m + "\\n" + el.textContent; };
  root.querySelector("wa-resize-observer").addEventListener("wa-resize", () => log("wa-resize"));
  root.querySelector("wa-mutation-observer").addEventListener("wa-mutation", () => log("wa-mutation"));
  root.querySelector("wa-mutation-observer wa-button").addEventListener("click", (e) => e.currentTarget.setAttribute("variant", e.currentTarget.getAttribute("variant") === "brand" ? "neutral" : "brand"));
  root.querySelector("wa-intersection-observer").addEventListener("wa-intersect", (e) => log("wa-intersect " + e.detail.entry.isIntersecting));
</script>`,
};

/** wa-include fetches HTML over the network (needs CORS on the source). */
export const Include: Story = {
  render: () => `<wa-include src="https://shoelace.style/assets/examples/include.html"></wa-include>`,
};
