# HeroUI v3 vs DaisyUI 5 for HTMX (server-rendered HTML, no React)

Checked on 2026-09-14 against npm and the published `@heroui/styles@3.2.5` tarball.

**Answer: partly.** HeroUI v3 ships `@heroui/styles`, which its README calls
"framework-agnostic". It gives BEM-style classes (`button button--primary`) that
work on plain HTML. What it does not give you is behaviour. Interactive state is
driven by `data-*` attributes (`data-entering`, `data-pressed`, `data-selected`...)
that React Aria sets at runtime. So static pieces work as well as DaisyUI does.
Overlays, select, tabs and tooltip need JS you write yourself. DaisyUI does many of
those with `<details>`, `<dialog>`, checkbox or radio tricks instead.

## Versions and release status (verified with `npm view`)

| Package | latest | Released | Peer deps |
|---|---|---|---|
| `@heroui/react` | 3.2.5 | 3.0.0 on 2026-03-21, 3.2.5 on 2026-09-10 | react/react-dom >=19, react-aria ^3.52, react-aria-components ^1.21, tailwindcss >=4 |
| `@heroui/styles` | 3.2.5 | same train | **only** `tailwindcss >=4.0.0` (deps: tailwind-variants, tw-animate-css) |
| `daisyui` | 5.7.37 | 5.0.0 on 2025-02-28 | none (Tailwind v4 plugin) |

v3 is stable, not beta. The `rc` and `alpha` dist-tags are leftovers.

## Install (Tailwind v4)

HeroUI uses a CSS `@import`, not `@plugin`:

```css
@import "@heroui/styles";   /* pulls in tailwindcss + tw-animate-css + theme */
```

You can also import it per component:

```css
@import "tailwindcss";
@import "@heroui/styles/components/button.css" layer(components);
@import "@heroui/styles/themes/default" layer(base);
```

A prebuilt `dist/heroui.min.css` is also in the package. DaisyUI's equivalent is
`@import "tailwindcss"; @plugin "daisyui";`.

## What works CSS-only in HeroUI

The package has 84 component CSS files. Base classes are BEM-style: `.button`,
`.button--primary|secondary|tertiary|outline|ghost|danger|danger-soft`,
`--sm|md|lg`, `--icon-only`, `--full-width`. The input has `.input`,
`.input--primary|secondary`, `--full-width`. The card has `.card`,
`.card--default|secondary|tertiary|transparent` plus `.card__header`,
`__title`, `__description`, `__content` and `__footer`.

These are usable as static markup: button, link, input, textarea, card, chip,
badge, avatar, alert, kbd, separator, skeleton, spinner, typography, label,
fieldset, empty-state, surface, table, progress-bar or meter (you set width), and
breadcrumbs. Hover and focus also react to native `:hover` and `:focus-visible`,
not only to `data-hovered`.

These need JS that sets React Aria's `data-*` attributes and handles focus, keys
and positioning: modal, alert-dialog, drawer, popover, tooltip, dropdown/menu,
select, combo-box, autocomplete, tabs, accordion/disclosure, toast, date and
color pickers, slider, number-field and input-otp. The selectors counted in
`modal.css` (20), `tabs.css` (28), `tooltip.css` (13) and `select.css` (40)
target those attributes. Checkbox, radio and switch style `data-selected`, so
check native `:checked` before relying on them. That part is inferred, not
tested.

```html
<button class="button button--primary">Save</button>

<input class="input input--full-width" type="email" placeholder="you@example.com" />

<div class="card card--default">
  <div class="card__header">
    <h3 class="card__title">Title</h3>
    <p class="card__description">Description</p>
  </div>
  <div class="card__content">Body</div>
  <div class="card__footer"><button class="button button--sm">OK</button></div>
</div>
```

## Comparison

| | HeroUI v3 (`@heroui/styles`) | DaisyUI 5 |
|---|---|---|
| Framework dependency | CSS package has none. The official docs and components are React (+ React Native). Behaviour lives in React Aria | None. It is built for class-on-HTML |
| Tailwind v4 | Required (`@import "@heroui/styles"`) | Required (`@plugin "daisyui"`) |
| Component count | "75+ web components", 84 CSS files | ~65 components (58 used in this repo's Storybook) |
| Theming via CSS vars | Yes: oklch tokens (`--accent`, `--accent-soft`...), `.dark` or `[data-theme="dark"]` | Yes: `--color-*` tokens, `data-theme`, many built-in themes |
| Interactive without JS | Basically none. Overlays, tabs and select depend on `data-*` set by JS | modal (`<dialog>`), dropdown (`<details>`/popover), collapse, tabs (radio), drawer (checkbox), swap |
| Docs for no-React use | Package README only. heroui.com documents React | First-class, the whole docs site |

## Sources

- https://www.npmjs.com/package/@heroui/styles (README inside the tarball: "framework-agnostic", BEM classes)
- https://www.npmjs.com/package/@heroui/react
- https://github.com/heroui-inc/heroui/tree/main/packages/styles
- https://heroui.com/llms.txt ("React and React Native components")
- https://heroui.com/en/docs/react/releases/v3-0-0
- https://heroui.com/en/docs/react/releases/v3-2-5
- https://heroui.com/en/docs/react/getting-started/theming
- https://daisyui.com/docs/install/ · https://daisyui.com/components/

## Unverified

Nothing was rendered in a browser. The claims come from reading the CSS source.
The DaisyUI component count is approximate. Nobody tested whether checkbox and
switch respond to native `:checked`.
