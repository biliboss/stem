import type { Meta, StoryObj } from "@storybook/html-vite";

const meta: Meta = { title: "DaisyUI/Data input" };
export default meta;
type Story = StoryObj;

const COLORS = ["neutral", "primary", "secondary", "accent", "info", "success", "warning", "error"];
const SIZES = ["xs", "sm", "md", "lg", "xl"];

export const Calendar: Story = {
  // `cally` styles the Cally web component; it only renders days when the
  // `cally` script is loaded (https://unpkg.com/cally) — not bundled here.
  render: () => `<div class="flex flex-col gap-2">
  <p class="text-sm opacity-60">Requer o web component Cally carregado (class <code>cally</code>).</p>
  <calendar-date class="cally bg-base-100 border border-base-300 shadow-lg rounded-box">
    <svg aria-label="Anterior" class="fill-current size-4" slot="previous" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M15.75 19.5 8.25 12l7.5-7.5"></path></svg>
    <svg aria-label="Próximo" class="fill-current size-4" slot="next" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="m8.25 4.5 7.5 7.5-7.5 7.5"></path></svg>
    <calendar-month></calendar-month>
  </calendar-date>
  <input type="date" class="input w-48" />
</div>`,
};

export const Checkbox: Story = {
  render: () => `<div class="flex flex-col gap-3">
  <div class="flex flex-wrap gap-2">
    <input type="checkbox" checked class="checkbox" />
    ${COLORS.map((c) => `<input type="checkbox" checked class="checkbox checkbox-${c}" />`).join("")}
  </div>
  <div class="flex flex-wrap items-center gap-2">
    ${SIZES.map((s) => `<input type="checkbox" checked class="checkbox checkbox-${s}" />`).join("")}
    <input type="checkbox" class="checkbox" disabled />
  </div>
  <label class="label"><input type="checkbox" checked class="checkbox" /> Lembrar de mim</label>
</div>`,
};

export const Fieldset: Story = {
  render: () => `<div class="flex flex-wrap gap-4 items-start">
  <fieldset class="fieldset">
    <legend class="fieldset-legend">Qual seu nome?</legend>
    <input type="text" class="input" placeholder="Digite aqui" />
    <p class="label">Opcional</p>
  </fieldset>
  <fieldset class="fieldset bg-base-200 border-base-300 rounded-box w-xs border p-4">
    <legend class="fieldset-legend">Login</legend>
    <label class="label">E-mail</label>
    <input type="email" class="input" placeholder="E-mail" />
    <label class="label">Senha</label>
    <input type="password" class="input" placeholder="Senha" />
    <button class="btn btn-neutral mt-4">Entrar</button>
  </fieldset>
</div>`,
};

export const FileInput: Story = {
  render: () => `<div class="flex flex-col gap-2 max-w-xs">
  <input type="file" class="file-input" />
  <input type="file" class="file-input file-input-ghost" />
  ${COLORS.slice(1, 4).map((c) => `<input type="file" class="file-input file-input-${c}" />`).join("")}
  ${SIZES.map((s) => `<input type="file" class="file-input file-input-${s}" />`).join("")}
  <input type="file" class="file-input" disabled />
</div>`,
};

export const Filter: Story = {
  render: () => `<div class="flex flex-col gap-4">
  <form class="filter">
    <input class="btn btn-square" type="reset" value="×" />
    <input class="btn" type="radio" name="sb-frameworks" aria-label="Svelte" />
    <input class="btn" type="radio" name="sb-frameworks" aria-label="Vue" />
    <input class="btn" type="radio" name="sb-frameworks" aria-label="React" />
  </form>
  <div class="filter">
    <input class="btn filter-reset" type="radio" name="sb-metaframeworks" aria-label="All" />
    <input class="btn" type="radio" name="sb-metaframeworks" aria-label="Sveltekit" />
    <input class="btn" type="radio" name="sb-metaframeworks" aria-label="Nuxt" />
  </div>
</div>`,
};

