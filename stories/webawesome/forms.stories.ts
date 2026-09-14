import type { Meta, StoryObj } from "@storybook/html-vite";

const meta: Meta = { title: "WebAwesome/Forms" };
export default meta;
type Story = StoryObj;

const col = (s: string) => `<div style="display:flex;flex-direction:column;gap:1rem;max-width:28rem">${s}</div>`;

export const Input: Story = {
  render: () => col(`<wa-input label="Nome" hint="Como aparece no perfil" placeholder="Maria Silva"></wa-input>
  <wa-input type="email" label="E-mail" with-clear value="maria@exemplo.com"><wa-icon slot="start" name="envelope"></wa-icon></wa-input>
  <wa-input type="password" label="Senha" password-toggle></wa-input>
  <wa-input type="search" placeholder="Buscar" pill appearance="filled"></wa-input>
  <wa-input type="date" label="Data" size="s"></wa-input>
  <wa-input label="Somente leitura" value="fixo" readonly></wa-input>
  <wa-input label="Desativado" disabled></wa-input>`),
};

export const NumberInput: Story = {
  render: () => col(`<wa-number-input label="Quantidade" value="2" min="0" max="10"></wa-number-input>
  <wa-number-input label="Preço" step="0.01" value="9.90" without-steppers><span slot="start">R$</span></wa-number-input>
  <wa-number-input label="Filled pill" appearance="filled" pill size="l" value="5"></wa-number-input>`),
};

export const Textarea: Story = {
  render: () => col(`<wa-textarea label="Comentário" hint="Máx. 200 caracteres" placeholder="Escreva…" maxlength="200" with-count></wa-textarea>
  <wa-textarea label="Auto-resize" resize="auto" rows="2" appearance="filled"></wa-textarea>
  <wa-textarea label="Desativado" disabled value="não editável"></wa-textarea>`),
};

export const Select: Story = {
  render: () => col(`<wa-select label="Cidade" placeholder="Escolha" with-clear>
    <wa-option value="sp">São Paulo</wa-option><wa-option value="rj">Rio de Janeiro</wa-option><wa-option value="bh" disabled>Belo Horizonte</wa-option>
  </wa-select>
  <wa-select label="Múltiplo" multiple max-options-visible="2" value="a b">
    <wa-option value="a">Apartamento</wa-option><wa-option value="b">Casa</wa-option><wa-option value="c">Terreno</wa-option>
  </wa-select>
  <wa-select label="Com ícone" appearance="filled" pill size="s" value="h">
    <wa-icon slot="start" name="house"></wa-icon>
    <wa-option value="h"><wa-icon slot="start" name="house"></wa-icon>Casa</wa-option><wa-option value="b">Prédio</wa-option>
  </wa-select>`),
};

export const Checkbox: Story = {
  render: () => col(`<wa-checkbox>Aceito os termos</wa-checkbox>
  <wa-checkbox checked>Marcado</wa-checkbox>
  <wa-checkbox indeterminate>Indeterminado</wa-checkbox>
  <wa-checkbox disabled>Desativado</wa-checkbox>
  <wa-checkbox hint="Enviamos uma vez por semana">Newsletter</wa-checkbox>
  <wa-checkbox-group label="Interesses" hint="Escolha um ou mais" orientation="horizontal">
    <wa-checkbox name="i" value="compra">Compra</wa-checkbox><wa-checkbox name="i" value="aluguel">Aluguel</wa-checkbox>
  </wa-checkbox-group>`),
};

export const Radio: Story = {
  render: () => col(`<wa-radio-group label="Plano" name="plano" value="pro" hint="Pode mudar depois">
    <wa-radio value="free">Grátis</wa-radio><wa-radio value="pro">Pro</wa-radio><wa-radio value="ent" disabled>Empresa</wa-radio>
  </wa-radio-group>
  <wa-radio-group label="Botões" name="tam" value="m" orientation="horizontal">
    <wa-radio appearance="button" value="s">P</wa-radio><wa-radio appearance="button" value="m">M</wa-radio><wa-radio appearance="button" value="l">G</wa-radio>
  </wa-radio-group>`),
};

export const Switch: Story = {
  render: () => col(`<wa-switch>Notificações</wa-switch>
  <wa-switch checked>Ligado</wa-switch>
  <wa-switch disabled>Desativado</wa-switch>
  <wa-switch size="l" hint="Aplica na hora">Modo escuro</wa-switch>`),
};

export const Slider: Story = {
  render: () => col(`<wa-slider label="Volume" value="40" with-tooltip></wa-slider>
  <wa-slider label="Faixa de preço" range min="0" max="1000" min-value="200" max-value="700" step="50" with-markers with-tooltip></wa-slider>
  <wa-slider label="Desativado" value="60" disabled></wa-slider>`),
};

export const Rating: Story = {
  render: () => col(`<wa-rating label="Avaliação" value="3"></wa-rating>
  <wa-rating label="Meia estrela" precision="0.5" value="2.5" size="l"></wa-rating>
  <wa-rating label="Somente leitura" value="4" readonly></wa-rating>
  <wa-rating label="Dez" max="10" value="7" disabled></wa-rating>`),
};

export const ColorPicker: Story = {
  render: () => col(`<wa-color-picker label="Cor" with-label value="#4a90e2"></wa-color-picker>
  <wa-color-picker label="Com opacidade" with-label opacity format="rgb" value="rgba(220,50,50,.6)"></wa-color-picker>
  <wa-color-picker label="Amostras" with-label swatches="#d0021b; #f5a623; #7ed321; #4a90e2; #9013fe" without-format-toggle></wa-color-picker>`),
};

export const OtpInput: Story = {
  render: () => col(`<wa-otp-input label="Código SMS" length="6" hint="Enviado para seu celular"></wa-otp-input>
  <wa-otp-input label="Alfanumérico mascarado" type="alphanumeric" length="4" case="upper" mask></wa-otp-input>
  <wa-otp-input label="Formatado" length="6" format="###-###" appearance="filled"></wa-otp-input>`),
};

export const TimeInput: Story = {
  render: () => col(`<wa-time-input label="Horário" value="09:30" with-clear with-now></wa-time-input>
  <wa-time-input label="Comercial" min="08:00" max="18:00" step="900" appearance="filled" pill></wa-time-input>`),
};

export const KnownDate: Story = {
  render: () => col(`<wa-known-date label="Data de nascimento" hint="dd/mm/aaaa" locale="pt-BR"></wa-known-date>
  <wa-known-date label="Com valor" value="1990-05-17" locale="pt-BR" pill></wa-known-date>`),
};
