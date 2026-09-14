# UI libraries without React — for SSR HTML strings + HTMX 2 + Tailwind v4

Surveyed 2026-09-14. Versions, licenses and last-publish dates come from
`npm view <pkg> version license time.modified`; stars and last push from
`gh api repos/<repo>`. Component counts and Pro splits come from the official
docs pages (URLs below). Cells marked *(inf)* are inferred from the delivery
model and known architecture, not measured in this repo.

## The answer

Nothing strictly dominates DaisyUI for our stack: it is pure CSS, so HTMX swaps
cannot break it, and it was published 3 days ago. What DaisyUI lacks is
*behaviour* — combobox, date picker, data table, toast queue, anchored
popovers. The best fit is **combine**: keep DaisyUI for styling, add
**Web Awesome free** web components for the interactive widgets (they
self-upgrade when HTMX inserts them, no re-init), and cover date picker /
combobox either with Web Awesome Pro or native `<input type=date>` +
`<datalist>`. If we ever want the shadcn look instead, **Basecoat** is the
replacement candidate.

## Comparison

| Lib | Latest (npm) | Published | License / pricing | Components (free) | Delivery | TW v4 | Theming vars (oklch map?) | HTMX survival | Repo activity |
|---|---|---|---|---|---|---|---|---|---|
| **DaisyUI** (baseline) | 5.7.37 | 2026-09-11 | MIT, free | ~65 | CSS classes (TW plugin), zero JS | native | `--color-*` in oklch already | perfect (CSS only) | 42.4k★, push 2026-09-12 |
| **Web Awesome** | @awesome.me/webawesome 3.12.0 | 2026-08-21 | MIT core; **Pro** paid (Kickstarter origin) | ~50 free; 15 Pro-only: Combobox, Date Input, Date Picker, File Input, 10 charts, Video | Lit web components (`<wa-*>`) + optional native-styles CSS | independent of TW; coexists | `--wa-color-*` tokens, full CSS var theming — mappable | excellent: custom elements upgrade on insert, no init call *(inf; standard CE behaviour)*; form controls are form-associated | 1.3k★, push 2026-09-14 |
| **Basecoat UI** | basecoat-css 1.0.2 | 2026-07-06 | MIT, free | 47 (+chart via external lib) | CSS classes on TW + small vanilla JS | built for TW v4 *(inf: shadcn v4 tokens)* | shadcn vars (`--primary`, oklch) — trivial map | auto-init on DOM insert; `basecoat.initAll({force:true})` for htmx history restore (documented) | 4.3k★, push 2026-07-21 |
| **Preline** | preline 5.0.0 | 2026-08-21 | MIT **+ Preline Fair Use License** (restrictions on redistribution/templates) | ~60 base + plugins (datepicker, datatable, combobox, select) | TW utility markup + vanilla JS plugins | yes (variants file) | TW theme vars | must call `HSStaticMethods.autoInit()` after swap *(docs name non-auto entry)* | 6.4k★, push 2026-08-31 |
| **Flowbite** | flowbite 4.0.2 | 2026-05-13 | MIT; Pro 450+ sections paid | 56+ incl. datepicker, datatables (free) | TW utility markup + vanilla JS | v4 supported | v4 design tokens, 5 themes | `initFlowbite()` after each swap; data-attr init is global, re-init can double-bind *(inf)* | 9.3k★, push 2026-06-27; npm quiet since May |
| **Franken UI** | franken-ui 2.1.2 | 2026-01-18 | MIT, free | ~45 *(docs 403 to fetch; count inf)* | TW classes + UIkit JS / custom elements | 2.x targets v4 | shadcn-style vars | UIkit observes DOM *(inf)* | 2.6k★, push 2026-06-14; no npm release in 8 months |
| **Material Web** | @material/web 2.5.0 | 2026-09-12 | Apache-2.0 | ~25; no data table, no date picker | Lit web components | independent | `--md-sys-color-*` | good (CE) | **README: maintenance mode pending new maintainers** — disqualified |
| **Spectrum WC** | @spectrum-web-components/bundle 1.12.2 | 2026-09-03 | Apache-2.0 | ~70 | Lit web components | independent | Spectrum tokens, Adobe look hard to escape | good (CE) | 1.5k★, active; heavy, Adobe-branded |
| **Ionic core** | @ionic/core 9.0.3 | 2026-09-14 | MIT | ~90 | Stencil web components | independent | `--ion-*` vars | good (CE), but mobile-app idiom, router/overlay assumptions | 52.7k★, very active; wrong idiom for desktop web apps |
| **Oat** (newcomer) | @knadh/oat 0.8.0 | 2026-09-08 | MIT, free | ~25 | classless semantic CSS + tiny WCs (tabs, dropdown, toast) | none (not TW) | CSS vars | good | 5.5k★, push 2026-09-13; pre-1.0, fewer components |
| Tailwind Plus Elements | @tailwindplus/elements 1.0.22 | 2026-04-13 | commercial license | headless WCs (dialog, menu, select, autocomplete, tabs) | web components, unstyled | native | yours | good (CE) | paid, requires Tailwind Plus |
| FlyonUI | flyonui 2.4.1 | 2025-09-26 | MIT | DaisyUI-like + Preline JS | classes + JS | yes | yes | needs re-init | no release in a year |
| Shoelace | @shoelace-style/shoelace 2.20.1 | 2025-03-11 | MIT | — | superseded by Web Awesome | — | — | — | frozen; do not adopt |