export const Label: Story = {
  render: () => `<div class="flex flex-col gap-3 max-w-sm">
  <label class="input"><span class="label">https://</span><input type="text" placeholder="url" /></label>
  <label class="input"><input type="text" placeholder="domínio" /><span class="label">.com.br</span></label>
  <label class="select"><span class="label">Tipo</span><select><option>Casa</option><option>Apartamento</option></select></label>
  <label class="floating-label"><span>E-mail</span><input type="text" placeholder="mail@site.com" class="input input-md" /></label>
</div>`,
};

export const Radio: Story = {
  render: () => `<div class="flex flex-col gap-3">
  <div class="flex flex-wrap gap-2">
    <input type="radio" name="sb-radio-c" class="radio" checked />
    ${COLORS.map((c) => `<input type="radio" name="sb-radio-c" class="radio radio-${c}" />`).join("")}
  </div>
  <div class="flex flex-wrap items-center gap-2">
    ${SIZES.map((s) => `<input type="radio" name="sb-radio-s" class="radio radio-${s}" checked />`).join("")}
    <input type="radio" class="radio" disabled />
  </div>
</div>`,
};

export const Range: Story = {
  render: () => `<div class="flex flex-col gap-2 w-64">
  <input type="range" min="0" max="100" value="40" class="range" />
  ${COLORS.map((c, i) => `<input type="range" min="0" max="100" value="${20 + i * 10}" class="range range-${c}" />`).join("")}
  ${SIZES.map((s) => `<input type="range" min="0" max="100" value="50" class="range range-${s}" />`).join("")}
  <div class="w-full">
    <input type="range" min="0" max="100" value="25" class="range" step="25" />
    <div class="flex justify-between px-2.5 mt-2 text-xs"><span>|</span><span>|</span><span>|</span><span>|</span><span>|</span></div>
  </div>
</div>`,
};

export const Rating: Story = {
  render: () => `<div class="flex flex-col gap-3">
  <div class="rating">
    <input type="radio" name="sb-rating-1" class="mask mask-star" aria-label="1" />
    <input type="radio" name="sb-rating-1" class="mask mask-star" aria-label="2" checked />
    <input type="radio" name="sb-rating-1" class="mask mask-star" aria-label="3" />
    <input type="radio" name="sb-rating-1" class="mask mask-star" aria-label="4" />
    <input type="radio" name="sb-rating-1" class="mask mask-star" aria-label="5" />
  </div>
  <div class="rating rating-lg gap-1">
    <input type="radio" name="sb-rating-2" class="mask mask-heart bg-red-400" aria-label="1" />
    <input type="radio" name="sb-rating-2" class="mask mask-heart bg-orange-400" aria-label="2" checked />
    <input type="radio" name="sb-rating-2" class="mask mask-heart bg-yellow-400" aria-label="3" />
  </div>
  <div class="rating rating-sm">
    <input type="radio" name="sb-rating-3" class="rating-hidden" aria-label="limpar" />
    <input type="radio" name="sb-rating-3" class="mask mask-star-2 bg-orange-400" aria-label="1" />
    <input type="radio" name="sb-rating-3" class="mask mask-star-2 bg-orange-400" aria-label="2" checked />
  </div>
  <div class="rating rating-lg rating-half">
    <input type="radio" name="sb-rating-4" class="rating-hidden" aria-label="limpar" />
    <input type="radio" name="sb-rating-4" class="mask mask-star-2 mask-half-1 bg-green-500" aria-label="0.5" />
    <input type="radio" name="sb-rating-4" class="mask mask-star-2 mask-half-2 bg-green-500" aria-label="1" />
    <input type="radio" name="sb-rating-4" class="mask mask-star-2 mask-half-1 bg-green-500" aria-label="1.5" checked />
    <input type="radio" name="sb-rating-4" class="mask mask-star-2 mask-half-2 bg-green-500" aria-label="2" />
  </div>
</div>`,
};

export const Select: Story = {
  render: () => `<div class="flex flex-col gap-2 max-w-xs">
  <select class="select"><option disabled selected>Escolha</option><option>Casa</option><option>Apê</option></select>
  <select class="select select-ghost"><option>Ghost</option></select>
  ${COLORS.map((c) => `<select class="select select-${c}"><option>${c}</option></select>`).join("")}
  ${SIZES.map((s) => `<select class="select select-${s}"><option>${s}</option></select>`).join("")}
  <select class="select" disabled><option>Desabilitado</option></select>
</div>`,
};

export const InputField: Story = {
  render: () => `<div class="flex flex-col gap-2 max-w-xs">
  <input type="text" placeholder="Padrão" class="input" />
  <input type="text" placeholder="Ghost" class="input input-ghost" />
  ${COLORS.map((c) => `<input type="text" placeholder="${c}" class="input input-${c}" />`).join("")}
  ${SIZES.map((s) => `<input type="text" placeholder="${s}" class="input input-${s}" />`).join("")}
  <label class="input"><span>🔍</span><input type="search" placeholder="Buscar" /><kbd class="kbd kbd-sm">⌘K</kbd></label>
  <input type="text" placeholder="Desabilitado" class="input" disabled />
</div>`,
};

export const Textarea: Story = {
  render: () => `<div class="flex flex-col gap-2 max-w-xs">
  <textarea class="textarea" placeholder="Bio"></textarea>
  <textarea class="textarea textarea-ghost" placeholder="Ghost"></textarea>
  ${COLORS.slice(1, 4).map((c) => `<textarea class="textarea textarea-${c}" placeholder="${c}"></textarea>`).join("")}
  ${SIZES.map((s) => `<textarea class="textarea textarea-${s}" placeholder="${s}"></textarea>`).join("")}
  <textarea class="textarea" placeholder="Desabilitado" disabled></textarea>
</div>`,
};

export const Toggle: Story = {
  render: () => `<div class="flex flex-col gap-3">
  <div class="flex flex-wrap gap-2">
    <input type="checkbox" checked class="toggle" />
    ${COLORS.map((c) => `<input type="checkbox" checked class="toggle toggle-${c}" />`).join("")}
  </div>
  <div class="flex flex-wrap items-center gap-2">
    ${SIZES.map((s) => `<input type="checkbox" checked class="toggle toggle-${s}" />`).join("")}
    <input type="checkbox" class="toggle" disabled />
  </div>
  <label class="label"><input type="checkbox" class="toggle" checked /> Notificações</label>
</div>`,
};

export const Validator: Story = {
  render: () => `<form class="flex flex-col gap-3 max-w-xs">
  <input class="input validator" type="email" required placeholder="mail@site.com" />
  <div class="validator-hint">Digite um e-mail válido</div>
  <input type="password" class="input validator" required placeholder="Senha" minlength="8" />
  <p class="validator-hint hidden">Mínimo de 8 caracteres</p>
  <input type="checkbox" class="checkbox validator" required title="Obrigatório" />
  <select class="select validator" required><option disabled selected value="">Escolha</option><option>Um</option></select>
  <button class="btn btn-neutral" type="submit">Enviar</button>
</form>`,
};

export const Otp: Story = {
  render: () => `<div class="flex flex-col gap-4">
  <label class="otp">
    <span></span><span></span><span></span><span></span>
    <input type="text" autocomplete="one-time-code" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" required />
  </label>
  <label class="otp otp-joined otp-primary">
    <span></span><span></span><span></span><span></span><span></span><span></span>
    <input type="text" autocomplete="one-time-code" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" required />
  </label>
  <div class="flex flex-wrap items-center gap-4">
    ${SIZES.map((s) => `<label class="otp otp-${s}"><span></span><span></span><span></span><input type="text" inputmode="numeric" maxlength="3" /></label>`).join("")}
  </div>
  <div class="flex flex-wrap gap-4">
    ${COLORS.map((c) => `<label class="otp otp-sm otp-${c}"><span></span><span></span><input type="text" inputmode="numeric" maxlength="2" /></label>`).join("")}
  </div>
</div>`,
};