## Widgets without React, per candidate

| Widget | DaisyUI | Web Awesome free | Basecoat | Preline / Flowbite |
|---|---|---|---|---|
| Dialog | native `<dialog>` + `modal` class | `<wa-dialog>` | native `<dialog>` | JS plugin |
| Dropdown | `<details>` / popover API | `<wa-dropdown>` | JS | JS plugin |
| Combobox | none | **Pro** (`<wa-select>` free, not searchable) | combobox (JS) | Preline advanced select / Flowbite none *(inf)* |
| Date picker | none (native input) | **Pro** | none — native | both have plugin (free) |
| Tabs | radio-input CSS | `<wa-tab-group>` | JS | JS plugin |
| Toast | layout only, no queue | none as queue; `<wa-callout>` + small script *(inf)* | toast (JS) | JS |
| Data table | table styles only | none free (Pro charts, no grid) | table styles | Preline datatable (needs jQuery+DataTables) / Flowbite simple-datatables |

## Notes that decide

- **HTMX + web components is the cleanest pairing.** A custom element upgrades
  itself whenever it enters the DOM, so `hx-swap` needs no `htmx:afterSwap`
  hook. Class+JS libs (Preline, Flowbite) need a re-init call after every swap
  and can double-bind listeners — that is the main reason they rank lower.
- **SSR safety:** web components render light-DOM slot content on the server
  and upgrade on the client; expect a brief unstyled flash unless
  `:not(:defined)` is hidden. Declarative shadow DOM is not emitted by Web
  Awesome's SSR-less HTML strings *(inf)*.
- **Weight:** DaisyUI tree-shakes via Tailwind to only used classes; Web Awesome
  can be loaded per component (autoloader or cherry-pick), Lit ~6 KB gz shared;
  Oat is ~10 KB total; Spectrum and Ionic are the heaviest.
- **oklch tokens:** every candidate themes through CSS variables, so our oklch
  tokens map by aliasing (e.g. `--wa-color-brand-fill-loud: var(--color-primary)`).
- **Disqualified:** Material Web (maintenance mode), Shoelace (superseded),
  FlyonUI (stale), Ionic (mobile idiom), Tailwind Plus Elements (paid).

## Unverified

Nothing here was installed or rendered in `dev/acp-test`. The HTMX re-init
behaviour of Franken UI, Flowbite's double-binding risk, and the exact free
component counts of DaisyUI/Web Awesome/Franken are from docs or inference,
not a swap test. The proof step would be one page swapping each widget via
`hx-get` with Web Awesome loaded.

## URLs

- https://daisyui.com/components/
- https://webawesome.com/docs/components (free vs Pro list)
- https://basecoatui.com/installation/ (initAll / htmx note)
- https://preline.co/docs/ · https://preline.co/docs/license.html
- https://flowbite.com/docs/getting-started/introduction/
- https://franken-ui.dev
- https://github.com/material-components/material-web (maintenance notice)
- https://opensource.adobe.com/spectrum-web-components/
- https://ionicframework.com/docs/components
- https://oat.ink/ · https://github.com/knadh/oat
- https://tailwindcss.com/plus/ui-blocks/documentation/elements
