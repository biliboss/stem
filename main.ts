#!/usr/bin/env bun
/// <reference types="bun" />
// stem — a system that starts blank. One process, one embedded database and one ACP agent: every request becomes
// an operation, a known capability answers it without a model, anything else goes to the agent, and what repeats
// crystallizes into something that runs without one. The screen, the backend and the design are born from use.
//   bun main.ts serve [<app>.ts] [--new] [--no-open] [--slug <name>] [--port <n>] [--db <url>] [--agent <cmd>] [--tools json|mcp]
//   bun main.ts acp caps | list [--cwd <dir>|--all] | daemon [--cwd <dir>] [--session <id>] [--allow]
//   GET /_system · POST /_teach · /_events · POST /_gate · /_draft · /_ds · /_design · /_mcp
//   POST /_intent · /_feedback · /_accept · /_judge · GET text/html → a view · anything else → an operation
//
// This file is also a library: an <app>.ts imports it, and Storybook imports View and Kernel in a browser. So nothing
// at module level touches Node or Bun — builtins are reached at call time through process.getBuiltinModule, the native
// SurrealDB engine through import(), and the CLI runs only under import.meta.main.
import { Hono } from "hono";
import { RecordId, Surreal } from "surrealdb";
import * as acp from "@agentclientprotocol/sdk";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";

/** What JSX compiled to, without JSX: h() builds an HTML string, and escape() is the one guard on text. */
export namespace Html {
  type Child = string | number | boolean | null | undefined | Child[];
  const VOID = new Set(["input", "meta", "br", "img", "link", "hr"]);

  export function h(tag: string | ((p: any) => string), props: Record<string, unknown> | null, ...children: Child[]): string {
    if (typeof tag === "function") return tag({ ...props, children });
    const attrs = Object.entries(props ?? {})
      .filter(([, v]) => v !== false && v != null)
      .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${escape(String(v))}"`))
      .join("");
    return VOID.has(tag) ? `<${tag}${attrs}>` : `<${tag}${attrs}>${flat(children)}</${tag}>`;
  }

  export function escape(s: string) { return s.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`); }

  function flat(c: Child): string { return Array.isArray(c) ? c.map(flat).join("") : c == null || c === false ? "" : String(c); }
}

/**
 * The design system every system is born with. css: tokens, Mona Sans, states (hover 8% · pressed 16% · disabled
 * at 40%), the wireframe, the fold and media. js: Mermaid and image zoom, Markdown, copy, dragging the fold, the
 * outline toggle. Strings, because the Shell inlines them and Storybook injects them; a change shows on reload
 * under `bun --hot`, without restarting a design in progress.
 */
export namespace Kernel {
  export const css = `/* kernel.css — the default world every system is born with. Shell inlines it; Storybook imports it. */
#working { position: fixed; inset: 0; z-index: 50; display: grid; place-items: center; pointer-events: none;
  background: oklch(0% 0 0 / 0); backdrop-filter: blur(0); opacity: 0; transition: all .35s ease; }
body.working #working { background: oklch(21% .012 257 / .22); backdrop-filter: blur(3px); opacity: 1; pointer-events: auto; }
/* A client's operation is not the owner's gesture: the page stays readable, and a corner says what is being done. */
body.working.operating #working { background: none; backdrop-filter: none; pointer-events: none; place-items: end start; padding: 1.5rem; }
body.working.operating #working > span { max-width: 36rem; font-size: .875rem; }
#working span { animation: breathe 1.6s ease-in-out infinite; }
@keyframes breathe { 50% { opacity: .45; } }
form.htmx-request button[type=submit] { pointer-events: none; opacity: .6; }
form.htmx-request button[type=submit]::after { content: " · pensando…"; }
/* The kernel's default world: a neutral ground, ink and one blue, one sans (Mona Sans). Low chrome — sections are separated by
   space and a hairline, never by filled boxes. Every system starts here; tokens override it. */
[data-theme=kernel] { color-scheme: light;
  --color-base-100: oklch(98.6% .002 247); --color-base-200: oklch(96.3% .003 247); --color-base-300: oklch(91.2% .005 247);
  --color-base-content: oklch(21% .012 257);
  --color-primary: oklch(35% .075 258); --color-primary-content: oklch(98.6% .002 247);
  --color-secondary: oklch(45% .02 257); --color-secondary-content: oklch(98.6% .002 247);
  --color-accent: oklch(55% .09 195); --color-accent-content: oklch(98.6% .002 247);
  --color-neutral: oklch(26% .012 257); --color-neutral-content: oklch(96.3% .003 247);
  --color-info: oklch(52% .08 240); --color-info-content: oklch(98.6% .002 247);
  --color-success: oklch(50% .08 155); --color-success-content: oklch(98.6% .002 247);
  --color-warning: oklch(70% .12 75); --color-warning-content: oklch(21% .012 257);
  --color-error: oklch(52% .15 28); --color-error-content: oklch(98.6% .002 247);
  --radius-selector: .25rem; --radius-field: .375rem; --radius-box: .5rem;
  --size-selector: .25rem; --size-field: .25rem; --border: 1px; --depth: 0; --noise: 0; }
body { font-family: "Mona Sans Variable", ui-sans-serif, system-ui, sans-serif; font-size: 1rem; line-height: 1.55;
  -webkit-font-smoothing: antialiased; font-feature-settings: "tnum" 0; }
.kernel-display { font-size: 2.5rem; font-weight: 640; line-height: 1.1; letter-spacing: -0.025em; text-wrap: balance; }
.kernel-heading { font-size: 1.125rem; line-height: 1.3; font-weight: 620; letter-spacing: -0.005em; text-wrap: balance; }
.kernel-figure { font-size: 2rem; line-height: 1; font-weight: 600; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.kernel-section + .kernel-section { margin-top: .5rem; }
.kernel-blank { min-height: 100svh; display: grid; place-content: center; gap: 1.25rem; padding: 2rem; text-align: left; }
.kernel-hint { display: flex; align-items: center; gap: .375rem; color: color-mix(in oklch, var(--color-base-content) 60%, transparent); }
.kernel-hint span { margin-left: .375rem; }
.kernel-blank .kernel-hint + .kernel-hint { margin-top: -.5rem; font-size: .875rem; }
.kbd { font-family: inherit; min-height: 1.75rem; min-width: 1.75rem; background: var(--color-base-100); }
#palette { padding: 0; border: 0; background: transparent; width: min(40rem, calc(100vw - 2rem)); margin: 14vh auto auto; }
#palette::backdrop { background: oklch(21% .012 257 / .22); backdrop-filter: blur(3px); }
#palette .sheet { background: var(--color-base-100); border-radius: var(--radius-box);
  box-shadow: 0 24px 60px -20px oklch(21% .012 257 / .45), 0 0 0 1px var(--color-base-300); overflow: hidden; }
#palette input { width: 100%; border: 0; outline: 0; background: transparent; padding: 1.125rem 1.25rem; font-size: 1.125rem; }
#palette ul { border-top: 1px solid var(--color-base-300); max-height: 50vh; overflow: auto; padding: .375rem; }
#palette li { display: flex; align-items: baseline; gap: .75rem; padding: .625rem .875rem; border-radius: var(--radius-field); cursor: pointer; }
#palette li[aria-selected=true] { background: var(--color-base-200); }
#palette li b { font-weight: 600; white-space: nowrap; }
#palette li span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  color: color-mix(in oklch, var(--color-base-content) 60%, transparent); }
#palette li small { margin-left: auto; color: color-mix(in oklch, var(--color-base-content) 55%, transparent); white-space: nowrap; }
#palette footer { display: flex; gap: 1rem; padding: .5rem 1.25rem; font-size: .8125rem; border-top: 1px solid var(--color-base-300);
  color: color-mix(in oklch, var(--color-base-content) 55%, transparent); }
/* Thread: a conversation in a messaging app's own dark world, scoped here so no other screen inherits it. The wallpaper
   is authored for this kernel — a house, a key and a signed page, the things a broker's chat is about — never a copied asset. */
body:has(.kernel-thread) { background: #161717; color-scheme: dark; }
body:has(.kernel-thread) .kernel-page { padding: 0; }
.kernel-thread { --wa-bg: #161717; --wa-head: #1f2121; --wa-in: #242626; --wa-out: #144d37; --wa-text: #e9edef; --wa-muted: #8696a0;
  --wa-accent: #21c063; position: fixed; inset: 0; display: grid; grid-template-rows: auto 1fr; background: var(--wa-bg); color: var(--wa-text);
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Helvetica, Arial, sans-serif; font-feature-settings: "tnum" 1; }
.kernel-thread ::selection { background: color-mix(in srgb, var(--wa-accent) 38%, transparent); color: #fff; }
.kernel-thread-head { display: flex; align-items: center; gap: .75rem; height: 3.75rem; padding: 0 1rem; background: var(--wa-head);
  border-bottom: 1px solid rgb(255 255 255 / .06); }
.kernel-thread-avatar { display: grid; place-items: center; width: 2.5rem; height: 2.5rem; flex: none; border-radius: 999px; background: #3a4a44;
  color: #d7f5e4; font-size: .875rem; font-weight: 600; letter-spacing: .02em; }
.kernel-thread-title { margin: 0; font-size: 1rem; font-weight: 500; line-height: 1.25; }
.kernel-thread-subtitle { margin: 0; font-size: .8125rem; color: var(--wa-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.kernel-thread-body { overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: #3b3d3d transparent;
  background-color: var(--wa-bg); background-size: 11rem 11rem;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='176' height='176' fill='none' stroke='%23ffffff' stroke-opacity='.045' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 52 40 34l20 18v22H20z'/%3E%3Cpath d='M34 74V60h12v14'/%3E%3Ccircle cx='128' cy='40' r='9'/%3E%3Cpath d='M137 40h26M155 40v8M163 40v6'/%3E%3Cpath d='M104 104h36a4 4 0 0 1 4 4v44h-40a4 4 0 0 1-4-4v-40a4 4 0 0 1 4-4z'/%3E%3Cpath d='M110 118h24M110 128h24M110 138c6-6 10 4 16-2'/%3E%3Ccircle cx='40' cy='128' r='2'/%3E%3Ccircle cx='76' cy='150' r='2'/%3E%3Ccircle cx='84' cy='18' r='2'/%3E%3C/svg%3E"); }
.kernel-thread-list { list-style: none; margin: 0 auto; padding: 1.25rem clamp(1rem, 5vw, 4rem) 2rem; display: flex; flex-direction: column; max-width: 64rem; }
.kernel-bubble { position: relative; max-width: min(36rem, 72%); margin-top: .75rem; padding: .375rem .5rem .4375rem .5625rem; border-radius: .5rem;
  background: var(--wa-in); box-shadow: 0 1px .5px rgb(11 20 26 / .13); font-size: .9063rem; line-height: 1.32; align-self: flex-start; }
.kernel-bubble.is-mine { align-self: flex-end; background: var(--wa-out); }
.kernel-bubble.is-theirs:not(.is-theirs + .is-theirs) { border-top-left-radius: 0; }
.kernel-bubble.is-mine:not(.is-mine + .is-mine) { border-top-right-radius: 0; }
.kernel-bubble.is-theirs:not(.is-theirs + .is-theirs)::before, .kernel-bubble.is-mine:not(.is-mine + .is-mine)::before { content: ""; position: absolute;
  top: 0; width: .5rem; height: .8125rem; background: inherit; }
.kernel-bubble.is-theirs:not(.is-theirs + .is-theirs)::before { left: -.5rem; clip-path: polygon(0 0, 100% 0, 100% 100%); }
.kernel-bubble.is-mine:not(.is-mine + .is-mine)::before { right: -.5rem; clip-path: polygon(0 0, 100% 0, 0 100%); }
.is-theirs + .is-theirs, .is-mine + .is-mine { margin-top: .125rem; }
.is-theirs + .is-theirs .kernel-bubble-author { display: none; }
.kernel-bubble-author { margin: 0 0 .125rem; font-size: .8125rem; font-weight: 500; color: #06cf9c; }
.kernel-bubble-kind { display: flex; align-items: center; gap: .3125rem; margin: 0 0 .1875rem; font-size: .75rem; color: var(--wa-muted); }
.is-mine .kernel-bubble-kind { color: rgb(233 237 239 / .62); }
.kernel-bubble-cost { margin-left: auto; padding-left: .75rem; color: var(--wa-accent); font-variant-numeric: tabular-nums; }
.kernel-bubble-audio { display: block; width: min(18rem, 60vw); height: 2.25rem; margin: .125rem 0 .375rem; color-scheme: dark; }
.kernel-bubble-text { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
.kernel-bubble-text:empty { display: none; }
.kernel-bubble-time { float: right; position: relative; top: .3125rem; margin-left: .75rem; font-size: .6875rem; line-height: 1; color: var(--wa-muted); }
.is-mine .kernel-bubble-time { color: rgb(233 237 239 / .6); }
@media (max-width: 40rem) { .kernel-bubble { max-width: 86%; } }
.kernel-muted { color: color-mix(in oklch, var(--color-base-content) 62%, transparent); }
.kernel-meta { margin-left: auto; padding-left: 1rem; white-space: nowrap; font-size: .875rem;
  color: color-mix(in oklch, var(--color-base-content) 55%, transparent); font-variant-numeric: tabular-nums; }
.btn { font-weight: 600; box-shadow: none; }
.input, .textarea { background: var(--color-base-100); }
.checkbox { --size: 1.25rem; }
::selection { background: oklch(35% .075 258 / .18); }
:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
a { text-underline-offset: .2em; }
body.editing [data-system-id] { outline: 1px dashed oklch(70% .15 250 / .5); outline-offset: 2px; cursor: crosshair; }
body.editing [data-system-id].target { outline: 2px solid oklch(70% .2 250); }

/* Interaction states, one rule for every tone: hover darkens 8%, pressed 16% and sinks 1px, disabled
   keeps the color at 40% and refuses the pointer. .is-hover / .is-active force a state for the catalog. */
.btn { transition: background-color .12s ease, border-color .12s ease, transform .06s ease; }
.btn:not(.btn-ghost):not(.btn-link):hover, .btn.is-hover:not(.btn-ghost) {
  background-color: color-mix(in oklch, var(--btn-bg, var(--btn-color, var(--color-base-200))) 92%, black);
  border-color: color-mix(in oklch, var(--btn-bg, var(--btn-color, var(--color-base-200))) 92%, black); }
.btn:not(.btn-ghost):not(.btn-link):active, .btn.is-active:not(.btn-ghost) {
  background-color: color-mix(in oklch, var(--btn-bg, var(--btn-color, var(--color-base-200))) 84%, black);
  border-color: color-mix(in oklch, var(--btn-bg, var(--btn-color, var(--color-base-200))) 84%, black); transform: translateY(1px); }
.btn-ghost:hover, .btn-ghost.is-hover { background-color: var(--color-base-200); }
.btn-ghost:active, .btn-ghost.is-active { background-color: var(--color-base-300); transform: translateY(1px); }
.btn:disabled, .btn[disabled], .btn-disabled { opacity: .4; cursor: not-allowed; pointer-events: none; transform: none; }
/* DaisyUI paints disabled buttons gray; the kernel keeps the tone, so "disabled primary" still reads as primary. */
.btn:not(.btn-ghost):not(.btn-link):is(:disabled, [disabled], .btn-disabled) {
  background-color: var(--btn-color, var(--color-base-200)); border-color: var(--btn-color, var(--color-base-200));
  color: var(--btn-fg, var(--color-base-content)); }
.input:hover, .textarea:hover, .input.is-hover { border-color: color-mix(in oklch, var(--color-base-content) 30%, transparent); }
.input:focus, .textarea:focus, .input.is-active { border-color: var(--color-primary); outline: 2px solid color-mix(in oklch, var(--color-primary) 22%, transparent); outline-offset: 0; }
.input:disabled, .textarea:disabled { opacity: .5; cursor: not-allowed; }

/* Media: figures sit on the page without a box; the zoom surface is the only framed thing. */
.kernel-figure-block { display: flex; flex-direction: column; gap: .5rem; position: relative; }
.kernel-zoom { position: relative; overflow: hidden; border: 1px solid var(--color-base-300); border-radius: var(--radius-box);
  background: var(--color-base-100); cursor: grab; touch-action: none; }
.kernel-zoom.is-dragging { cursor: grabbing; }
.kernel-zoom > div, .kernel-zoom > img { will-change: transform; }
.kernel-zoom svg { max-width: none; height: auto; }
.kernel-zoombar { position: absolute; top: .5rem; right: .5rem; display: flex; gap: .125rem; padding: .125rem;
  background: var(--color-base-100); border: 1px solid var(--color-base-300); border-radius: var(--radius-field); }
.kernel-image { width: 100%; max-height: min(28rem, 60vh); object-fit: cover; border-radius: var(--radius-box); cursor: zoom-in; }
.kernel-lightbox { width: 100vw; height: 100vh; max-width: none; max-height: none; margin: 0; padding: 0; border: 0;
  background: color-mix(in oklch, var(--color-base-content) 88%, transparent); }
.kernel-lightbox::backdrop { background: transparent; }
.kernel-lightbox .kernel-zoom { border: 0; border-radius: 0; background: transparent; display: grid; place-items: center; }
.kernel-lightbox img { max-width: 92vw; max-height: 92vh; }
.kernel-lightbox-close { position: fixed; top: 1rem; right: 1rem; color: var(--color-base-100); }
.kernel-code { border: 1px solid var(--color-base-300); border-radius: var(--radius-box); gap: 0; background: var(--color-base-200); }
.kernel-code code { font-family: ui-monospace, "SF Mono", Menlo, monospace; }
.kernel-prose { max-width: 65ch; }
.kernel-prose > * + * { margin-top: .75rem; }
.kernel-prose ul { list-style: disc; padding-left: 1.25rem; }
.kernel-prose a { color: var(--color-primary); text-decoration: underline; }

/* App shell: sidebar and content. The sidebar is a quiet column, not a filled panel. */
.kernel-split { display: grid; gap: 2.5rem; align-items: start; }
@media (min-width: 64rem) { .kernel-split { grid-template-columns: 15rem minmax(0, 1fr); gap: 3.5rem; } }
.kernel-sidebar { display: flex; flex-direction: column; gap: 1rem; position: sticky; top: 1.5rem; }
.kernel-sidebar-title { font-size: .8125rem; font-weight: 600; color: color-mix(in oklch, var(--color-base-content) 55%, transparent); }
.kernel-sidebar .kernel-heading { font-size: .8125rem; margin-top: 1rem; color: color-mix(in oklch, var(--color-base-content) 55%, transparent); }
.kernel-link { display: flex; align-items: center; gap: .625rem; padding: .4375rem .625rem; border-radius: var(--radius-field);
  color: var(--color-base-content); text-decoration: none; transition: background-color .12s ease; }
.kernel-link:hover { background: var(--color-base-200); }
.kernel-link.is-active { background: var(--color-base-200); font-weight: 600; }
.kernel-link .kernel-meta { padding-left: .5rem; }
.kernel-dot { width: .5rem; height: .5rem; border-radius: 999px; flex: none; }
.kernel-tag { --tag: var(--color-base-content); display: inline-flex; align-items: center; height: 1.375rem; padding: 0 .5rem;
  border-radius: 999px; font-size: .75rem; font-weight: 600; white-space: nowrap;
  color: color-mix(in oklch, var(--tag) 85%, black); background: color-mix(in oklch, var(--tag) 14%, transparent); }

/* The studio — what the owner sees while an agent designs. Mode: Experience. One authored moment: the
   thought appears, the wireframe is drawn, and the finished screen develops out of it.

   rail        five phases across the top; the current one fills, the done ones stay solid
   narration   the agent's current thought, large and centered, over a page that steps back
   drafted     once a skeleton exists, the thought moves to the lower left and the blueprint takes the stage */
body.studio #working { opacity: 0 !important; pointer-events: none !important; }
.kernel-studio { position: fixed; inset: 0; pointer-events: none; z-index: 55; }
.kernel-rail { position: absolute; top: 0; left: 0; right: 0; display: grid; grid-template-columns: repeat(5, 1fr); gap: .375rem;
  padding: 1rem 1.5rem 0; opacity: 0; transform: translateY(-.5rem); transition: opacity .4s ease, transform .5s cubic-bezier(.16, 1, .3, 1); }
body.studio .kernel-rail { opacity: 1; transform: none; }
.kernel-rail li { display: flex; flex-direction: column; gap: .5rem; }
.kernel-rail-bar { position: relative; height: 3px; border-radius: 999px; overflow: hidden; background: color-mix(in oklch, var(--color-base-content) 10%, transparent); }
.kernel-rail-bar::after { content: ""; position: absolute; inset: 0; transform-origin: left; transform: scaleX(0); background: var(--color-base-content);
  transition: transform .6s cubic-bezier(.16, 1, .3, 1); }
.kernel-rail li.is-current .kernel-rail-bar::after { transform: scaleX(.42); background: var(--color-primary); animation: kernel-rail-think 2.4s ease-in-out infinite; }
.kernel-rail li.is-done .kernel-rail-bar::after { transform: scaleX(1); }
@keyframes kernel-rail-think { 0%, 100% { transform: scaleX(.18); } 50% { transform: scaleX(.72); } }
.kernel-rail-label { font-size: .75rem; letter-spacing: .01em; color: color-mix(in oklch, var(--color-base-content) 40%, transparent); transition: color .3s ease; }
.kernel-rail li.is-current .kernel-rail-label { color: var(--color-base-content); font-weight: 600; }
.kernel-rail li.is-done .kernel-rail-label { color: color-mix(in oklch, var(--color-base-content) 70%, transparent); }

/* The page steps back while the agent only thinks; it comes forward again as soon as there is a sketch. */
#kernel-body { transition: opacity .6s ease, filter .6s ease; }
body.studio:not(.drafted) #kernel-body { opacity: 0; filter: blur(6px); }

.kernel-narration { position: absolute; left: 50%; top: 46%; width: min(40rem, calc(100vw - 3rem)); margin: 0; display: flex; flex-direction: column; gap: 1rem;
  transform: translate(-50%, -50%); opacity: 0; transition: top .7s cubic-bezier(.16, 1, .3, 1), left .7s cubic-bezier(.16, 1, .3, 1),
  width .7s cubic-bezier(.16, 1, .3, 1), transform .7s cubic-bezier(.16, 1, .3, 1), opacity .4s ease; }
body.studio .kernel-narration { opacity: 1; }
#kernel-narration-phase { display: flex; align-items: center; gap: .625rem; font-size: .875rem; font-weight: 600; color: var(--color-primary); }
#kernel-narration-phase::before { content: ""; width: .5rem; height: .5rem; border-radius: 999px; background: currentColor; animation: breathe 1.4s ease-in-out infinite; }
#kernel-narration-text { margin: 0; font-size: 1.5rem; line-height: 1.35; font-weight: 520; letter-spacing: -0.012em; text-wrap: pretty; color: var(--color-base-content); }
#kernel-narration-text:empty { display: none; }
#kernel-narration-text[data-from]::before { content: attr(data-from); display: block; margin-bottom: .5rem; font-size: .75rem; font-weight: 500;
  letter-spacing: .01em; color: color-mix(in oklch, var(--color-base-content) 45%, transparent); }
.kernel-narration.is-in #kernel-narration-text { animation: kernel-thought .9s cubic-bezier(.16, 1, .3, 1) both; }
@keyframes kernel-thought { from { opacity: 0; filter: blur(6px); transform: translateY(.5rem); } to { opacity: 1; filter: none; transform: none; } }

body.studio.drafted .kernel-narration { left: 1.5rem; top: auto; bottom: 1.5rem; width: min(24rem, calc(100vw - 3rem)); transform: none; gap: .375rem;
  padding: .875rem 1rem; border-radius: var(--radius-box); background: var(--color-base-100);
  box-shadow: 0 18px 44px -20px oklch(21% .012 257 / .4), 0 0 0 1px var(--color-base-300); }
body.studio.drafted #kernel-narration-text { font-size: .875rem; line-height: 1.45; font-weight: 450; color: color-mix(in oklch, var(--color-base-content) 72%, transparent); }

/* Blueprint: the wireframe is drawn on a faint dot grid; structure is text, dashed outlines and dark blocks.
   It is an outline, not a loading state: nothing in it moves. */
body.studio.drafted { background-image: radial-gradient(color-mix(in oklch, var(--color-base-content) 12%, transparent) 1px, transparent 1px);
  background-size: 1.25rem 1.25rem; }
.kernel-wireframe [data-system-id] { outline: 1px dashed color-mix(in oklch, var(--color-base-content) 24%, transparent); outline-offset: 0; }
/* The outline shows where each element's box really ends; \`o\` hides it (kernel.js). */
body.no-outline .kernel-wireframe [data-system-id] { outline: none; }
.kernel-wireframe [data-fresh] { outline-color: var(--color-primary); outline-style: solid; }
.kernel-wireframe :is(.btn, .input, .select, .textarea, .checkbox, .toggle, .badge, .kernel-tag, img, .kernel-zoom, .kernel-code) {
  box-shadow: none !important; border-radius: .25rem !important; }
/* The mockup is written in text: titles, labels and example rows read at their real size, in graphite. */
.kernel-wireframe { color: color-mix(in oklch, var(--color-base-content) 78%, transparent); }
.kernel-wireframe .btn { color: var(--color-base-content) !important; }
.kernel-wireframe .kernel-page { background: transparent; }
.kernel-wire-lines { display: flex; flex-direction: column; gap: .75rem; padding: .5rem 0; width: 100%; }
.kernel-wire-lines i { display: block; height: .625rem; border-radius: 999px; background: color-mix(in oklch, var(--color-base-content) 13%, transparent); }
.kernel-wire-lines i:nth-child(1) { width: 92%; } .kernel-wire-lines i:nth-child(2) { width: 74%; } .kernel-wire-lines i:nth-child(3) { width: 56%; }
.kernel-wireframe .kernel-draft-slot { background: color-mix(in oklch, var(--color-base-content) 9%, transparent); }

/* The finished screen develops out of the wireframe. */
::view-transition-old(root) { animation: kernel-develop-out .45s ease both; }
::view-transition-new(root) { animation: kernel-develop-in .7s cubic-bezier(.16, 1, .3, 1) both; }
@keyframes kernel-develop-out { to { opacity: 0; filter: blur(4px); } }
@keyframes kernel-develop-in { from { opacity: 0; filter: grayscale(1) contrast(1.3); } to { opacity: 1; filter: none; } }
@media (prefers-reduced-motion: reduce) { .kernel-studio *, .kernel-wireframe * { animation: none !important; transition: none !important; }
  ::view-transition-old(root), ::view-transition-new(root) { animation: none; } }

/* Interactive: the fold. While a phase waits, the thought is read whole in a centered sheet with a quiet
   scroll, and the answer lives under it. After the sketch, the same fold sits in the corner over the blueprint. */
.kernel-gate { display: none; gap: .5rem; align-items: center; margin-top: .25rem; pointer-events: auto; }
body.awaiting .kernel-gate { display: flex; }
body.awaiting .kernel-narration { pointer-events: auto; }
.kernel-gate input { flex: 1; min-width: 0; height: 2.5rem; padding: 0 .875rem; border-radius: var(--radius-field); background: var(--color-base-100);
  border: 1px solid var(--color-base-300); font-size: .9375rem; }
.kernel-gate input:focus { outline: 2px solid color-mix(in oklch, var(--color-primary) 30%, transparent); border-color: var(--color-primary); }
.kernel-gate .btn { height: 2.5rem; gap: .5rem; }
.kernel-kbd { font: inherit; font-size: .75rem; opacity: .7; }
body.awaiting:not(.drafted) .kernel-narration { top: 50%; width: min(44rem, calc(100vw - 3rem)); }
body.awaiting #kernel-narration-text { max-height: 52vh; overflow: auto; padding-right: .5rem; font-size: 1.1875rem; line-height: 1.55; font-weight: 450;
  scrollbar-width: thin; scrollbar-color: var(--color-base-300) transparent; }
body.awaiting #kernel-narration-text.is-overflow { mask-image: linear-gradient(to bottom, black calc(100% - 1.5rem), transparent); }
#kernel-narration-text p { margin: 0; }
#kernel-narration-text ul { margin: .875rem 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: .5rem; }
#kernel-narration-text li { position: relative; padding-left: 1.25rem; }
#kernel-narration-text li::before { content: ""; position: absolute; left: .125rem; top: .72em; width: .375rem; height: .375rem; border-radius: 999px;
  background: color-mix(in oklch, var(--color-base-content) 35%, transparent); }
#kernel-narration-text p + p { margin-top: .875rem; }
#kernel-narration-text p.is-lead { font-size: .875em; font-weight: 600; color: color-mix(in oklch, var(--color-base-content) 55%, transparent); }
#kernel-narration-text p.is-lead + p { margin-top: .25rem; }
#kernel-narration-text p:first-child:not(.is-lead) { font-weight: 600; }
body.awaiting #kernel-narration-phase { color: var(--color-base-content); }
body.awaiting #kernel-narration-phase::before { background: var(--color-warning); animation: none; }
body.awaiting.drafted .kernel-narration { width: min(30rem, calc(100vw - 3rem)); }
body.awaiting.drafted #kernel-narration-text { max-height: 30vh; font-size: .9375rem; }
.kernel-rail li.is-done:has(+ li:not(.is-done)) .kernel-rail-label { color: var(--color-base-content); }

/* Wireframe, lighter: a control is read by what it says. A field is its placeholder over a rule, a button is its
   label, a tag is its word; only the checkbox stays a shape. No fills, so nothing reads as an unnamed dark block. */
.kernel-wireframe :is(.btn, .input, .select, .textarea, .badge, .kernel-tag, img, .kernel-zoom, .kernel-code) {
  background: transparent !important; border: 1px solid color-mix(in oklch, var(--color-base-content) 22%, transparent) !important; opacity: 1; }
.kernel-wireframe :is(.input, .select, .textarea) { border-width: 0 0 1px !important; border-radius: 0 !important; padding-left: 0; }
.kernel-wireframe :is(.input, .textarea)::placeholder { color: color-mix(in oklch, var(--color-base-content) 50%, transparent); }
.kernel-wireframe .btn-ghost { border-color: transparent !important; text-decoration: underline; text-underline-offset: .2em; }
.kernel-wireframe .btn-primary { border-color: var(--color-base-content) !important; }
.kernel-wireframe :is(.badge, .kernel-tag) { font-size: .75rem; color: color-mix(in oklch, var(--color-base-content) 70%, transparent) !important; }
.kernel-wireframe .checkbox { background: transparent !important; border: 1px solid color-mix(in oklch, var(--color-base-content) 40%, transparent) !important; }
.kernel-wireframe .checkbox { width: 1rem; height: 1rem; }
.kernel-wireframe .kernel-meta:empty::after, .kernel-wireframe p:empty::after { content: ""; display: inline-block; width: 6rem; height: .625rem; border-radius: 999px;
  background: color-mix(in oklch, var(--color-base-content) 12%, transparent); }
.kernel-wireframe [data-system-id] { outline-color: color-mix(in oklch, var(--color-base-content) 14%, transparent); }

/* The fold at a glance. A phase with sections becomes a sheet that owns the whole first fold between the rail and
   the screen's bottom edge: nothing scrolls the page. Text sections flow as newspaper columns on the left; a diagram
   owns the right column at full height and is scaled to fit it. The answer bar is pinned to the sheet's foot. */
body.studio:not(.drafted) .kernel-narration.is-wide {
  top: 3.75rem; bottom: 1.25rem; left: 50%; width: min(96rem, calc(100vw - 3rem)); transform: translateX(-50%);
  display: grid; grid-template-rows: auto minmax(0, 1fr) auto; gap: .75rem; max-height: none; overflow: hidden; }
body.studio:not(.drafted) .kernel-narration.is-wide #kernel-narration-text {
  display: grid; grid-template-rows: auto minmax(0, 1fr); gap: 1rem; min-height: 0; max-height: none; overflow: hidden;
  font-size: .9375rem; line-height: 1.5; mask-image: none; padding: 0; }
body.studio:not(.drafted) .kernel-narration.is-wide #kernel-narration-text[data-from]::before { display: none; }
.kernel-fold-intro { max-width: 70ch; }
.kernel-fold-intro:empty { display: none; }
.kernel-fold-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 2.5rem; min-height: 0; height: 100%; }
.kernel-fold-grid.has-diagram { grid-template-columns: minmax(0, 1fr) minmax(24rem, 42%); }
.kernel-fold-text { columns: 15rem; column-gap: 2.5rem; column-fill: balance; min-height: 0; overflow: auto; scrollbar-width: thin; }
.kernel-fold-text section, .kernel-fold-grid > section { display: flex; flex-direction: column; gap: .5rem; break-inside: avoid; margin-bottom: 1.5rem;
  padding-top: .625rem; border-top: 1px solid var(--color-base-300); min-width: 0; }
.kernel-fold-grid h3 { margin: 0; font-size: .6875rem; font-weight: 600; letter-spacing: .06em; text-transform: uppercase;
  color: color-mix(in oklch, var(--color-base-content) 50%, transparent); }
.kernel-fold-grid ul { margin: 0 !important; gap: .375rem !important; }
.kernel-fold-grid li { font-size: .9375rem; padding-left: 1rem !important; }
.kernel-fold-grid li::before { top: .62em !important; width: .3125rem !important; height: .3125rem !important; }
.kernel-fold-grid > section { margin-bottom: 0; height: 100%; min-height: 0; }
.kernel-fold-diagram { flex: 1; min-height: 0; height: auto; border-radius: var(--radius-box); border: 1px solid var(--color-base-300); background: var(--color-base-100); overflow: hidden; }
.kernel-fold-diagram > div { width: 100%; height: 100%; display: grid; place-items: center; padding: .75rem; box-sizing: border-box; }
.kernel-fold-diagram svg { width: 100% !important; height: 100% !important; max-width: none !important; }
#kernel-narration-text code { font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: .85em; padding: .05rem .3rem; border-radius: .25rem; background: var(--color-base-200); }
@media (max-width: 64rem) {
  .kernel-fold-grid.has-diagram { grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) minmax(16rem, 40%); }
}

/* Entity cards: a quiet table per entity, two to a row, relations under them. */
.kernel-entities-block { display: flex; flex-direction: column; gap: 1rem; min-height: 0; overflow: auto; scrollbar-width: thin; }
.kernel-entities { display: grid; grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr)); gap: .75rem; align-items: start; }
.kernel-entities table { width: 100%; border-collapse: collapse; font-size: .8125rem; border: 1px solid var(--color-base-300); border-radius: var(--radius-box);
  overflow: hidden; background: var(--color-base-100); }
.kernel-entities caption { caption-side: top; text-align: left; font-weight: 600; font-size: .875rem; padding: 0 0 .375rem .125rem; }
.kernel-entities td { padding: .3125rem .625rem; border-top: 1px solid var(--color-base-200); }
.kernel-entities td:first-child { font-weight: 500; }
.kernel-entities td:last-child { text-align: right; font-variant-numeric: tabular-nums; color: color-mix(in oklch, var(--color-base-content) 50%, transparent);
  font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: .75rem; }
.kernel-relations { margin: 0 !important; display: flex !important; flex-direction: column; gap: .25rem !important; }
.kernel-relations li { font-size: .8125rem !important; color: color-mix(in oklch, var(--color-base-content) 65%, transparent); }

/* The rail is navigation once a phase is lived: done steps are clickable, with a quiet "voltar aqui" on hover. */
body.studio .kernel-rail { pointer-events: auto; }
.kernel-rail li.is-done, .kernel-rail li.is-current { cursor: pointer; }
.kernel-rail li.is-done:hover .kernel-rail-bar::after { background: var(--color-primary); }
.kernel-rail li.is-done:hover .kernel-rail-label::after { content: " · voltar aqui"; color: var(--color-primary); font-weight: 500; }

/* The fold can be dragged aside: \`translate\` composes with every transform the fold's placements already use. */
.kernel-narration { translate: var(--fold-dx, 0) var(--fold-dy, 0); }
body.awaiting .kernel-narration { cursor: grab; }
body.awaiting .kernel-narration :is(input, button) { cursor: auto; }
.kernel-narration.is-dragging { cursor: grabbing; transition: none; user-select: none; }
`;
  export const js = `// kernel.js — the behavior the native components need in the browser. The server inlines it as a module;
// Storybook imports it. mount(root) is idempotent: it only touches elements it has not seen.
//   [data-mermaid]  source in textContent → rendered SVG inside a zoom surface
//   [data-markdown] source in textContent → HTML
//   [data-zoom]     wheel/pinch zooms around the pointer, drag pans, double click resets
//   [data-lightbox] click opens the image full screen, zoomable; esc closes
//   [data-copy]     copies the text of the nearest <code>

const MERMAID = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
const MARKED = "https://cdn.jsdelivr.net/npm/marked@15/lib/marked.esm.js";
let mermaidReady, markedReady;

function zoomable(surface) {
  if (surface.dataset.zoomReady) return;
  surface.dataset.zoomReady = "1";
  const content = surface.firstElementChild;
  if (!content) return;
  let scale = 1, x = 0, y = 0, drag;
  const apply = () => { content.style.transform = \`translate(\${x}px, \${y}px) scale(\${scale})\`; };
  content.style.transformOrigin = "0 0";
  surface.addEventListener("wheel", (e) => {
    e.preventDefault();
    const r = surface.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;
    const next = Math.min(8, Math.max(0.25, scale * Math.exp(-e.deltaY * 0.0015)));
    x = px - (px - x) * (next / scale); y = py - (py - y) * (next / scale); scale = next; apply();
  }, { passive: false });
  surface.addEventListener("pointerdown", (e) => { drag = { px: e.clientX - x, py: e.clientY - y }; surface.setPointerCapture(e.pointerId); surface.classList.add("is-dragging"); });
  surface.addEventListener("pointermove", (e) => { if (!drag) return; x = e.clientX - drag.px; y = e.clientY - drag.py; apply(); });
  surface.addEventListener("pointerup", () => { drag = undefined; surface.classList.remove("is-dragging"); });
  surface.addEventListener("dblclick", () => { scale = 1; x = 0; y = 0; apply(); });
  (surface.closest("figure") ?? surface).querySelectorAll("[data-zoom-step]").forEach((b) => b.addEventListener("click", (e) => {
    e.stopPropagation();
    const step = Number(b.dataset.zoomStep);
    if (step === 0) { scale = 1; x = 0; y = 0; } else { scale = Math.min(8, Math.max(0.25, scale * step)); }
    apply();
  }));
}

function lightbox(img) {
  if (img.dataset.lightboxReady) return;
  img.dataset.lightboxReady = "1";
  img.addEventListener("click", () => {
    const dialog = document.createElement("dialog");
    dialog.className = "kernel-lightbox";
    dialog.innerHTML = \`<div class="kernel-zoom h-full w-full" data-zoom><img src="\${img.currentSrc || img.src}" alt="\${img.alt}"></div>
      <button class="btn btn-sm btn-ghost kernel-lightbox-close" aria-label="fechar">esc</button>\`;
    document.body.append(dialog);
    dialog.querySelector("button").onclick = () => dialog.close();
    dialog.addEventListener("close", () => dialog.remove());
    dialog.showModal();
    zoomable(dialog.querySelector("[data-zoom]"));
  });
}

export async function mount(root = document) {
  // A conversation opens where it is going: the latest message.
  for (const t of root.querySelectorAll("[data-thread]")) t.scrollTop = t.scrollHeight;
  for (const el of root.querySelectorAll("[data-mermaid]:not([data-rendered])")) {
    el.dataset.rendered = "1";
    const source = el.textContent;
    mermaidReady ??= import(MERMAID).then((m) => { m.default.initialize({ startOnLoad: false, theme: "neutral", fontFamily: "Mona Sans Variable, sans-serif" }); return m.default; });
    try {
      const mermaid = await mermaidReady;
      const { svg } = await mermaid.render(\`m\${Math.random().toString(36).slice(2)}\`, source);
      el.innerHTML = \`<div>\${svg}</div>\`;
      zoomable(el);
    } catch (e) {
      el.innerHTML = \`<pre class="text-error text-sm whitespace-pre-wrap">\${String(e.message ?? e)}</pre>\`;
    }
  }
  for (const el of root.querySelectorAll("[data-markdown]:not([data-rendered])")) {
    el.dataset.rendered = "1";
    markedReady ??= import(MARKED).then((m) => m.marked);
    el.innerHTML = (await markedReady).parse(el.textContent);
  }
  root.querySelectorAll("[data-zoom]").forEach(zoomable);
  root.querySelectorAll("[data-lightbox]").forEach(lightbox);
  root.querySelectorAll("[data-copy]:not([data-copy-ready])").forEach((b) => {
    b.dataset.copyReady = "1";
    b.addEventListener("click", async () => {
      await navigator.clipboard.writeText(b.closest("figure")?.querySelector("code")?.textContent ?? "");
      const label = b.textContent; b.textContent = "copiado"; setTimeout(() => (b.textContent = label), 1200);
    });
  });
}

// The fold floats over the page, so the owner can drag it aside to see what it covers; a double click on it puts it back.
function dragFold() {
  let drag;
  const fold = (t) => t instanceof Element ? t.closest(".kernel-narration") : null;
  document.addEventListener("pointerdown", (e) => {
    const f = fold(e.target);
    if (!f || e.button !== 0 || e.target.closest("input, button, a, textarea, select")) return;
    const x = parseFloat(f.style.getPropertyValue("--fold-dx")) || 0, y = parseFloat(f.style.getPropertyValue("--fold-dy")) || 0;
    drag = { f, px: e.clientX - x, py: e.clientY - y, id: e.pointerId };
    f.setPointerCapture(e.pointerId); f.classList.add("is-dragging"); e.preventDefault();
  });
  document.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag.f.style.setProperty("--fold-dx", \`\${e.clientX - drag.px}px\`);
    drag.f.style.setProperty("--fold-dy", \`\${e.clientY - drag.py}px\`);
  });
  const end = () => { if (drag) { drag.f.classList.remove("is-dragging"); drag = undefined; } };
  document.addEventListener("pointerup", end); document.addEventListener("pointercancel", end);
  document.addEventListener("dblclick", (e) => {
    const f = fold(e.target); if (!f || e.target.closest("input, button")) return;
    f.style.removeProperty("--fold-dx"); f.style.removeProperty("--fold-dy");
  });
}

// \`o\` outside a field shows or hides the sketch's outlines; the choice survives a reload.
function outlineToggle() {
  if (localStorage.getItem("kernel-outline") === "off") document.body.classList.add("no-outline");
  document.addEventListener("keydown", (e) => {
    if (e.key !== "o" || e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.("input, textarea, select, [contenteditable]")) return;
    const off = document.body.classList.toggle("no-outline");
    localStorage.setItem("kernel-outline", off ? "off" : "on");
  });
}

if (typeof document !== "undefined") {
  dragFold();
  if (document.body) outlineToggle(); else document.addEventListener("DOMContentLoaded", outlineToggle);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => mount());
  else mount();
  document.addEventListener("htmx:afterSwap", (e) => mount(e.target));
}
`;
}

/**
 * The UI DSL. A view is a JSON spec the agent writes once: a flat map of addressable elements (json-render / A2UI
 * shape) plus the SurrealQL that feeds it. Rendering is deterministic: spec + query results → HTML → DaisyUI 5 +
 * HTMX 2. Every element carries data-system-id, so the page can be edited by pointing at it.
 */
export namespace View {
  const { h, escape } = Html;
  export type Action = { method: string; path: string; data?: Record<string, unknown>; confirm?: string };
  export type Element = {
    type: keyof typeof Catalog.components;
    props?: Record<string, unknown>;
    children?: string[];
    repeat?: { path: string; key?: string };
    action?: Action;
  };
  export type Spec = { v: 1; title?: string; root: string; data?: Record<string, string>; elements: Record<string, Element>; routes?: string[] };
  export type Data = Record<string, unknown>;

  /** Bindings: {"$item": "title"} · {"$data": "/todos/0/title"} · "{$item.id}" inside strings. */
  export namespace Binding {
    export type Scope = { data: Data; item?: Record<string, unknown>; params?: Record<string, string>; path?: string };

    export function pointer(root: unknown, path: string): unknown {
      return path.split("/").filter(Boolean).reduce<any>((o, k) => (o == null ? undefined : o[k]), root);
    }

    export function resolve(value: unknown, scope: Scope): unknown {
      if (typeof value === "string") {
        return value.replace(/\{\$(item|data|param)\.?([^}]*)\}/g, (_m, src, p) =>
          String((src === "item" ? pointer(scope.item, p.replaceAll(".", "/")) : src === "param" ? scope.params?.[p] : pointer(scope.data, p)) ?? ""));
      }
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const o = value as Record<string, unknown>;
        if (typeof o.$item === "string") return pointer(scope.item, o.$item.replaceAll(".", "/"));
        if (typeof o.$data === "string") return pointer(scope.data, o.$data);
        if (typeof o.$param === "string") return scope.params?.[o.$param];
        // {"$eq": [a, b]} — the one comparison a screen needs: is this row the one in the URL?
        if (Array.isArray(o.$eq)) { const [a, b] = o.$eq.map((v) => String(resolve(v, scope) ?? "")); return a === b; }
        if ("$not" in o) return !resolve(o.$not, scope);
        if ("$count" in o) { const v = resolve(o.$count, scope); return Array.isArray(v) ? v.length : 0; }
        return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, resolve(v, scope)]));
      }
      return value;
    }
  }

  /** The native components. Each one is a function of (resolved props, rendered children, element). */
  export namespace Catalog {
    type Render = (p: any, children: string, el: { id: string; action?: Action }) => string;

    const act = (a: Action | undefined) => a && {
      [`hx-${a.method.toLowerCase()}`]: a.path,
      "hx-vals": a.data ? JSON.stringify(a.data) : undefined,
      "hx-confirm": a.confirm,
      "hx-swap": "none",
    };

    export const components = {
      Page: ((p, c) => h("main", { class: `kernel-page mx-auto w-full ${p.wide ? "max-w-[80rem]" : "max-w-[44rem]"} px-6 pt-16 pb-24 flex flex-col gap-10` },
          p.title && h("h1", { class: "kernel-display" }, escape(p.title)),
          c)) as Render,
      /** An app shell: the first child is the sidebar, the rest is the content. Stacks under lg. */
      Split: ((_p, c) => h("div", { class: "kernel-split" }, c)) as Render,
      Sidebar: ((p, c) => h("aside", { class: "kernel-sidebar" },
          p.title && h("p", { class: "kernel-sidebar-title" }, escape(p.title)),
          h("nav", { class: "flex flex-col gap-0.5" }, c))) as Render,
      Link: ((p) => h("a", { class: `kernel-link ${p.active ? "is-active" : ""}`, href: p.href, "aria-current": p.active ? "page" : undefined },
          p.dot && h("span", { class: "kernel-dot", style: `background:${escape(String(p.dot))}` }),
          h("span", { class: "truncate" }, escape(String(p.label ?? ""))),
          p.meta != null && p.meta !== "" && h("span", { class: "kernel-meta" }, escape(String(p.meta))))) as Render,
      // color is a tone name (primary, error, success…) or any CSS color; agents reach for tone names first.
      Tag: ((p) => { const c = String(p.color ?? ""); const tone = /^(primary|secondary|accent|neutral|info|success|warning|error)$/.test(c);
        return h("span", { class: "kernel-tag", style: c ? `--tag:${tone ? `var(--color-${c})` : escape(c)}` : undefined }, escape(String(p.text ?? ""))); }) as Render,
      Select: ((p) => h("label", { class: "flex flex-col gap-1" },
          p.label && h("span", { class: "text-sm" }, escape(p.label)),
          h("select", { class: "select", name: p.name }, (Array.isArray(p.options) ? p.options : []).map((o: any) => h("option", { value: o.value, selected: String(o.value) === String(p.value ?? "") }, escape(String(o.label ?? o.value))))))) as Render,
      Stack: ((p, c) => h("div", { class: `flex ${p.direction === "row" ? "flex-row items-center" : "flex-col"} gap-${p.gap ?? 3}` }, c)) as Render,
      Card: ((p, c) => h("section", { class: "kernel-section flex flex-col gap-4 pt-6" },
          p.title && h("h2", { class: "kernel-heading" }, escape(p.title)),
          c)) as Render,
      Heading: ((p) => h("h2", { class: "kernel-heading" }, escape(String(p.text ?? "")))) as Render,
      Text: ((p) => p.meta
        ? h("span", { class: "kernel-meta" }, escape(String(p.text ?? "")))
        : h("p", { class: `max-w-[65ch] ${p.muted ? "kernel-muted" : ""}`, style: p.strike ? "text-decoration:line-through;text-decoration-thickness:1px" : undefined }, escape(String(p.text ?? "")))) as Render,
      Badge: ((p) => h("span", { class: `badge badge-${p.tone ?? "neutral"}` }, escape(String(p.text ?? "")))) as Render,
      Stat: ((p) => h("div", { class: "flex flex-col gap-1" },
          h("span", { class: "text-sm kernel-muted" }, escape(String(p.label ?? ""))),
          h("span", { class: "kernel-figure" }, escape(String(p.value ?? ""))))) as Render,
      Form: ((p, c, el) => h("form", { class: `flex ${p.inline ? "flex-col sm:flex-row sm:items-end" : "flex-col"} gap-2 [&_label]:min-w-0`, ...act(el.action), "hx-swap": "none", "hx-on--after-request": "if(event.detail.successful){this.reset()}" }, c)) as Render,
      Input: ((p) => h("label", { class: "form-control flex-1" },
          p.label && h("span", { class: "label-text text-sm" }, escape(p.label)),
          h("input", { class: "input input-bordered w-full", name: p.name, placeholder: p.placeholder, type: p.inputType ?? "text", required: p.required }))) as Render,
      Textarea: ((p) => h("label", { class: "form-control" },
          p.label && h("span", { class: "label-text text-sm" }, escape(p.label)),
          h("textarea", { class: "textarea textarea-bordered w-full", name: p.name, rows: p.rows ?? 4, placeholder: p.placeholder, required: p.required }))) as Render,
      Button: ((p, _c, el) => h("button", { class: `btn btn-${p.tone ?? "primary"} ${p.size === "sm" ? "btn-sm" : ""}`, type: p.submit ? "submit" : "button", ...(p.submit ? {} : act(el.action)) }, escape(String(p.label ?? "")))) as Render,
      Checkbox: ((p, _c, el) => h("input", { type: "checkbox", class: "checkbox", checked: Boolean(p.checked), ...act(el.action) })) as Render,
      List: ((p, c) => h("ul", { class: "flex flex-col border-t border-base-300" },
          c,
          !c && p.empty && h("li", { class: "py-4 kernel-muted" }, escape(p.empty)))) as Render,
      /** Kernel-only: the screen of a system that was never told anything. Not offered to the agent. */
      Blank: ((p) => h("main", { class: "kernel-blank" },
          h("h1", { class: "kernel-display" }, escape(String(p.title ?? ""))),
          h("p", { class: "kernel-hint" },
              h("kbd", { class: "kbd" }, "\u2318"),
              h("kbd", { class: "kbd" }, "K"),
              " ",
              h("span", null, escape(String(p.hint ?? "")))),
          h("p", { class: "kernel-hint" },
              h("kbd", { class: "kbd" }, "g"),
              h("kbd", { class: "kbd" }, "d"),
              " ",
              h("span", null, "o design system")))) as Render,
      /** Kernel-only: the tokens of the current theme, read live from the CSS variables. */
      Swatches: ((p) => h("div", { class: "grid grid-cols-2 sm:grid-cols-4 gap-4" }, (p.tokens as string[]).map((t) => h("div", { class: "flex flex-col gap-2" },
          h("span", { class: "h-14 rounded-box border border-base-300", style: `background: var(${t})` }),
          h("span", { class: "kernel-meta !ml-0 !pl-0" }, escape(t.replace("--color-", ""))))))) as Render,
      /** A diagram: the source is text the agent writes; the browser renders it and makes it zoomable. */
      Mermaid: ((p) => h("figure", { class: "kernel-figure-block" },
          h("div", { class: "kernel-zoom h-[min(28rem,60vh)]", "data-mermaid": true }, escape(String(p.code ?? ""))),
          h(ZoomBar, null),
          p.caption && h("figcaption", { class: "kernel-meta !ml-0 !pl-0" }, escape(p.caption)))) as Render,
      Image: ((p) => h("figure", { class: "kernel-figure-block" },
          h("img", { class: "kernel-image", src: p.src, alt: p.alt ?? "", loading: "lazy", "data-lightbox": true }),
          p.caption && h("figcaption", { class: "kernel-meta !ml-0 !pl-0" }, escape(p.caption)))) as Render,
      Code: ((p) => h("figure", { class: "kernel-figure-block kernel-code" },
          h("div", { class: "flex items-center justify-between px-4 py-2 border-b border-base-300" },
              h("span", { class: "kernel-meta !ml-0 !pl-0" }, escape(String(p.lang ?? "texto"))),
              h("button", { class: "btn btn-xs btn-ghost", type: "button", "data-copy": true }, "copiar")),
          h("pre", { class: "overflow-auto p-4 text-sm" },
              h("code", null, escape(String(p.code ?? "")))))) as Render,
      Markdown: ((p) => h("div", { class: "kernel-prose", "data-markdown": true }, escape(String(p.text ?? "")))) as Render,
      Row: ((_p, c) => h("li", { class: "flex flex-row items-center gap-4 py-3 border-b border-base-300" }, c)) as Render,
      /** A conversation drawn the way a messaging app draws it: who, on top, and a column of bubbles that opens at the latest. */
      Thread: ((p, c) => h("section", { class: "kernel-thread" },
          h("header", { class: "kernel-thread-head" },
              h("span", { class: "kernel-thread-avatar", "aria-hidden": "true" },
                  escape(String(p.title ?? "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase())),
              h("div", { class: "min-w-0" },
                  h("h1", { class: "kernel-thread-title" }, escape(String(p.title ?? ""))),
                  p.subtitle && h("p", { class: "kernel-thread-subtitle" }, escape(String(p.subtitle))))),
          h("div", { class: "kernel-thread-body", "data-thread": true },
              h("ol", { class: "kernel-thread-list" }, c)))) as Render,
      /** One message. mine sits on the right; a run from the same side keeps one tail and one author line. */
      Bubble: ((p) => {
        const kind = p.kind === "audio" || p.kind === "media" ? String(p.kind) : "";
        const text = String(p.text ?? "").trim();
        return h("li", { class: `kernel-bubble ${p.mine ? "is-mine" : "is-theirs"}` },
            !p.mine && p.author && h("p", { class: "kernel-bubble-author" }, escape(String(p.author))),
            kind === "audio" && p.audio && h("audio", { class: "kernel-bubble-audio", controls: true, preload: "none", src: String(p.audio) }),
            kind === "audio" && h("p", { class: "kernel-bubble-kind" }, Icon.mic, text ? "transcrição" : "áudio sem transcrição",
                p.cost != null && p.cost !== "" && h("span", { class: "kernel-bubble-cost" }, escape(String(p.cost)))),
            kind === "media" && !text && h("p", { class: "kernel-bubble-kind" }, Icon.file, escape(String(p.notice || "mídia"))),
            h("p", { class: "kernel-bubble-text" }, escape(text),
                h("span", { class: "kernel-bubble-time" }, escape(String(p.time ?? ""))))); }) as Render,
    };

    /** Drawn icons, one stroke weight, for the few places a glyph carries meaning. */
    const Icon = {
      mic: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>`,
      file: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>`,
    };

    function ZoomBar() {
      return h("div", { class: "kernel-zoombar" },
          h("button", { type: "button", class: "btn btn-xs btn-ghost", "data-zoom-step": "0.8", "aria-label": "afastar" }, "\u2212"),
          h("button", { type: "button", class: "btn btn-xs btn-ghost", "data-zoom-step": "0", "aria-label": "ajustar" }, "1:1"),
          h("button", { type: "button", class: "btn btn-xs btn-ghost", "data-zoom-step": "1.25", "aria-label": "aproximar" }, "+"));
    }

    /** What the agent reads to write a spec. Kept next to the components so they cannot drift. */
    export const TOKENS = `Design tokens are DaisyUI 5 CSS variables, e.g. {"--color-primary":"oklch(65% .2 250)",
"--color-base-100":"…","--radius-box":"0.25rem","--radius-field":"0.25rem","--size-field":"0.22rem","--border":"1px"}.
A change like "more compact" or "less rounded" is a token change, not a view change.`;

    export const DOC = `A view is JSON: {"v":1,"title":str,"root":id,"data":{name: SurrealQL},"elements":{id: element}}.
element = {"type", "props"?, "children"?: [id], "repeat"?: {"path": "/name", "key": "id"}, "action"?: {"method","path","data"?,"confirm"?}}
Element ids are semantic and stable (e.g. "pending.item.complete"); they are how the owner points at things.
"data" queries run on every render; results are bound by JSON pointer.
A view may serve a ROUTE TEMPLATE: return {"view", "path": "/notebooks/{id}"}; its queries read $id (a record id
"table:id" as a string: use type::record($id)) and bindings read {"$param":"id"} or "{$param.id}".
{"$eq":[a,b]} compares two bindings (e.g. active link: {"$eq":[{"$item":"id"},{"$param":"id"}]}). Links are plain hrefs. A "repeat" element is a template rendered once per row (put it on the Row, inside the List); inside it, $item is the row.
Every "data" query must run as written: SurrealQL ORDER BY fields must be in the SELECT list, and record ids come back as "table:id".
Bindings in props, action.path and action.data: {"$item":"title"} · {"$data":"/todos"} · {"$count":{"$data":"/todos"}} · {"$not":…} · "text {$item.id}".
Components and props:
  Page{title} Stack{direction:"row"|"col",gap} Card{title} Heading{text} Text{text,muted,strike,meta} (meta: a secondary fact of a row — date, count, status — small, muted, pushed to the row's end) Badge{text,tone}
  Stat{label,value} Form{inline}+action (children inputs + a submit Button; input fields are sent automatically as body.data — never repeat them in action.data)
  Input{name,label,placeholder,required,inputType} Textarea{name,label,rows} Button{label,tone,size:"sm",submit}+action
  Mermaid{code,caption} (a diagram, zoomable) Image{src,alt,caption} (click opens full screen, zoomable)
  Code{code,lang} (with copy) Markdown{text} (long prose the owner wrote or asked for)
  Split (app shell: 1st child Sidebar, then content) Sidebar{title} (children: Link/Heading) Link{label,href,active,meta,dot}
  Thread{title,subtitle} (a conversation, full screen, messaging-app style; children: Bubble, usually one repeated, oldest first)
  Bubble{text,time,mine,author,kind:"audio"|"media",audio (playable url or data: URI of the original),cost (text, e.g. "US$ 0,0002"),notice}
  Page{title,wide} (wide for app shells) Tag{text,color} (ONE label chip; color = tone name or CSS color; several labels = a repeat over them) Select{name,label,options:[{value,label}],value}
  Checkbox{checked}+action  List{empty}  Row (a list item; usually the repeated child)
tone: primary|secondary|accent|neutral|ghost|error|success|warning. After any action the page re-renders itself.`;
  }

  export function render(spec: Spec, data: Data, params: Record<string, string> = {}, draft?: { fresh?: string[] }): string {
    // A "repeat" element is a template: it renders ITSELF once per row, with the row as $item.
    // In a draft, an element referenced but not written yet is a skeleton in its place, and the
    // elements the agent just wrote carry .is-fresh so the eye finds them.
    const node = (id: string, scope: Binding.Scope): string => {
      const el = spec.elements[id];
      if (!el) return draft ? `<div class="kernel-draft-slot skeleton" data-system-id="${escape(id)}"></div>` : "";
      if (draft && el.repeat) return [0, 1, 2].map(() => one(id, el, { ...scope, item: {} })).join("");
      if (!el.repeat) return one(id, el, scope);
      const rows = Binding.pointer(scope.data, el.repeat.path);
      return (Array.isArray(rows) ? rows : []).map((item) => one(id, el, { ...scope, item })).join("");
    };
    const one = (id: string, el: Element, scope: Binding.Scope): string => {
      const component = Catalog.components[el.type];
      if (!component) return `<!-- unknown ${escape(String(el.type))} -->`;
      let children = (el.children ?? []).map((c) => node(c, scope)).join("");
      // A draft container with nothing written inside yet shows where content will go: a few wire lines.
      if (draft && !children && ["Card", "List", "Stack", "Sidebar", "Split", "Form"].includes(el.type)) {
        children = `<div class="kernel-wire-lines" aria-hidden="true"><i></i><i></i><i></i></div>`;
      }
      const props = Binding.resolve(el.props ?? {}, scope) as Record<string, unknown>;
      const action = el.action && (Binding.resolve(el.action, scope) as Action);
      const html = component(props, children, { id, action });
      // The address goes on the outermost tag, so edit mode can find the element behind any click.
      const fresh = draft?.fresh?.includes(id) ? ` data-fresh` : "";
      return html.replace(/^<([a-z][a-z0-9]*)/, `<$1 data-system-id="${escape(id)}"${fresh}`);
    };
    return node(spec.root, { data, params });
  }

  /** The whole page around a view: the kernel inlined, the studio, the palette, and the script that listens to /_events. */
  export function Shell({ title, body, path, tokens = {}, bootstrap = false }: { title: string; body: string; path: string; tokens?: Record<string, string>; bootstrap?: boolean }) {
    const css = Object.entries(tokens).map(([k, v]) => `${k}:${v}`).join(";");
    return "<!doctype html>" + (
      h("html", { lang: "pt-BR", "data-theme": "kernel" },
          h("head", null,
              h("meta", { charset: "utf-8" }),
              h("meta", { name: "viewport", content: "width=device-width, initial-scale=1" }),
              h("title", null, escape(title)),
              h("link", { href: "https://cdn.jsdelivr.net/npm/daisyui@5", rel: "stylesheet", type: "text/css" }),
              h("link", { href: "https://cdn.jsdelivr.net/npm/@fontsource-variable/mona-sans@5/index.css", rel: "stylesheet" }),
              h("script", { src: "https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4" }),
              h("script", { src: "https://cdn.jsdelivr.net/npm/htmx.org@2.0.4/dist/htmx.min.js" }),
              h("style", null, `
          ${Kernel.css}
          ${css ? `[data-theme] { ${css} }` : ""}
        `)),
          h("body", { "hx-on--after-request": `if(event.detail.successful && event.detail.requestConfig.verb!=='get' && !event.detail.elt.closest('#feedback')) location.reload()` },
              h("div", { id: "kernel-body" }, body),
              h("div", { id: "kernel-studio", class: "kernel-studio", "aria-live": "polite" },
                  h("ol", { class: "kernel-rail" }, ["entender", "planejar", "pensar a UX", "esboçar", "desenhar"].map((label, i) => h("li", { "data-step": String(i + 1) },
                      h("span", { class: "kernel-rail-bar" }),
                      h("span", { class: "kernel-rail-label" }, label)))),
                  h("figure", { class: "kernel-narration" },
                      h("figcaption", { id: "kernel-narration-phase" }),
                      h("blockquote", { id: "kernel-narration-text" }),
                      h("form", { id: "kernel-gate", class: "kernel-gate", autocomplete: "off" },
                          h("input", { id: "kernel-gate-note", name: "note", placeholder: "Ajustar esta fase\u2026 (\u21B5 para refazer)" }),
                          h("button", { type: "submit", class: "btn btn-primary btn-sm", "data-continue": true },
                              "Seguir ",
                              h("kbd", { class: "kernel-kbd" }, "\u2318\u21B5"))))),
              h("dialog", { id: "palette", "aria-label": "pr\u00F3ximo passo" },
                  h("div", { class: "sheet" },
                      h("input", { id: "palette-input", placeholder: bootstrap ? "Diga o que isto deve se tornar…" : "Diga o que mudar, ou escolha uma ferramenta…", autocomplete: "off" }),
                      h("ul", { id: "palette-list", role: "listbox" }),
                      h("footer", null,
                          h("span", null, "\u2191\u2193 escolher"),
                          h("span", null, "\u21B5 executar"),
                          h("span", null, "\u2318\u21B5 passo a passo"),
                          h("span", null, "esc fechar")))),
              h("dialog", { id: "feedback", class: "modal" },
                  h("form", { class: "modal-box flex flex-col gap-3", "hx-post": "/_feedback", "hx-swap": "none", "hx-on--before-request": "this.querySelector('button').classList.add('loading')", "hx-on--after-request": "location.reload()" },
                      h("h3", { class: "font-bold" }, "O que deve mudar?"),
                      h("code", { class: "text-xs opacity-60", id: "feedback-target" }),
                      h("input", { type: "hidden", name: "path", value: path }),
                      h("input", { type: "hidden", name: "target" }),
                      h("textarea", { class: "textarea textarea-bordered", name: "instruction", rows: "3", required: true, placeholder: "aponte e diga" }),
                      h("button", { class: "btn btn-primary" }, "aplicar")),
                  h("form", { method: "dialog", class: "modal-backdrop" },
                      h("button", null, "fechar"))),
              bootstrap || path.startsWith("/_") ? "" : h("button", { class: "btn btn-sm btn-ghost fixed bottom-4 right-4", "hx-post": "/_accept", "hx-vals": JSON.stringify({ path }), "hx-confirm": "Esta vers\u00E3o \u00E9 o que voc\u00EA queria?", title: "fecha a jornada e aprende com ela" }, "\u2713 aceitar"),
              h("script", { type: "module" }, Kernel.js),
              h("div", { id: "working" },
                  h("span", { class: "flex items-center gap-3 rounded-box bg-base-100 px-5 py-3 text-base shadow-[0_12px_40px_-12px_oklch(23%_.014_60/.35)]" },
                      h("span", { class: "loading loading-dots loading-sm text-primary" }),
                      h("span", { id: "working-what" }, "o agente est\u00E1 trabalhando"))),
              h("script", null, `
          // The server says when an agent works and when the system changed — from this page, another tab or /_mcp.
          const pulse = new EventSource('/_events');
          let dirty = false;
          pulse.addEventListener('working', () => document.body.classList.add('working'));
          // The standard intent reading: which request, how big, and what the system was taught it means.
          pulse.addEventListener('operation', (e) => {
            const d = JSON.parse(e.data);
            document.body.classList.add('operating');
            const what = document.getElementById('working-what');
            if (what) what.textContent = d.method + ' ' + d.path + (d.size ? ' \u00B7 ' + d.size : '') + ' \u2014 ' + d.meaning;
          });
          pulse.addEventListener('idle', () => {
            document.body.classList.remove('operating');
            const what = document.getElementById('working-what');
            if (what) what.textContent = 'o agente est\u00E1 trabalhando';
          });
          // The finished screen does not reload the page: it develops out of the wireframe in a view transition.
          const develop = async () => {
            const html = await fetch(location.href, { headers: { accept: 'text/html' } }).then((r) => r.text());
            const next = new DOMParser().parseFromString(html, 'text/html');
            const swap = () => {
              document.getElementById('kernel-body').innerHTML = next.getElementById('kernel-body')?.innerHTML ?? '';
              document.getElementById('kernel-body').classList.remove('kernel-wireframe');
              document.body.classList.remove('working', 'studio', 'drafted');
              document.title = next.title;
            };
            document.startViewTransition ? await document.startViewTransition(swap).finished : swap();
            window.htmx?.process(document.getElementById('kernel-body'));
            document.dispatchEvent(new CustomEvent('htmx:afterSwap', { detail: {} }));
          };
          // "changed" can arrive after "idle": the view is saved once the agent's turn is over.
          pulse.addEventListener('changed', (e) => {
            const p = JSON.parse(e.data).path; if (p !== '*' && !samePath(p)) return;
            if (document.body.classList.contains('working')) dirty = true; else develop();
          });
          pulse.addEventListener('idle', () => { if (dirty) { dirty = false; develop(); } else document.body.classList.remove('working', 'studio', 'drafted'); });
          // The studio: a rail of five phases at the top, and the agent's current thought in the middle of the
          // page. Once a skeleton exists the thought steps aside to the corner and the wireframe takes the stage.
          const rail = document.querySelectorAll('.kernel-rail li');
          // A lived phase is a place to start again: click it on the rail and the design replays from there,
          // keeping every phase before it as approved.
          rail.forEach((li) => li.addEventListener('click', () => {
            if (!li.classList.contains('is-done') && !li.classList.contains('is-current')) return;
            fetch('/_intent', { method: 'POST', headers: { 'content-type': 'application/json', 'x-origin': 'palette' },
              body: JSON.stringify({ path: location.pathname, from: Number(li.dataset.step), interactive: true }) });
            document.body.classList.remove('awaiting');
          }));
          // The label is what the agent is doing NOW; the quote is the last thing it concluded, and says from which phase.
          let doing = '';
          const narrate = (phase, text, from) => {
            const cap = document.getElementById('kernel-narration-phase'), quote = document.getElementById('kernel-narration-text');
            const figure = cap.parentElement;
            figure.classList.remove('is-in'); void figure.offsetWidth;
            if (phase) doing = phase;
            cap.textContent = doing;
            if (from) quote.dataset.from = ({ 'entendendo': 'o que entendi', 'planejando': 'o plano', 'pensando a UX': 'as decisões de UX', 'esboço': 'o esboço' })[from] ?? from;
            // Waiting for the owner, the thought is read whole in the fold; running, it is a glimpse.
            const whole = document.body.classList.contains('awaiting');
            if (text !== undefined) {
              // Paragraphs, not raw newlines: a line that ends in ":" introduces the next one and sits tight to it.
              const shown = whole || text.length <= 280 ? text : text.slice(0, 277).trimEnd() + '…';
              // A phase reads at a glance. "## Title" lines start a column; "- " lines are a list; a fenced mermaid
              // block becomes a diagram; anything else is a paragraph. Two or more sections lay out side by side,
              // so a plan fits one fold instead of scrolling. (No regex here: this script lives in a TS template
              // literal, which eats backslashes.)
              // Text between backticks is a route or a field: set it as code, never show the backticks.
              const inline = (el, t) => t.split(String.fromCharCode(96)).forEach((part, k) => {
                if (k % 2) { const c = document.createElement('code'); c.textContent = part; el.append(c); } else el.append(part);
              });
              const diagram = (src) => { const d = document.createElement('div'); d.className = 'kernel-zoom kernel-fold-diagram'; d.dataset.mermaid = ''; d.textContent = src.join(String.fromCharCode(10)); return d; };
              // An erDiagram reads better as entity cards than as a tall chart: one card per entity (field, type) and
              // the relations as short lines under the cards. Parsed without regex (TS template literal).
              const entities = (src) => {
                const wrap = document.createElement('div'); wrap.className = 'kernel-entities'; const rels = document.createElement('ul'); rels.className = 'kernel-relations';
                let card = null;
                for (const raw of src.slice(1)) {
                  const t = raw.trim(); if (!t) continue;
                  if (t.endsWith('{')) { card = document.createElement('table'); const cap = document.createElement('caption'); cap.textContent = t.slice(0, -1).trim(); card.append(cap); wrap.append(card); continue; }
                  if (t === '}') { card = null; continue; }
                  if (card) { const [type, name, ...rest] = t.split(' ').filter(Boolean); const tr = document.createElement('tr');
                    const a = document.createElement('td'); a.textContent = name ?? type; const b = document.createElement('td'); b.textContent = (type ?? '') + (rest.includes('PK') ? ' · pk' : rest.includes('FK') ? ' · fk' : '');
                    tr.append(a, b); card.append(tr); continue; }
                  const colon = t.indexOf(':'); if (colon < 0) continue;
                  const ends = t.slice(0, colon).split(' ').filter(Boolean); const label = t.slice(colon + 1).trim().split('"').join('');
                  const li = document.createElement('li'); li.textContent = ends[0] + ' ' + (label || '→') + ' ' + ends[ends.length - 1]; rels.append(li);
                }
                const out = document.createElement('div'); out.className = 'kernel-entities-block'; out.append(wrap); if (rels.childNodes.length) out.append(rels); return out;
              };
              const block = (host) => { let list = null, fence = null;
                return (t) => {
                  if (fence) { if (t.startsWith('~~~') || t.startsWith(String.fromCharCode(96).repeat(3))) { host.append(fence[0]?.trim().startsWith('erDiagram') ? entities(fence) : diagram(fence)); fence = null; } else fence.push(t); return; }
                  if (t.startsWith(String.fromCharCode(96).repeat(3) + 'mermaid') || t.startsWith('~~~mermaid')) { fence = []; list = null; return; }
                  if (!t.trim()) { list = null; return; }
                  t = t.trim();
                  if (t.startsWith('- ')) { if (!list) { list = document.createElement('ul'); host.append(list); } const li = document.createElement('li'); inline(li, t.slice(2)); list.append(li); return; }
                  list = null; const p = document.createElement('p'); inline(p, t); if (t.endsWith(':')) p.className = 'is-lead'; host.append(p);
                }; };
              const intro = document.createElement('div'); intro.className = 'kernel-fold-intro';
              const sections = []; let write = block(intro);
              for (const raw of shown.split(String.fromCharCode(10))) {
                if (raw.trim().startsWith('## ')) {
                  const sec = document.createElement('section'); const h = document.createElement('h3'); h.textContent = raw.trim().slice(3); sec.append(h);
                  sections.push(sec); write = block(sec); continue;
                }
                write(raw);
              }
              const nodes = [];
              if (intro.childNodes.length) nodes.push(intro);
              // Text sections flow in newspaper columns on the left; a diagram gets its own column on the right.
              if (sections.length) {
                const grid = document.createElement('div'); grid.className = 'kernel-fold-grid';
                const text = document.createElement('div'); text.className = 'kernel-fold-text';
                const drawn = sections.filter((sec) => sec.querySelector('[data-mermaid], .kernel-entities-block'));
                text.append(...sections.filter((sec) => !drawn.includes(sec)));
                grid.append(text, ...drawn); grid.classList.toggle('has-diagram', drawn.length > 0); nodes.push(grid);
              }
              quote.replaceChildren(...nodes);
              quote.closest('.kernel-narration').classList.toggle('is-wide', sections.length > 1);
              document.dispatchEvent(new CustomEvent('htmx:afterSwap', { detail: {} }));
              requestAnimationFrame(() => quote.classList.toggle('is-overflow', quote.scrollHeight > quote.clientHeight + 2));
            }
            figure.classList.add('is-in');
          };
          pulse.addEventListener('phase', (e) => {
            const p = JSON.parse(e.data); if (!samePath(p.path)) return;
            document.body.classList.add('studio');
            rail.forEach((li) => {
              const n = Number(li.dataset.step);
              li.classList.toggle('is-done', n < p.step || (n === p.step && !!p.done));
              li.classList.toggle('is-current', n === p.step && !p.done);
            });
            document.body.classList.toggle('awaiting', !!p.awaiting);
            if (!p.done) narrate(p.name + '…', p.step === 1 ? '' : undefined);
            else if (p.awaiting) { narrate('sua vez: ' + p.name, p.text || '(sem texto)', p.name); document.getElementById('kernel-gate-note').focus(); }
            else if (p.text) narrate('', p.text, p.name);
          });
          // The fold answers the waiting phase: ⌘↵ (or Seguir) goes on; a note + ↵ redoes the phase with it.
          const gate = document.getElementById('kernel-gate'), gateNote = document.getElementById('kernel-gate-note');
          const answer = (decision) => {
            const note = gateNote.value.trim();
            if (decision === 'revise' && !note) return;
            document.body.classList.remove('awaiting'); gateNote.value = '';
            fetch('/_gate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path: GATE_PATH(), decision, note }) });
          };
          const GATE_PATH = () => location.pathname;
          gate.addEventListener('submit', (e) => { e.preventDefault(); answer(document.activeElement === gateNote && gateNote.value.trim() ? 'revise' : 'continue'); });
          document.addEventListener('keydown', (e) => {
            if (!document.body.classList.contains('awaiting')) return;
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); answer('continue'); }
          });
          pulse.addEventListener('gate', (e) => { const g = JSON.parse(e.data); if (samePath(g.path)) document.body.classList.remove('awaiting'); });
          const paintDraft = async (path, note) => {
            const r = await fetch('/_draft?path=' + encodeURIComponent(path)); if (!r.ok) return;
            const html = await r.text(), body = document.getElementById('kernel-body');
            const paint = () => { body.innerHTML = html; body.classList.add('kernel-wireframe'); document.body.classList.add('studio', 'drafted'); };
            document.startViewTransition ? document.startViewTransition(paint) : paint();
            if (note) narrate('', note, 'esboço');
          };
          pulse.addEventListener('draft', (e) => { const d = JSON.parse(e.data); if (samePath(d.path)) paintDraft(d.path, d.note); });
          // A reload in the middle of a design finds the sketch again instead of the empty page behind it.
          paintDraft(location.pathname);
          // Right click on any addressed element, or ⌘. / Ctrl+. to toggle edit mode and click.
          const pick = (el) => {
            const target = el.closest('[data-system-id]'); if (!target) return false;
            const d = document.getElementById('feedback');
            d.querySelector('[name=target]').value = target.dataset.systemId;
            document.getElementById('feedback-target').textContent = target.dataset.systemId;
            d.showModal(); d.querySelector('textarea').focus(); return true;
          };
          document.addEventListener('contextmenu', (e) => { if (e.shiftKey) return; if (pick(e.target)) e.preventDefault(); });
          document.addEventListener('keydown', (e) => { if ((e.metaKey || e.ctrlKey) && e.key === '.') document.body.classList.toggle('editing'); });
          // Vim motions, as two-key sequences outside inputs: g d → design system, g h → home. Esc on the
          // design system goes back to where you came from.
          let leader = 0;
          document.addEventListener('keydown', (e) => {
            if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest('input, textarea, dialog[open]')) return;
            if (e.key === 'Escape' && location.pathname === '/_design') { e.preventDefault(); history.length > 1 && document.referrer.startsWith(location.origin) ? history.back() : location.assign('/'); return; }
            if (e.key === 'g') { leader = Date.now(); return; }
            if (Date.now() - leader < 900) {
              leader = 0;
              if (e.key === 'd') window.open('/_ds/', 'design-system');
              if (e.key === 'h' && location.pathname !== '/') location.assign('/');
            }
          });
          // ⌘K — the one way in. Typing is always an instruction; the list is the tools that act on it.
          // "/notebooks/{id}" is the same screen as "/notebooks/notebook:x": compare by segment, {name} matches any.
          const samePath = (p) => { const a = p.split('/'), b = location.pathname.split('/'); return a.length === b.length && a.every((seg, k) => seg.startsWith('{') || seg === b[k]); };
          const BLANK = ${JSON.stringify(bootstrap)};
          const PATH = ${JSON.stringify(path)};
          const palette = document.getElementById('palette'), input = document.getElementById('palette-input'), list = document.getElementById('palette-list');
          const post = (url, body) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-origin': 'palette' }, body: JSON.stringify(body) });
          const tools = [
            { title: BLANK ? 'Tornar isto' : 'Refazer esta tela como', hint: 'intent', needsText: true, run: (t, step) => post('/_intent', { interactive: !!step, intent: t, path: PATH }) },
            ...(BLANK ? [] : [
              { title: 'Mudar esta tela', hint: 'feedback', needsText: true, run: (t) => post('/_feedback', { path: PATH, target: 'page', instruction: t }) },
              { title: 'Apontar um elemento', hint: 'modo edição · ⌘.', run: () => document.body.classList.add('editing') },
              { title: 'Aceitar esta versão', hint: 'aprende com a jornada', run: () => post('/_accept', { path: PATH }) },
            ]),
            { title: 'Design system', hint: 'g d · nova aba', run: () => window.open('/_ds/', 'design-system') },
            { title: 'O que o sistema sabe', hint: '/_system', run: () => window.open('/_system', '_blank') },
          ];
          let items = [], active = 0;
          const draw = () => {
            const text = input.value.trim();
            items = tools.filter((t) => !t.needsText || text).filter((t) => t.needsText || !text || t.title.toLowerCase().includes(text.toLowerCase()));
            if (!items.length) items = tools.filter((t) => t.needsText);
            active = Math.min(active, Math.max(items.length - 1, 0));
            list.replaceChildren(...items.map((t, i) => {
              const li = document.createElement('li');
              li.setAttribute('role', 'option'); li.setAttribute('aria-selected', String(i === active));
              const b = document.createElement('b'); b.textContent = t.title;
              const q = document.createElement('span'); q.textContent = t.needsText && text ? '«' + text + '»' : '';
              const small = document.createElement('small'); small.textContent = t.hint;
              li.append(b, q, small); li.onclick = () => exec(i); return li;
            }));
          };
          const exec = (i, step = false) => { const t = items[i]; if (!t) return; const text = input.value.trim(); palette.close(); input.value = ''; t.run(text, step); };
          const open = () => { active = 0; draw(); palette.showModal(); input.focus(); };
          document.addEventListener('keydown', (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); palette.open ? palette.close() : open(); } });
          input.addEventListener('input', () => { active = 0; draw(); });
          input.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') { active = (active + 1) % items.length; draw(); e.preventDefault(); }
            else if (e.key === 'ArrowUp') { active = (active - 1 + items.length) % items.length; draw(); e.preventDefault(); }
            else if (e.key === 'Enter') { exec(active, e.metaKey || e.ctrlKey); e.preventDefault(); }
          });
          palette.addEventListener('click', (e) => { if (e.target === palette) palette.close(); });
          // Someone else (the MCP, another tab) made a gesture: play it here, slowly, without re-sending it.
          const TITLES = { intent: BLANK ? 'Tornar isto' : 'Refazer esta tela como', feedback: 'Mudar esta tela', accept: 'Aceitar esta versão' };
          const wait = (ms) => new Promise((r) => setTimeout(r, ms));
          pulse.addEventListener('gesture', async (e) => {
            const g = JSON.parse(e.data);
            if (g.path !== PATH || palette.open) return;
            open(); input.readOnly = true;
            await wait(350);
            for (const ch of g.text) { input.value += ch; draw(); await wait(Math.max(12, Math.min(38, 1400 / g.text.length))); }
            active = Math.max(0, items.findIndex((t) => t.title === TITLES[g.tool])); draw();
            await wait(650);
            input.readOnly = false; input.value = ''; palette.close();
          });
          document.addEventListener('click', (e) => {
            if (!document.body.classList.contains('editing') || e.target.closest('#feedback')) return;
            e.preventDefault(); e.stopPropagation(); pick(e.target);
          }, true);
          document.addEventListener('mouseover', (e) => {
            if (!document.body.classList.contains('editing')) return;
            document.querySelectorAll('.target').forEach((n) => n.classList.remove('target'));
            e.target.closest('[data-system-id]')?.classList.add('target');
          });
        `)))
    );
  }

  /** The one view the binary ships: what a system with no knowledge shows. */
  export const BOOTSTRAP: Spec = {
    v: 1,
    title: "em branco",
    root: "blank",
    elements: {
      blank: { type: "Blank", props: { title: "Em branco.", hint: "para dar o primeiro passo" } },
    },
  };

  /** The other view the binary ships: every native component, with sample data, and the live tokens. */
  export const DESIGN_SYSTEM: { spec: Spec; data: Record<string, unknown> } = {
    data: {
      rows: [
        { id: "exemplo:1", title: "Revisar a proposta", when: "14/09 09:12", done: false },
        { id: "exemplo:2", title: "Ligar para o fornecedor", when: "14/09 10:40", done: false },
        { id: "exemplo:3", title: "Fechar o mês", when: "13/09 18:05", done: true },
      ],
    },
    spec: {
      v: 1,
      title: "design system",
      root: "page",
      elements: {
        page: { type: "Page", props: { title: "Design system" }, children: ["intro", "tokens", "type", "actions", "form", "list", "figures", "media"] },
        media: { type: "Card", props: { title: "Mídia" }, children: ["media.mermaid", "media.image", "media.code", "media.md"] },
        "media.mermaid": { type: "Mermaid", props: { caption: "Mermaid · roda, arrasta, duplo clique volta", code: "flowchart LR\n  pedido[Pedido] --> op[operation]\n  op --> cap{capability?}\n  cap -- sim --> prog[program 20 ms]\n  cap -- não --> agente[agente ACP]\n  agente --> learn[learning] --> prog" } },
        "media.image": { type: "Image", props: { src: "https://img.daisyui.com/images/stock/photo-1606107557195-0e29a4b5b4aa.webp", alt: "Tênis sobre fundo verde", caption: "Image · clique abre em tela cheia" } },
        "media.code": { type: "Code", props: { lang: "surrealql", code: "CREATE todo SET title = $data.title, done = false, created = time::now()" } },
        "media.md": { type: "Markdown", props: { text: "**Markdown** · para o texto longo. Listas, *ênfase* e [links](https://daisyui.com) sem componente novo.\n\n- um\n- dois" } },
        intro: { type: "Text", props: { muted: true, text: "O vocabulário que todo sistema recebe ao nascer. esc volta, g h vai para a home." } },
        tokens: { type: "Card", props: { title: "Cores" }, children: ["tokens.swatches"] },
        "tokens.swatches": { type: "Swatches", props: { tokens: ["--color-base-100", "--color-base-200", "--color-base-300", "--color-base-content", "--color-primary", "--color-accent", "--color-success", "--color-error"] } },
        type: { type: "Card", props: { title: "Texto" }, children: ["type.heading", "type.text", "type.muted", "type.strike"] },
        "type.heading": { type: "Heading", props: { text: "Heading · a voz de uma seção" } },
        "type.text": { type: "Text", props: { text: "Text · o corpo. Uma ideia por parágrafo, medida de até 65 caracteres para a leitura não cansar." } },
        "type.muted": { type: "Text", props: { muted: true, text: "Text muted · o que acompanha sem disputar atenção." } },
        "type.strike": { type: "Text", props: { strike: true, text: "Text strike · o que já foi feito." } },
        actions: { type: "Card", props: { title: "Ações" }, children: ["actions.row"] },
        "actions.row": { type: "Stack", props: { direction: "row", gap: 3 }, children: ["b.primary", "b.neutral", "b.ghost", "b.badge"] },
        "b.primary": { type: "Button", props: { label: "Primária", tone: "primary" } },
        "b.neutral": { type: "Button", props: { label: "Neutra", tone: "neutral" } },
        "b.ghost": { type: "Button", props: { label: "Discreta", tone: "ghost" } },
        "b.badge": { type: "Badge", props: { text: "badge", tone: "neutral" } },
        form: { type: "Card", props: { title: "Formulário" }, children: ["form.inline"] },
        "form.inline": { type: "Form", props: { inline: true }, children: ["form.input", "form.submit"] },
        "form.input": { type: "Input", props: { name: "exemplo", placeholder: "Input · o que precisa ser feito?" } },
        "form.submit": { type: "Button", props: { label: "Enviar", submit: true } },
        list: { type: "Card", props: { title: "Lista" }, children: ["list.list"] },
        "list.list": { type: "List", props: { empty: "List empty · nada aqui ainda." }, children: ["list.row"] },
        "list.row": { type: "Row", repeat: { path: "/rows", key: "id" }, children: ["list.check", "list.title", "list.when"] },
        "list.check": { type: "Checkbox", props: { checked: { $item: "done" } } },
        "list.title": { type: "Text", props: { text: { $item: "title" }, strike: { $item: "done" } } },
        "list.when": { type: "Text", props: { meta: true, text: { $item: "when" } } },
        figures: { type: "Card", props: { title: "Números" }, children: ["figures.row"] },
        "figures.row": { type: "Stack", props: { direction: "row", gap: 10 }, children: ["stat.a", "stat.b"] },
        "stat.a": { type: "Stat", props: { label: "Pendentes", value: { $count: { $data: "/rows" } } } },
        "stat.b": { type: "Stat", props: { label: "Stat · número com rótulo", value: "12,4%" } },
      },
    },
  };
}

/** The ACP client: Agent is how the runtime reaches claude-agent-acp over stdio, Commands the CLI around it. */
export namespace Acp {
  export const Agent = {
    connect(command: string, client: Partial<acp.Client> = {}) {
      const { spawn } = process.getBuiltinModule("node:child_process");
      const { Readable, Writable } = process.getBuiltinModule("node:stream");
      const [bin, ...args] = command.split(" ");
      const child = spawn(bin, args, { stdio: ["pipe", "pipe", "inherit"] });
      const stream = acp.ndJsonStream(
        Writable.toWeb(child.stdin!) as WritableStream<Uint8Array>,
        Readable.toWeb(child.stdout!) as unknown as ReadableStream<Uint8Array>,
      );
      const full: acp.Client = {
        async requestPermission() { return { outcome: { outcome: "cancelled" } }; },
        async sessionUpdate() {},
        ...client,
      };
      const conn = new acp.ClientSideConnection(() => full, stream);
      return { conn, close: () => child.kill() };
    },

    initialize(conn: acp.ClientSideConnection) {
      return conn.initialize({
        protocolVersion: acp.PROTOCOL_VERSION,
        clientCapabilities: {},
        clientInfo: { name: "stem", version: "0.0.1" },
      });
    },

    async listAll(conn: acp.ClientSideConnection, cwd?: string) {
      const sessions: acp.SessionInfo[] = [];
      let cursor: string | undefined;
      do {
        const page = await conn.listSessions({ cwd, cursor });
        sessions.push(...page.sessions);
        cursor = page.nextCursor ?? undefined;
      } while (cursor);
      return sessions;
    },
  };

  export const Commands = {
    /** The agent's initialize response. */
    async caps(agent: string) {
      const { conn, close } = Agent.connect(agent);
      try {
        console.log(JSON.stringify(await Agent.initialize(conn), null, 2));
      } finally {
        close();
      }
    },

    /** Existing sessions, in one cwd or all of them. */
    async list(agent: string, cwd?: string) {
      const { conn, close } = Agent.connect(agent);
      try {
        const init = await Agent.initialize(conn);
        if (!init.agentCapabilities?.sessionCapabilities?.list) {
          throw new Error(`${agent} does not advertise sessionCapabilities.list`);
        }
        const sessions = await Agent.listAll(conn, cwd);
        for (const s of sessions) {
          const when = s.updatedAt ? s.updatedAt.slice(0, 16).replace("T", " ") : "—".padEnd(16);
          console.log(`${when}  ${s.sessionId}  ${(s.title ?? "").slice(0, 60)}  ${cwd ? "" : s.cwd}`);
        }
        console.error(`${sessions.length} sessions`);
      } finally {
        close();
      }
    },

    /** Holds one session open: every line written to .run/in.fifo is a prompt, and replies go to stdout. */
    async daemon(agent: string, cwd: string, sessionId: string | undefined, allow: boolean) {
      const { createReadStream, existsSync, mkdirSync, unlinkSync } = process.getBuiltinModule("node:fs");
      const { execFileSync } = process.getBuiltinModule("node:child_process");
      const { createInterface } = process.getBuiltinModule("node:readline");
      const runDir = `${import.meta.dirname}/.run`;
      const fifo = `${runDir}/in.fifo`;
      const { conn, close } = Agent.connect(agent, {
        async sessionUpdate({ update }) {
          if (update.sessionUpdate === "agent_message_chunk" && update.content.type === "text") {
            process.stdout.write(update.content.text);
          } else if (update.sessionUpdate === "tool_call") {
            process.stdout.write(`\n[tool] ${update.title}\n`);
          }
        },
        async requestPermission({ options, toolCall }) {
          const pick = allow ? options.find((o) => o.kind === "allow_once") : undefined;
          console.error(`\n[permission] ${toolCall.title} → ${pick ? "allow_once" : "cancelled"}`);
          return pick
            ? { outcome: { outcome: "selected", optionId: pick.optionId } }
            : { outcome: { outcome: "cancelled" } };
        },
      });
      const shutdown = () => { close(); if (existsSync(fifo)) unlinkSync(fifo); process.exit(0); };
      process.on("SIGINT", shutdown).on("SIGTERM", shutdown);

      await Agent.initialize(conn);
      if (sessionId) {
        await conn.resumeSession({ sessionId, cwd, mcpServers: [] });
      } else {
        sessionId = (await conn.newSession({ cwd, mcpServers: [] })).sessionId;
      }

      mkdirSync(runDir, { recursive: true });
      if (!existsSync(fifo)) execFileSync("mkfifo", [fifo]);
      console.error(`session ${sessionId} · cwd ${cwd}\nwrite prompts to ${fifo}`);

      // A FIFO hits EOF each time its writer closes, so reopen it forever.
      for (;;) {
        for await (const line of createInterface({ input: createReadStream(fifo) })) {
          if (!line.trim()) continue;
          console.log(`\n> ${line}`);
          const { stopReason } = await conn.prompt({ sessionId, prompt: [{ type: "text", text: line }] });
          console.log(`\n[${stopReason}]`);
        }
      }
    },
  };
}

/**
 * Publishes a running system as <slug>.localhost through the Caddy already on this machine. It talks to Caddy's
 * admin API, so nothing is written to the repo's Caddyfile and no reload happens: the route lives while the process
 * lives, and a `caddy reload` of the Caddyfile drops it.
 */
export namespace Caddy {
  /** Idempotent: an old route with the same slug is removed first, and the new one goes to the top. */
  export async function publish(slug: string, port: number) {
    if (!/^[a-z0-9-]+$/.test(slug)) throw new Error(`slug must be [a-z0-9-]: ${slug}`);
    await unpublish(slug);
    const servers = await httpServers();
    await Promise.all(servers.map(async (server, i) => {
      const route = {
        "@id": `${id(slug)}-${i}`,
        match: [{ host: [`${slug}.localhost`] }],
        handle: [{ handler: "reverse_proxy", upstreams: [{ dial: `127.0.0.1:${port}` }],
          // SSE (/_events) must not be buffered, or the page never hears the agent start.
          flush_interval: -1 }],
        terminal: true,
      };
      const res = await admin("PUT", `/config/apps/http/servers/${server}/routes/0`, route);
      if (res.status !== 200) throw new Error(`caddy refused the route on ${server}: ${res.status} ${res.text}`);
    }));
    return `http://${slug}.localhost`;
  }

  export async function unpublish(slug: string) {
    await Promise.all([0, 1].map((i) => admin("DELETE", `/id/${id(slug)}-${i}`).catch(() => undefined)));
  }

  const id = (slug: string) => `system-${slug}`;

  /**
   * The servers on :80 and :443. Both get the route: Safari upgrades a *.localhost it once saw on https,
   * and a route only on :80 answers that upgrade with a TLS error. Caddy issues the local cert itself.
   */
  async function httpServers() {
    const res = await admin("GET", "/config/apps/http/servers");
    if (res.status !== 200) throw new Error(`caddy admin answered ${res.status}`);
    const servers = JSON.parse(res.text) as Record<string, { listen?: string[] }>;
    const names = Object.entries(servers).filter(([, v]) => v.listen?.some((l) => l.endsWith(":80") || l.endsWith(":443"))).map(([n]) => n);
    if (!names.length) throw new Error("no caddy server listens on :80 or :443");
    return names;
  }

  /**
   * fetch is safe here only because this runs on Bun. Node's undici sends `sec-fetch-mode: cors`, and Caddy's admin
   * answers 403 to anything that looks like a browser (measured 14/09 under Node: curl 200, undici 403; under
   * Bun 1.3.9 the same GET through fetch answered 200).
   */
  async function admin(method: string, path: string, body?: unknown) {
    const res = await fetch(`${process.env.CADDY_ADMIN ?? "http://localhost:2019"}${path}`, {
      method, headers: body === undefined ? {} : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, text: await res.text() };
  }
}

/**
 * /_mcp, the meta MCP of the system. It tells an agent what exists (resources), lets it change things only through
 * the runtime (tools), and carries the instructions for operating the system (prompts). Stateless: one McpServer
 * per HTTP request, over the SDK's web-standard transport, which is what a Hono handler speaks.
 */
export namespace Mcp {
  /** What /_mcp needs from the runtime; kept narrow so the MCP cannot reach around it. */
  export type SystemPort = {
    schema(): Promise<unknown>;
    views(): Promise<{ path: string; versions: number }[]>;
    view(path: string): Promise<unknown>;
    journey(path: string): Promise<unknown>;
    preferences(): Promise<unknown>;
    capabilities(): Promise<unknown>;
    query(sql: string): Promise<unknown>;
    teach(scope: string, instruction: string): Promise<void>;
    /** Every taught scope with its instructions in order; the last one is what the runtime follows. */
    teachings(): Promise<Memory.Taught[]>;
    sketch(path: string, view: unknown, note: string): Promise<void>;
    design(path: string): Promise<unknown>;
    prefer(p: { scope: string; rule: string }): Promise<unknown>;
    /** An HTTP operation through the runtime's own app, in process: recorded like any client's. */
    request(method: string, path: string, body?: object): Promise<Response>;
    prompts: Record<string, string>;
  };

  export const SystemMcp = {
    INSTRUCTIONS: `This server IS the system you operate. Read before you write: system://schema for the
application tables, system://views and system://view/{path} for screens, system://preferences for what the
owner accepted before, system://teachings for what each route was taught (the last instruction of a scope is the
rule), system://capabilities for what already runs without a model.
Change state with the query tool (application tables only) or the request tool (an HTTP operation through the
runtime, recorded like any client's). Never try to reach the database another way.
How to interact, in this order:
1. Name a route before anyone calls it: teach "METHOD /path" with what it means, the table it writes and the answer.
   Every open page shows the first sentence of that teaching while the operation runs; an untaught route shows as
   unknown, so the owner cannot read what you are doing.
2. Data that comes from outside enters through request (or the client calling the route), never by INSERT in query:
   an operation is recorded, and the same shape twice crystallizes into a program that runs without a model.
3. Screens change by intent (interactive: true when the owner is watching) and by feedback on one element. Never
   call accept: acceptance is the owner's.
4. One author per definition. Read system://views and the route's behavior before changing it, and do not rename a
   table or field another agent already taught; say so to the owner instead.`,

    async handle(port: SystemPort, req: Request) {
      // bun --hot swaps this namespace but keeps the running Memory: a port from before the reload has no teachings.
      const mcp = SystemMcp.build(port, port.teachings ? await port.teachings() : []);
      const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      await mcp.connect(transport);
      return transport.handleRequest(req);
    },

    build(port: SystemPort, taught: Memory.Taught[] = []) {
      const mcp = new McpServer({ name: "system", version: "0.1.0" }, { instructions: SystemMcp.INSTRUCTIONS });
      const json = (uri: string, value: unknown) => ({ contents: [{ uri, mimeType: "application/json", text: JSON.stringify(value, null, 2) }] });

      mcp.registerResource("schema", "system://schema", { description: "INFO FOR DB: the application tables" },
        async (uri) => json(uri.href, await port.schema()));
      mcp.registerResource("views", "system://views", { description: "Every path that has a view, with its version count" },
        async (uri) => json(uri.href, await port.views()));
      mcp.registerResource("view", new ResourceTemplate("system://view/{path}", { list: undefined }),
        { description: "The current spec of a view; path is URL-encoded, e.g. system://view/%2F" },
        async (uri, { path }) => json(uri.href, await port.view(decodeURIComponent(String(path)))));
      mcp.registerResource("journey", new ResourceTemplate("system://journey/{path}", { list: undefined }),
        { description: "Every version of a view since its last acceptance, with the instruction behind each" },
        async (uri, { path }) => json(uri.href, await port.journey(decodeURIComponent(String(path)))));
      // The fold, for agents: the phase a design is in, its text, whether it waits for an answer, and the current draft.
      mcp.registerResource("design", new ResourceTemplate("system://design/{path}", { list: undefined }),
        { description: "The interactive design on a path: current phase, its text, waiting (answer with the gate tool), and the draft view" },
        async (uri, { path }) => json(uri.href, await port.design(decodeURIComponent(String(path)))));
      mcp.registerResource("preferences", "system://preferences", { description: "Rules compiled from accepted journeys, scoped" },
        async (uri) => json(uri.href, await port.preferences()));
      // What each route was taught. teach only appends, so the history is the resource and the last line is the rule.
      mcp.registerResource("teachings", "system://teachings", { description: "Every taught scope ('METHOD /path' or 'SYSTEM '), its instructions oldest first; the last one is what the runtime follows" },
        async (uri) => json(uri.href, port.teachings ? await port.teachings() : []));
      mcp.registerResource("teaching", new ResourceTemplate("system://teaching/{scope}", {
        list: async () => ({ resources: (port.teachings ? await port.teachings() : []).map((t) => ({ uri: `system://teaching/${encodeURIComponent(t.scope)}`, name: t.scope, mimeType: "application/json" })) }),
      }), { description: "What one scope was taught; scope is URL-encoded, e.g. system://teaching/POST%20%2Fdeals%2F%7Bid%7D%2Ffields" },
        async (uri, { scope }) => json(uri.href, (port.teachings ? await port.teachings() : []).find((t) => t.scope === decodeURIComponent(String(scope))) ?? null));
      mcp.registerResource("capabilities", "system://capabilities", { description: "Behaviors already compiled: no model runs for these" },
        async (uri) => json(uri.href, await port.capabilities()));

      mcp.registerTool("query", {
        description: "Run SurrealQL on the application tables. Operational tables are refused.",
        inputSchema: { sql: z.string() },
      }, async ({ sql }) => {
        try { return { content: [{ type: "text", text: JSON.stringify(await port.query(sql)) }] }; }
        catch (e) { return { isError: true, content: [{ type: "text", text: String(e) }] }; }
      });
      mcp.registerTool("request", {
        description: "Send an HTTP operation through the runtime, exactly as a client would; it is recorded.",
        inputSchema: { method: z.string(), path: z.string(), data: z.record(z.string(), z.unknown()).optional(), instructions: z.string().optional() },
      }, async ({ method, path, data, instructions }) => {
        const res = await port.request(method, path, method === "GET" ? undefined : { data, instructions });
        return { content: [{ type: "text", text: `${res.status} ${await res.text()}` }] };
      });
      // The screen's three gestures, so an agent can shape the system exactly as the owner does. In process, not over
      // HTTP: a design takes minutes, and an HTTP client between the tool and the runtime is one more timeout
      // (undici's fetch dropped the response at 300 s).
      const runtime = async (path: string, body: object) => {
        try {
          const res = await port.request("POST", path, body);
          return { isError: res.status >= 400, content: [{ type: "text" as const, text: `${res.status} ${await res.text()}` }] };
        } catch (e) {
          return { isError: true, content: [{ type: "text" as const, text: String(e) }] };
        }
      };
      mcp.registerTool("intent", {
        description: "Say what a path should become; an agent writes its view. Same as ⌘K. interactive: true is ⌘↵ — the design stops after each phase; read system://design/{path} and answer with gate. path defaults to /.",
        inputSchema: { intent: z.string(), path: z.string().optional(), interactive: z.boolean().optional() },
      }, ({ intent, path, interactive }) => runtime("/_intent", { intent, path, interactive }));
      mcp.registerTool("gate", {
        description: "Answer an interactive design waiting on a path: continue, or revise the current phase with a note. Same as ⌘↵ / typing in the fold. Read system://design/{path} first to see the phase text.",
        inputSchema: { path: z.string(), decision: z.enum(["continue", "revise"]), note: z.string().optional() },
      }, ({ path, decision, note }) => runtime("/_gate", { path, decision, note }));
      mcp.registerTool("feedback", {
        description: "Point at an element of a view (its data-system-id, or 'page') and say what should change. Same as right click.",
        inputSchema: { path: z.string(), target: z.string(), instruction: z.string() },
      }, ({ path, target, instruction }) => runtime("/_feedback", { path, target, instruction }));
      mcp.registerTool("accept", {
        description: "The current view of a path is what the owner wanted: close the journey and compile preferences. Same as ✓ aceitar.",
        inputSchema: { path: z.string() },
      }, ({ path }) => runtime("/_accept", { path }));

      mcp.registerTool("sketch", {
        description: "While designing, show the partial view on every open page of that path: call it once with the skeleton (root and sections, children may not exist yet) and again after each section. Nothing is saved; the final JSON reply still is the view.",
        inputSchema: { path: z.string(), view: z.record(z.string(), z.unknown()), note: z.string().optional() },
      }, async ({ path, view, note }) => {
        await port.sketch(path, view, note ?? "");
        return { content: [{ type: "text", text: "sketched" }] };
      });

      mcp.registerTool("prefer", {
        description: "Record a scoped preference the designers apply from now on: scope 'global', 'kind:landing', 'phase:entendendo'…",
        inputSchema: { scope: z.string(), rule: z.string() },
      }, async ({ scope, rule }) => { await port.prefer({ scope, rule }); return { content: [{ type: "text", text: "preferred" }] }; });

      mcp.registerTool("teach", {
        description: "Record what an operation means, ahead of its use. scope is 'METHOD /path' or 'SYSTEM '.",
        inputSchema: { scope: z.string(), instruction: z.string() },
      }, async ({ scope, instruction }) => {
        await port.teach(scope, instruction);
        return { content: [{ type: "text", text: "taught" }] };
      });

      // A taught route as a prompt: the owner's meaning of it, ready to hand to an agent that is about to call or change it.
      if (taught.length) {
        mcp.registerPrompt("teaching", {
          description: `What a route of this system was taught. Scopes: ${taught.map((t) => t.scope).join(" · ")}`,
          argsSchema: { scope: z.string().describe(`One of: ${taught.map((t) => t.scope).join(" · ")}`) },
        }, ({ scope }) => {
          const t = taught.find((x) => x.scope === scope);
          const text = !t ? `Nothing was taught for "${scope}". Taught scopes: ${taught.map((x) => x.scope).join(" · ")}`
            : `${t.scope} — follow the LAST instruction; the earlier ones are history.\n\n${t.instructions.map((i, n) => `${n + 1}. (${i.at}) ${i.instruction}`).join("\n\n")}`;
          return { messages: [{ role: "user", content: { type: "text", text } }] };
        });
      }
      for (const [name, text] of Object.entries(port.prompts)) {
        mcp.registerPrompt(name, { description: `The ${name} instructions of this system` },
          () => ({ messages: [{ role: "user", content: { type: "text", text } }] }));
      }
      return mcp;
    },
  };
}

/** The operational memory, and the seam every other part reads and writes the system through. */
export class Memory {
  #db: Surreal;
  private constructor(db: Surreal) { this.#db = db; }

  /** How many matching operations a learning needs before it becomes a capability. */
  static PROMOTE_AT = 2;

  static async open(url: string) {
    // import(), not a static import: Storybook loads this file in a browser, where the native engine cannot exist.
    const { createNodeEngines } = await import("@surrealdb/node");
    if (url.startsWith("surrealkv://")) {
      const { mkdirSync } = process.getBuiltinModule("node:fs");
      mkdirSync(process.getBuiltinModule("node:path").dirname(url.slice("surrealkv://".length)), { recursive: true });
    }
    const db = new Surreal({ engines: createNodeEngines() });
    await db.connect(url);
    await db.use({ namespace: "backend", database: "backend" });
    // A SELECT on a table that does not exist yet is an ERROR in surrealkv, not an empty list.
    await db.query(["operation", "execution", "learning", "capability", "teaching", "view", "theme", "preference", "acceptance", "program", "design_phase"].map((t) => `DEFINE TABLE IF NOT EXISTS ${t} SCHEMALESS;`).join(" "));
    return new Memory(db);
  }

  async query<T>(sql: string, vars: Record<string, unknown> = {}) {
    return (await this.#db.query(sql, vars)) as T;
  }

  /** The split: a DEFINITION (view, theme, program, preference, phase, teaching, capability) is written only here; rows go through app(), the log through query(). */
  async define<T>(sql: string, vars: Record<string, unknown> = {}) {
    return this.query<T>(sql, vars);
  }

  async record(request: Memory.Match & { query: string; headers: unknown; body: unknown }) {
    const [[op]] = await this.query<[[{ id: RecordId }]]>(
      "CREATE operation CONTENT $r", { r: { ...request, status: "resolving", created_at: new Date() } });
    return op.id;
  }

  async complete(op: RecordId, r: Memory.Resolution) {
    await this.query("UPDATE $op MERGE { status: 'completed', output: $body, http_status: $status, resolved_by: $by }",
      { op, body: r.body, status: r.status, by: r.by });
  }

  async fail(op: RecordId, error: string) {
    await this.query("UPDATE $op MERGE { status: 'failed', error: $error }", { op, error });
  }

  async execution(op: RecordId, agent: string, transcript: string[], ms: number) {
    await this.query("CREATE execution CONTENT $e",
      { e: { operation: op, agent, transcript, duration_ms: ms, created_at: new Date() } });
  }

  /** The agent's query into application state; the operational tables stay out of reach. */
  async app(sql: string, vars: Record<string, unknown> = {}) {
    if (/\b(operation|execution|learning|capability|teaching|view|theme|preference|acceptance|program|design_phase)\b/i.test(sql)) {
      throw new Error("operational tables are reserved");
    }
    return Memory.jsonSafe(await this.#db.query(sql, vars));
  }

  async find<T>(table: "capability" | "learning", m: Memory.Match) {
    const [rows] = await this.query<[T[]]>(
      `SELECT * FROM ${table} WHERE match.method = $method AND match.path = $path LIMIT 1`, m);
    return rows[0];
  }

  async learn(op: RecordId, match: Memory.Match, behavior: Memory.Behavior) {
    await this.define("CREATE learning CONTENT $l",
      { l: { match, behavior, learned_from: [op], created_at: new Date() } });
  }

  /** A learning that answered again gains a witness; enough witnesses make it a capability. */
  async confirm(op: RecordId, learning: { id: RecordId; match: Memory.Match; behavior: Memory.Behavior; learned_from: RecordId[] }) {
    const witnesses = [...learning.learned_from, op];
    await this.define("UPDATE $id MERGE { learned_from: $w }", { id: learning.id, w: witnesses });
    if (witnesses.length < Memory.PROMOTE_AT) return false;
    await this.define("CREATE capability CONTENT $c", {
      c: { match: learning.match, behavior: learning.behavior, evolved_from: learning.id, created_at: new Date() },
    });
    return true;
  }

  /** "/todos/{id}/complete" matches "/todos/todo:abc/complete" and yields {id: "todo:abc"}. */
  static routeMatch(route: string, path: string): Record<string, string> | undefined {
    const names: string[] = [];
    const pattern = route.replace(/\{(\w+)\}/g, (_m, n) => { names.push(n); return "([^/]+)"; });
    const hit = new RegExp(`^${pattern}$`).exec(path);
    return hit ? Object.fromEntries(names.map((n, i) => [n, decodeURIComponent(hit[i + 1])])) : undefined;
  }

  static PROMOTE_PROGRAM_AT = 2;

  async program(m: Memory.Match) {
    const [rows] = await this.query<[(Memory.Program & { id: RecordId; method: string; promoted: boolean; witnesses: RecordId[] })[]]>(
      "SELECT * FROM program WHERE method = $method ORDER BY promoted DESC, created_at DESC", m);
    for (const row of rows) {
      const params = Memory.routeMatch(row.route, m.path);
      if (params) return { ...row, params };
    }
    return undefined;
  }

  /** The same SQL written again for the same route is a witness; enough witnesses promote it. */
  async propose(op: RecordId, method: string, p: Memory.Program) {
    const sql = p.sql.replace(/\s+/g, " ").trim();
    const [[same]] = await this.query<[{ id: RecordId; witnesses: RecordId[] }[]]>(
      "SELECT id, witnesses, created_at FROM program WHERE method = $method AND route = $route AND sql = $sql LIMIT 1",
      { method, route: p.route, sql });
    if (!same) {
      await this.define("CREATE program CONTENT $p", { p: { method, route: p.route, sql, status: p.status ?? 200, one: Boolean(p.one),
        witnesses: [op], promoted: false, created_at: new Date() } });
      return;
    }
    const witnesses = [...same.witnesses, op];
    await this.define("UPDATE $id MERGE { witnesses: $w, promoted: $promoted, promoted_at: $at }",
      { id: same.id, w: witnesses, promoted: witnesses.length >= Memory.PROMOTE_PROGRAM_AT,
        at: witnesses.length >= Memory.PROMOTE_PROGRAM_AT ? new Date() : null });
  }

  async witness(id: RecordId, op: RecordId, kind: string) {
    await this.query("UPDATE $id SET runs += $op, last_run = $kind", { id, op, kind });
  }

  /**
   * Programs written by the designer next to its view start promoted: the one who wrote the screen's read
   * queries writes the matching writes. Only programs for actions the view really declares are taken, and
   * the same guard as any program applies: the first time one breaks, it is demoted and the agent answers.
   */
  async adopt(programs: (Memory.Program & { method: string })[] | undefined, view: View.Spec | undefined, more: View.Spec[] = []) {
    if (!programs?.length || !view) return;
    const actions = [view, ...more].flatMap((v) => Object.values(v?.elements ?? {}).flatMap((e) => (e.action ? [e.action] : [])));
    for (const p of programs) {
      const declared = actions.some((a) => a.method.toUpperCase() === p.method?.toUpperCase()
        && Memory.routeMatch(p.route, a.path.replace(/\{\$item\.[^}]+\}/g, "x")));
      if (!declared || !p.sql) continue;
      const sql = p.sql.replace(/\s+/g, " ").trim();
      await this.define("DELETE program WHERE method = $method AND route = $route", { method: p.method.toUpperCase(), route: p.route });
      await this.define("CREATE program CONTENT $p", { p: { method: p.method.toUpperCase(), route: p.route, sql, status: p.status ?? 200,
        one: Boolean(p.one), witnesses: [], promoted: true, origin: "design", promoted_at: new Date(), created_at: new Date() } });
    }
  }

  async demote(id: RecordId, error: string) {
    await this.define("UPDATE $id MERGE { promoted: false, witnesses: [], demoted: $error }", { id, error });
  }

  async keepPhase(p: { path: string; intent: string; step: number; name: string; text: string; view?: unknown }) {
    await this.define("CREATE design_phase CONTENT $p", { p: { ...p, created_at: new Date() } });
  }

  /** The latest approved version of every phase on a path, and the intent it served. */
  async phasesOf(path: string) {
    const [rows] = await this.query<[{ intent: string; step: number; name: string; text: string; view?: View.Spec; created_at: string }[]]>(
      "SELECT intent, step, name, text, view, created_at FROM design_phase WHERE path = $path ORDER BY created_at DESC", { path });
    const latest = new Map<number, (typeof rows)[number]>();
    for (const r of rows) if (!latest.has(r.step)) latest.set(r.step, r);
    return { intent: rows[0]?.intent, phases: [...latest.values()].sort((a, b) => a.step - b.step) };
  }

  async teach(scope: string, instruction: string) {
    await this.define("CREATE teaching CONTENT $t", { t: { scope, instruction, created_at: new Date() } });
  }

  /** Every scope, grouped, oldest instruction first. */
  async taught(): Promise<Memory.Taught[]> {
    const [rows] = await this.query<[{ scope: string; instruction: string; created_at: unknown }[]]>(
      "SELECT scope, instruction, created_at FROM teaching ORDER BY scope, created_at");
    const byScope = new Map<string, Memory.Taught>();
    for (const r of rows) {
      const t = byScope.get(r.scope) ?? { scope: r.scope, instructions: [] };
      t.instructions.push({ instruction: r.instruction, at: String(r.created_at) });
      byScope.set(r.scope, t);
    }
    return [...byScope.values()];
  }

  async teachings(m: Memory.Match) {
    const [rows] = await this.query<[{ instruction: string }[]]>(
      "SELECT instruction, created_at FROM teaching WHERE scope = $scope ORDER BY created_at", { scope: `${m.method} ${m.path}` });
    return rows.map((r) => r.instruction);
  }

  /** Views are versioned: every edit is a new row, and the latest one renders. */
  async view(path: string) {
    const [rows] = await this.query<[{ spec: View.Spec }[]]>(
      "SELECT spec, created_at FROM view WHERE path = $path ORDER BY created_at DESC LIMIT 1", { path });
    return rows[0]?.spec;
  }

  /** The view for a concrete path: an exact one, else the latest view whose path is a matching template. */
  async viewFor(path: string): Promise<{ spec: View.Spec; params: Record<string, string>; path: string } | undefined> {
    const exact = await this.view(path);
    if (exact) return { spec: exact, params: {}, path };
    const [rows] = await this.query<[{ path: string; spec: View.Spec; created_at: string }[]]>(
      "SELECT path, spec, created_at FROM view WHERE string::contains(path, '{') ORDER BY created_at DESC");
    for (const r of rows) {
      const params = Memory.routeMatch(r.path, path);
      if (params) return { spec: r.spec, params, path: r.path };
    }
    return undefined;
  }

  async saveView(path: string, spec: View.Spec, origin: unknown) {
    await this.define("CREATE view CONTENT $v", { v: { path, spec, origin, created_at: new Date() } });
    Pulse.drafts.delete(path);
    Pulse.phases.delete(path);
    Pulse.emit("changed", { path });
  }

  async tokens() {
    const [rows] = await this.query<[{ tokens: Record<string, string> }[]]>(
      "SELECT tokens, created_at FROM theme ORDER BY created_at DESC LIMIT 1");
    return rows[0]?.tokens ?? {};
  }

  async saveTokens(tokens: Record<string, string>, origin: unknown) {
    await this.define("CREATE theme CONTENT $t", { t: { tokens, origin, created_at: new Date() } });
    Pulse.emit("changed", { path: "*" });
  }

  /** A system that was never told anything: no view, no teaching. */
  async empty() {
    const [[v], [t]] = await this.query<[{ n: number }[], { n: number }[]]>(
      "SELECT count() AS n FROM view GROUP ALL; SELECT count() AS n FROM teaching GROUP ALL;");
    return !v?.n && !t?.n;
  }

  /** Runs a view's data queries; a table that does not exist yet is an empty list, not an error. */
  /** Runs a view's data queries. A failing query is reported, never silently turned into an empty list. */
  async viewData(spec: View.Spec, params: Record<string, string> = {}) {
    const data: Record<string, unknown> = {};
    const errors: Record<string, string> = {};
    for (const [name, sql] of Object.entries(spec.data ?? {})) {
      try {
        const result = (await this.app(sql, params)) as unknown[];
        data[name] = result.at(-1) ?? [];
      } catch (e) {
        // A table nobody wrote to yet is not a broken view: it is an empty one.
        if (/does not exist/.test(String(e))) data[name] = [];
        else { data[name] = []; errors[name] = String(e); }
      }
    }
    return { data, errors };
  }

  /** The screens' side of the contract: every view query, so an operation writes rows the screens can read. */
  async contracts() {
    const [rows] = await this.query<[{ path: string; spec: View.Spec; created_at: string }[]]>(
      "SELECT path, spec, created_at FROM view ORDER BY created_at DESC");
    const latest = new Map<string, View.Spec>();
    for (const r of rows) if (!latest.has(r.path)) latest.set(r.path, r.spec);
    return [...latest].map(([path, spec]) => ({
      view: path, reads: spec.data ?? {},
      actions: Object.values(spec.elements).flatMap((e) => (e.action ? [`${e.action.method} ${e.action.path}`] : [])),
    }));
  }

  /** The journey since the last acceptance of a path: every version and the words that produced it. */
  async journey(path: string) {
    const [[last]] = await this.query<[{ created_at: string }[]]>(
      "SELECT created_at FROM acceptance WHERE path = $path ORDER BY created_at DESC LIMIT 1", { path });
    const [views] = await this.query<[{ id: RecordId; spec: View.Spec; origin: any; created_at: string }[]]>(
      "SELECT id, spec, origin, created_at FROM view WHERE path = $path AND created_at > $since ORDER BY created_at",
      { path, since: last?.created_at ? new Date(last.created_at) : new Date(0) });
    return views;
  }

  async accept(path: string, turns: number, corrections: number, view: RecordId | undefined, preferences: RecordId[]) {
    await this.query("CREATE acceptance CONTENT $a",
      { a: { path, turns_to_accept: turns, corrections_to_accept: corrections, view, preferences, created_at: new Date() } });
  }

  async prefer(p: { scope: string; rule: string; confidence: number; evidence: string[] }, from: RecordId[]) {
    const [[row]] = await this.define<[[{ id: RecordId }]]>("CREATE preference CONTENT $p",
      { p: { ...p, derived_from: from, created_at: new Date() } });
    return row.id;
  }

  async preferences() {
    const [rows] = await this.query<[{ scope: string; rule: string; confidence: number }[]]>(
      "SELECT scope, rule, confidence, created_at FROM preference ORDER BY created_at");
    return rows;
  }

  async views() {
    const [rows] = await this.query<[{ path: string; versions: number }[]]>(
      "SELECT path, count() AS versions FROM view GROUP BY path");
    return rows;
  }

  async capabilities() {
    const [rows, programs] = await this.query<[unknown[], unknown[]]>(
      "SELECT match, behavior FROM capability; SELECT method, route, sql, promoted, array::len(witnesses) AS witnesses, array::len(runs ?? []) AS runs, demoted FROM program;");
    return { static: rows, programs };
  }

  /** The narrow surface /_mcp is allowed to touch. */
  port(request: Mcp.SystemPort["request"], prompts: Record<string, string>): Mcp.SystemPort {
    return {
      request, prompts,
      schema: () => this.app("INFO FOR DB"),
      views: () => this.views(),
      view: (path) => this.view(path),
      journey: (path) => this.journey(path),
      preferences: () => this.preferences(),
      capabilities: () => this.capabilities(),
      query: (sql) => this.app(sql),
      teach: (scope, instruction) => this.teach(scope, instruction),
      teachings: () => this.taught(),
      prefer: (p) => this.prefer({ confidence: 0.8, evidence: ["mcp"], ...p }, []),
      design: async (path) => ({ phase: Pulse.phases.get(path) ?? null, waiting: Pulse.gates.has(path), draft: Pulse.drafts.get(path)?.spec ?? null }),
      sketch: async (path, view, note) => {
        const previous = Pulse.drafts.get(path)?.spec;
        Pulse.drafts.set(path, { spec: view as View.Spec, previous });
        Pulse.emit("draft", { path, note, template: path.includes("{") });
      },
    };
  }

  async system() {
    const [capabilities, learnings, operations] = await this.query<[unknown[], unknown[], unknown[]]>(
      `SELECT match, behavior, evolved_from FROM capability;
       SELECT match, behavior, learned_from FROM learning;
       SELECT method, path, status, resolved_by, created_at FROM operation ORDER BY created_at DESC LIMIT 20;`);
    const [acceptances] = await this.query<[unknown[]]>(
      "SELECT path, turns_to_accept, corrections_to_accept, created_at FROM acceptance ORDER BY created_at");
    return { acceptances, preferences: await this.preferences(), capabilities, learnings, recent_operations: operations };
  }
}

export namespace Memory {
  export type Match = { method: string; path: string };
  /** A scope and everything it was taught, oldest first: teach appends, so the last instruction is the rule. */
  export type Taught = { scope: string; instructions: { instruction: string; at: string }[] };
  export type Behavior = { type: "static_response"; status: number; body: unknown; content_type?: string };
  /** The deterministic version of an operation family: what an <app>.ts will one day declare by hand. */
  export type Program = { route: string; sql: string; status: number; one?: boolean };
  export type Resolution = { status: number; body: unknown; content_type?: string; by: string };

  /**
   * The one place that decides where a system's rows live. Every system has its own embedded SurrealDB, never a
   * shared server: --db wins, --new is `.system/` in the current directory, and otherwise the framework's `.run/`.
   * When `serve <app>.ts` reads the app, its store is born beside that file, and this is the line that changes.
   */
  export function address(o: { db?: string; fresh: boolean; cwd: string }) {
    return o.db ?? `surrealkv://${o.fresh ? `${o.cwd}/.system/system.skv` : `${import.meta.dirname}/.run/backend.skv`}`;
  }

  /** RecordId and friends stringify as objects; a record id on the wire is "table:id". */
  export function jsonSafe(v: unknown): unknown {
    // A program whose last statement returns nothing leaves undefined, and JSON.stringify(undefined) is not JSON.
    if (v === undefined) return null;
    return JSON.parse(JSON.stringify(v, (_k, x) => (x instanceof RecordId ? String(x) : x)));
  }
}

/** What any open page hears: the agent started, the agent stopped, the system changed shape. */
export const Pulse = (() => {
  type Gate = { decision: "continue" | "revise" | "abort"; note?: string };
  const pulse = {
    clients: new Set<(chunk: string) => void>(),
    working: 0,
    /** The latest sketch per path, in memory only: a draft is a show, not a record. */
    drafts: new Map<string, { spec: View.Spec; previous?: View.Spec }>(),
    /** Interactive designs wait here after each phase until the owner says go on, or what to change. */
    gates: new Map<string, (d: Gate) => void>(),
    /** The latest phase event per path: what an MCP client reads to see the same fold the page shows. */
    phases: new Map<string, Record<string, unknown>>(),
    /** The operation the agent is on, so a page opened mid-run reads it too. */
    operation: undefined as Record<string, unknown> | undefined,

    wait(path: string): Promise<Gate> {
      return new Promise<Gate>((resolve) => pulse.gates.set(path, resolve));
    },

    emit(event: "working" | "idle" | "changed" | "gesture" | "draft" | "phase" | "gate" | "operation", data: object = {}): void {
      if (event === "operation") pulse.operation = data as Record<string, unknown>;
      if (event === "idle") pulse.operation = undefined;
      if (event === "phase") { const d = data as Record<string, unknown>; pulse.phases.set(String(d.path), { ...d, waiting: pulse.gates.has(String(d.path)) || Boolean(d.awaiting) }); }
      for (const send of pulse.clients) send(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    },

    subscribe(signal: AbortSignal): Response {
      const encoder = new TextEncoder();
      let send = (_chunk: string) => {};
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          send = (chunk) => { try { controller.enqueue(encoder.encode(chunk)); } catch { pulse.clients.delete(send); } };
          send(`event: ${pulse.working ? "working" : "idle"}\ndata: {}\n\n`);
          if (pulse.working && pulse.operation) send(`event: operation\ndata: ${JSON.stringify(pulse.operation)}\n\n`);
          // A page opened mid-design catches up: the last phase of every path, and whether it waits.
          // A phase outlives its design only by mistake: with no agent working, what is left is stale, and it would
          // cover the finished screen with "desenhando a tela" on every load.
          if (!pulse.working && pulse.gates.size === 0) pulse.phases.clear();
          for (const phase of pulse.phases.values()) send(`event: phase\ndata: ${JSON.stringify({ ...phase, awaiting: pulse.gates.has(String(phase.path)) || undefined })}\n\n`);
          pulse.clients.add(send);
        },
        cancel() { pulse.clients.delete(send); },
      });
      signal.addEventListener("abort", () => pulse.clients.delete(send));
      return new Response(stream, { headers: { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" } });
    },
  };
  // `bun --hot` runs this file again on every save; open pages, drafts and waiting gates must outlive that.
  const kept = globalThis as { stemPulse?: typeof pulse };
  return (kept.stemPulse ??= pulse);
})();

/** One long-lived ACP session that resolves operations nobody taught the backend yet. */
export class Interpreter {
  #conn: acp.ClientSideConnection;
  #sessionId: string;
  #cwd: string;
  #mcp?: string;
  toolCalls = 0;
  /** Reply text per session: fresh sessions run concurrently, and one buffer would mix their answers. */
  #text = new Map<string, string>();
  #queue: Promise<unknown> = Promise.resolve();
  readonly agent: string;

  private constructor(agent: string, conn: acp.ClientSideConnection, cwd: string) {
    this.agent = agent; this.#conn = conn; this.#cwd = cwd; this.#sessionId = "";
  }

  static PROMPT = `You are the runtime of a backend that has no code. You receive one HTTP
operation as JSON and decide how this backend answers it. The body may carry
"instructions" from the client. Do not use tools.

State lives in SurrealDB (SurrealQL). Tables you create are yours; never touch
operation, execution, learning or capability. Use INFO FOR DB to see what exists.
To run a query, reply with ONLY: {"query": "<SurrealQL>"}
and you will get its JSON result back. Repeat as needed.

When done, reply with ONLY one JSON object, no prose, no code fence:
{"status": <http status>, "content_type": "<mime>", "body": <json, or a string for non-JSON>, "side_effects": <bool>, "reusable": <bool>}
Honor the "accept" of the operation: text/html gets a complete HTML page as a string.
"teachings" are what the owner said this operation means; follow them.
"screens" are the views that exist: their "reads" are the exact queries they run. Write rows those queries will
return (same table, same field names), and answer the action paths they declare. "{$item.id}" in a path is the
record id as the screen read it.
"reusable" is true only when the same request must always get this exact answer
regardless of stored state.

When this operation is one of a FAMILY (same method, same route shape, different data or ids), also return
"program": the deterministic version of what you just did, so the next ones run without you:
{"route": "/todos/{id}/complete", "sql": "<SurrealQL>", "status": <http status>, "one": <bool>}
- "route" names path parameters with {braces}; the sql reads them as $id, and body.data fields as $data.<field>.
- Parameters are strings. A record id arrives as "table:id": use type::record($id).
- The response body is the result of the LAST statement ("one": true takes its first row).
- Write exactly what you wrote by hand, with the same fields and defaults, so the screens keep reading it.
Omit "program" when the answer needs judgement a query cannot make.`;

  /** How many query round trips one operation may take. */
  static MAX_TURNS = 8;

  static async start(agent: string, mcpUrl?: string) {
    let self: Interpreter | undefined;
    const { conn } = Acp.Agent.connect(agent, {
      async sessionUpdate({ sessionId, update }) {
        if (update.sessionUpdate === "agent_message_chunk" && update.content.type === "text" && self) {
          self.#text.set(sessionId, (self.#text.get(sessionId) ?? "") + update.content.text);
        }
        if (update.sessionUpdate === "tool_call" && self) self.toolCalls++;
      },
      // Only the system's own MCP may run; every built-in tool (Bash, Write, …) is refused.
      async requestPermission({ options, toolCall }) {
        const ours = /mcp__system__|system/.test(`${toolCall.title} ${JSON.stringify(toolCall.rawInput ?? "")}`);
        const allow = options.find((o) => o.kind === "allow_once");
        return ours && allow ? { outcome: { outcome: "selected", optionId: allow.optionId } } : { outcome: { outcome: "cancelled" } };
      },
    });
    await Acp.Agent.initialize(conn);
    const cwd = `${import.meta.dirname}/.run/agent`;
    process.getBuiltinModule("node:fs").mkdirSync(cwd, { recursive: true });
    self = new Interpreter(agent, conn, cwd);
    self.#mcp = mcpUrl;
    self.#sessionId = await self.open();
    return self;
  }

  /** No settings sources: the owner's output style and hooks must not leak into the JSON. */
  /** A design session reads and queries, but cannot send operations: designing must not write app data. */
  async open(designing = false) {
    const mcpServers = this.#mcp ? [{ type: "http" as const, name: "system", url: this.#mcp, headers: [] }] : [];
    const options = this.#mcp
      ? { settingSources: [], allowedTools: designing
            ? ["mcp__system__query", "mcp__system__sketch", "ListMcpResourcesTool", "ReadMcpResourceTool"]
            : ["mcp__system__query", "mcp__system__request", "mcp__system__teach", "ListMcpResourcesTool", "ReadMcpResourceTool"],
          disallowedTools: [...(designing ? ["mcp__system__request", "mcp__system__teach", "mcp__system__intent", "mcp__system__feedback", "mcp__system__accept"] : []), "Bash", "Write", "Edit", "Read", "Glob", "Grep", "WebFetch", "WebSearch", "Task", "NotebookEdit"] }
      : { settingSources: [] };
    const { sessionId } = await this.#conn.newSession({ cwd: this.#cwd, mcpServers, _meta: { claudeCode: { options } } });
    return sessionId;
  }

  /** Prompts are serialized: one session answers one operation at a time. */
  resolve(operation: object, execute: (sql: string) => Promise<unknown>) {
    return this.run(`${Interpreter.PROMPT}\n\nOPERATION ${JSON.stringify(operation)}`, execute) as Promise<{
      transcript: string[]; ms: number; answer: { status: number; body: unknown; content_type?: string; side_effects: boolean; reusable: boolean } }>;
  }

  static DESIGN = `You design views for a backend that has no code. Views are data, not HTML.
${View.Catalog.DOC}
${View.Catalog.TOKENS}
State lives in SurrealDB. To inspect it, reply with ONLY {"query": "<SurrealQL>"} (e.g. INFO FOR DB) and you get the result.
Actions may point at paths that do not exist yet: the backend resolves them on first use, with body {"data": {...form fields}}.
Prefer resource paths like POST /todos, POST /todos/{$item.id}/complete. Never touch the tables operation, execution, learning,
capability, teaching, view or theme. When done, reply with ONLY one JSON object, no prose, no fence:
{"view": <view>} to create or replace the view, or {"tokens": {...}} to change design tokens, or both.
What earlier designs got wrong, now rules of this kernel:
- Do what the intent literally asks for its structure: "grouped by project" is one section per project (a repeat over
  projects whose child list reads that project's rows), not a flat list with a project column.
- A list of labels is a Tag repeated over the labels, one chip each, color = a tone name (primary, success, warning,
  error, info, accent, neutral). Never join labels into one text.
- No vanity numbers: no Stat or Badge that only counts what the list right below already shows.
- Every action on every screen (the template views too) gets a program; a screen that works needs no agent to click.
- Seed only what the intent implies (e.g. one starter notebook), and say nothing about it in the UI.
- Form fields for relations use Select with options read from a data query; the program writes the record id.
If the "sketch" tool is available, build in public: first sketch the skeleton (root, layout and section ids, sections
still unwritten), then sketch again after writing each section, with a short "note" of what you are drawing. The
owner watches the page assemble. Always pass the path you were given in the task.
An app with more than one screen also returns "views": [{"path": "/notebooks/{id}", "view": <view>}], one per route template
its links point to; every one follows the same rules, and all their actions get programs.
With a view, also return "programs": one per action the view declares, so the screen works deterministically
from its first click: [{"method": "POST", "route": "/todos/{id}/complete", "sql": "<SurrealQL>", "status": 200, "one": true}]
- You wrote the view's "data" queries, so write rows they will read: same table, same fields, same defaults.
- {braces} in the route are path params read as $id; form fields are $data.<name>; a record id arrives as "table:id",
  use type::record($id). The response is the LAST statement's result.
"preferences" in the task are what this owner accepted before; apply the ones whose scope fits, before your own taste.`;

  /**
   * A new screen is designed in phases the owner watches: understand, plan, UX, skeleton, screen. Each phase is
   * one turn of the same session, announced on /_events; the skeleton is sketched by the runtime itself, so the
   * page assembles whether or not the agent remembers to call a tool. Small edits (feedback) skip the phases.
   */
  /** Set by the runtime: where a phase correction is stored as a preference. */
  static remember?: (p: { scope: string; rule: string; confidence: number; evidence: string[] }) => Promise<unknown>;
  /** Set by the runtime: every approved phase is kept, so a design can start again from any phase already lived. */
  static keep?: (p: { path: string; intent: string; step: number; name: string; text: string; view?: unknown }) => Promise<unknown>;

  /** Every phase text is read by a person with little attention: no obvious statements, no narration of the obvious. */
  static PHASE_RULE = `The owner reads this in one glance. Never state the obvious or narrate your process ("the database is empty",
"everything is born now", "I will", "let me"). No preamble, no restating the request. Only what the owner must see to approve.
A drawing says it exists: an entity in the erDiagram IS the table to create, so never write "will create". Mark only
what is not new — an entity or field that already exists and changes gets "(existente)" or "+ campo" in its name.`;

  static PHASES = [
    { name: "entendendo", ask: `PHASE 1 of 5 — understand. Apply every preference scoped "phase:entendendo" to how you write this. ${Interpreter.PHASE_RULE} Do not design yet. Reply ONLY {"text": "<Portuguese: one short first line naming what will exist, then 3-5 '- ' items of at most 8 words each, in spoken language>"}` },
    { name: "planejando", ask: `PHASE 2 of 5 — plan. Apply every preference scoped "phase:planejando". ${Interpreter.PHASE_RULE} Inspect the state if useful. Reply ONLY {"text": "<Portuguese markdown that fits one screen: sections '## Telas' and '## Ações' with 2-5 '- ' items of at most 10 words each; '## Eventos' with the 3-6 facts that prove the app works, each as '- ' + a PascalCase past-tense name and at most 6 words (e.g. '- TaskCreated: tarefa nova num projeto'); and '## Entidades' holding ONLY a fenced mermaid erDiagram of the entities with their key fields and relations (no prose)>"}` },
    { name: "pensando a UX", ask: `PHASE 3 of 5 — UX. Apply every preference scoped "phase:pensando a UX". ${Interpreter.PHASE_RULE} Reply ONLY {"text": "<Portuguese markdown that fits one screen: sections '## Hierarquia', '## Ação principal', '## Navegação', '## Vazios', each with 1-3 '- ' items of at most 12 words>"}` },
    { name: "esboçando", ask: `PHASE 4 of 5 — mockup. Reply ONLY {"text": "<one line>", "view": <the view with its layout, sections and their real elements written with short representative Portuguese text: titles, labels, placeholders, button names, and 2-3 example rows where a list goes, each at the size the real content will have; only what decides the structure: a list row carries its title and at most one secondary element, secondary actions stay out; no data queries, no repeat, no programs>}` },
  ];

  design(task: object, execute: (sql: string) => Promise<unknown>, phasedPath?: string, interactive = false,
      replay?: { from: number; phases: { step: number; name: string; text: string; view?: View.Spec }[] }) {
    return this.run(`${Interpreter.DESIGN}\n\nTASK ${JSON.stringify(task)}`, execute, true, Interpreter.checkView(execute), phasedPath, interactive, replay) as Promise<{
      transcript: string[]; ms: number; turns: number; tool_calls: number; answer: { view?: View.Spec; tokens?: Record<string, string>; programs?: (Memory.Program & { method: string })[] } }>;
  }

  static COMPILE = `You compile a design journey into preferences. You get every version of a view in order,
each with the owner's instruction that produced it, and the last version is the one the owner accepted.
Find what the corrections have in common, not what each one said: what the owner kept removing, adding
or changing, and what the first draft got wrong that the accepted one got right.
Write rules a designer can apply to a DIFFERENT page tomorrow, in terms of the view DSL and design tokens.
Scope each rule: "global" (any view), "kind:<landing|dashboard|form|…>", or "path:<path>" when it only
fits this page. Skip rules already in "existing". Evidence cites version numbers and instructions.
${View.Catalog.DOC}
Reply with ONLY: {"preferences": [{"scope": str, "rule": str, "confidence": 0..1, "evidence": [str]}]}`;

  compile(journey: object, execute: (sql: string) => Promise<unknown>) {
    return this.run(`${Interpreter.COMPILE}\n\nJOURNEY ${JSON.stringify(journey)}`, execute, true) as Promise<{
      transcript: string[]; ms: number; answer: { preferences?: { scope: string; rule: string; confidence: number; evidence: string[] }[] } }>;
  }

  static JUDGE = `You audit two views, A and B, against a list of preferences. You do not know how either was made.
For each preference that applies, decide whether each view complies. Judge the spec, not your taste.
${View.Catalog.DOC}
Reply with ONLY: {"a": [bool per preference, same order], "b": [bool per preference], "notes": str}`;

  judge(task: object) {
    return this.run(`${Interpreter.JUDGE}\n\nTASK ${JSON.stringify(task)}`, async () => ({ error: "no queries" }), true) as Promise<{
      transcript: string[]; ms: number; answer: { a: boolean[]; b: boolean[]; notes: string } }>;
  }

  /**
   * One exchange with the agent. Operations share the long-lived session; design, compile and judge
   * each open a FRESH one, so nothing crosses between tasks except what the database hands over.
   */
  /** A view is not done until every data query runs; the error goes back to the same session. */
  static checkView(execute: (sql: string) => Promise<unknown>) {
    return async (answer: Record<string, unknown>) => {
      const spec = answer.view as View.Spec | undefined;
      if (!spec) return undefined;
      const problems: string[] = [];
      for (const [name, sql] of Object.entries(spec.data ?? {})) {
        await execute(sql).catch((e) => { if (!/does not exist/.test(String(e))) problems.push(`data.${name}: ${e}`); });
      }
      for (const [id, el] of Object.entries(spec.elements ?? {})) {
        if (!(el.type in View.Catalog.components)) problems.push(`elements.${id}: unknown type ${el.type}`);
        for (const c of el.children ?? []) if (!spec.elements[c]) problems.push(`elements.${id}: child ${c} does not exist`);
      }
      if (!spec.elements?.[spec.root]) problems.push(`root ${spec.root} does not exist`);
      return problems.length ? `The view is invalid, fix it and reply with the whole JSON again:\n${problems.join("\n")}` : undefined;
    };
  }

  run(first: string, execute: (sql: string) => Promise<unknown>, fresh = false,
      check?: (answer: Record<string, unknown>) => Promise<string | undefined>, phasedPath?: string, interactive = false,
      replay?: { from: number; phases: { step: number; name: string; text: string; view?: View.Spec }[] }) {
    const work = async () => {
      if (Pulse.working++ === 0) Pulse.emit("working", { task: first.slice(0, 40) });
      try { return await run(); } finally { if (--Pulse.working === 0) Pulse.emit("idle"); }
    };
    const run = async () => {
      const session = fresh ? await this.open(true) : this.#sessionId;
      // A fresh session is a live `claude` process until closed: without this, every design task leaked one.
      try {
        if (!phasedPath) return await this.turns(session, first, execute, check);
        const started = Date.now();
        let prefix = `${first}\n\n`;
        const intentText = String((first.match(/"intent":"([^"]*)"/) ?? [])[1] ?? "");
        for (const [i, phase] of Interpreter.PHASES.entries()) {
          // Replay: a phase before "from" is not asked again — its approved text is handed to the agent and shown as done.
          const kept = replay && i + 1 < replay.from ? replay.phases.find((p) => p.step === i + 1) : undefined;
          if (kept) {
            prefix += `Phase ${i + 1} (${phase.name}) is already approved by the owner, use it as is:\n${kept.text}\n${kept.view ? `VIEW ${JSON.stringify(kept.view)}\n` : ""}\n`;
            if (kept.view) { Pulse.drafts.set(phasedPath, { spec: kept.view }); Pulse.emit("draft", { path: phasedPath, note: kept.text }); }
            Pulse.emit("phase", { path: phasedPath, name: phase.name, step: i + 1, total: Interpreter.PHASES.length + 1, text: kept.text, done: true });
            continue;
          }
          Pulse.emit("phase", { path: phasedPath, name: phase.name, step: i + 1, total: Interpreter.PHASES.length + 1 });
          let ask = prefix + phase.ask;
          prefix = "";
          // Interactive: the phase is shown whole and the design waits. "revise" re-runs the same phase with the note.
          for (;;) {
            const { answer } = await this.turns(session, ask, execute);
            const text = typeof answer.text === "string" ? answer.text : "";
            if (answer.view) {
              const previous = Pulse.drafts.get(phasedPath)?.spec;
              Pulse.drafts.set(phasedPath, { spec: answer.view as View.Spec, previous });
              Pulse.emit("draft", { path: phasedPath, note: text || phase.name });
            }
            Pulse.emit("phase", { path: phasedPath, name: phase.name, step: i + 1, total: Interpreter.PHASES.length + 1, text, done: true, awaiting: interactive });
            if (!interactive) break;
            const gate = await Pulse.wait(phasedPath);
            if (gate.decision === "abort") throw new Error("design restarted from another phase");
            if (gate.decision === "continue") {
              await Interpreter.keep?.({ path: phasedPath, intent: intentText, step: i + 1, name: phase.name, text, view: answer.view });
              break;
            }
            Pulse.emit("phase", { path: phasedPath, name: `${phase.name} de novo`, step: i + 1, total: Interpreter.PHASES.length + 1 });
            ask = `The owner read your ${phase.name} and asks: "${gate.note ?? ""}". Redo ${phase.ask}`;
            // A correction to how a phase is written is a preference for that phase in every future design.
            if (gate.note) await Interpreter.remember?.({ scope: `phase:${phase.name}`, rule: gate.note, confidence: 0.8, evidence: [`refazer em ${phasedPath}`] });
          }
        }
        // Phase 5 fills the skeleton one section at a time, and the page shows each section as it lands,
        // instead of waiting for the whole screen. Only the wiring (programs, template views) comes at the end.
        const draft = Pulse.drafts.get(phasedPath)?.spec;
        const containers = new Set(["Card", "List", "Stack", "Sidebar", "Form", "Split", "Page"]);
        const pending: string[] = [];
        const walk = (id: string) => {
          const el = draft?.elements?.[id];
          if (!el) { pending.push(id); return; }
          const kids = el.children ?? [];
          if (containers.has(el.type) && kids.length === 0 && el.type !== "Page") pending.push(id);
          kids.forEach(walk);
        };
        if (draft) walk(draft.root);
        let view: View.Spec | undefined = draft ? structuredClone(draft) : undefined;
        if (view && pending.length && pending.length <= 12) {
          for (const [k, id] of pending.entries()) {
            const title = String((view.elements[id]?.props as { title?: string } | undefined)?.title ?? id);
            Pulse.emit("phase", { path: phasedPath, name: `desenhando ${title}`, step: 5, total: 5 });
            const { answer } = await this.turns(session, `PHASE 5 of 5 — section ${k + 1} of ${pending.length}: "${id}" (${title}). ` +
              `Write this section only. Reply ONLY {"text": "<one line>", "elements": {"${id}": <the element with its children ids>, <every descendant>}, "data": {<queries it reads>}}`, execute);
            const previous = view;
            view = { ...view, data: { ...(view.data ?? {}), ...((answer.data as Record<string, string>) ?? {}) },
              elements: { ...view.elements, ...((answer.elements as Record<string, View.Spec["elements"][string]>) ?? {}) } };
            Pulse.drafts.set(phasedPath, { spec: view, previous });
            Pulse.emit("draft", { path: phasedPath, note: typeof answer.text === "string" ? answer.text : title });
          }
          Pulse.emit("phase", { path: phasedPath, name: "ligando as ações", step: 5, total: 5 });
          const wiring = await this.turns(session, `FINAL — the assembled view is below. Reply ONLY {"programs": [...one per action of every screen...], ` +
            `"views": [{"path": "/x/{id}", "view": <view>}] for the route templates its links point to (empty if none)}.\nVIEW ${JSON.stringify(view)}`, execute);
          const answer = { view, programs: wiring.answer.programs, views: wiring.answer.views } as Record<string, unknown>;
          const problem = check ? await check(answer) : undefined;
          if (!problem) return { ...wiring, answer, ms: Date.now() - started };
          const fixed = await this.turns(session, `${problem}\nReply with the whole final JSON (view, programs, views).`, execute, check);
          return { ...fixed, ms: Date.now() - started };
        }
        Pulse.emit("phase", { path: phasedPath, name: "desenhando a tela", step: 5, total: 5 });
        const last = await this.turns(session, "PHASE 5 of 5 — the screen. Now reply with the final JSON exactly as the instructions specify (view, programs, views).", execute, check);
        return { ...last, ms: Date.now() - started };
      }
      finally { if (fresh) await this.#conn.closeSession({ sessionId: session }).catch(() => undefined); }
    };
    // Only the shared session needs a queue. A fresh session is independent, and queueing it would
    // deadlock: a designer that calls the request tool starts an operation that waits behind itself.
    return fresh ? work() : this.enqueue(work);
  }

  enqueue<T>(work: () => Promise<T>) {
    const next = this.#queue.then(work, work);
    this.#queue = next.catch(() => {});
    return next;
  }

  async turns(session: string, first: string, execute: (sql: string) => Promise<unknown>,
      check?: (answer: Record<string, unknown>) => Promise<string | undefined>) {
    {
      const started = Date.now();
      const transcript: string[] = [];
      let message = this.#mcp
        ? `${first}\n\nTOOLS: this session has the "system" MCP server. Do NOT reply with {"query"}: read its resources and use its tools, then reply with the final JSON only.`
        : first;
      const calls = this.toolCalls;
      for (let turn = 0; turn < Interpreter.MAX_TURNS; turn++) {
        const reply = Interpreter.parse(await this.ask(session, message));
        transcript.push(message, JSON.stringify(reply));
        if (typeof reply.query !== "string") {
          const problem = check && turn < Interpreter.MAX_TURNS - 1 ? await check(reply) : undefined;
          if (problem) { console.error("[design] rejected:", problem); message = problem; continue; }
          return { transcript, ms: Date.now() - started, turns: turn + 1, tool_calls: this.toolCalls - calls, answer: reply as any };
        }
        const result = await execute(reply.query).catch((e) => ({ error: String(e) }));
        message = `RESULT ${JSON.stringify(result)}`;
      }
      throw new Error(`agent took more than ${Interpreter.MAX_TURNS} turns`);
    }
  }

  async ask(sessionId: string, text: string) {
    this.#text.set(sessionId, "");
    await this.#conn.prompt({ sessionId, prompt: [{ type: "text", text }] });
    const reply = this.#text.get(sessionId) ?? "";
    this.#text.delete(sessionId);
    return reply;
  }

  /** The first complete JSON object in the reply; agents sometimes send two, or prose around one. */
  static parse(raw: string): Record<string, unknown> {
    for (let start = raw.indexOf("{"); start >= 0; start = raw.indexOf("{", start + 1)) {
      let depth = 0, inString = false, escaped = false;
      for (let i = start; i < raw.length; i++) {
        const ch = raw[i];
        if (inString) { if (escaped) escaped = false; else if (ch === "\\") escaped = true; else if (ch === '"') inString = false; continue; }
        if (ch === '"') inString = true;
        else if (ch === "{") depth++;
        else if (ch === "}" && --depth === 0) {
          try { return JSON.parse(raw.slice(start, i + 1)); } catch { break; }
        }
      }
    }
    throw new Error(`no JSON object in agent reply: ${raw.slice(0, 200)}`);
  }
}

/** Every method on every path lands here, in the order a request would hit them. */
export namespace Server {
  export type Options = {
    /** The <app>.ts that will define the system; carried, not read yet. */
    app?: string;
    db: string;
    port: number;
    agent: string;
    tools: string;
    slug?: string;
    open: boolean;
  };

  export async function serve(o: Options) {
    // `bun --hot` runs this file again on save: the process keeps its database, its agent and its port, and only
    // the handler is swapped, so a Kernel or View change shows on reload without restarting a design in progress.
    const kept = globalThis as { stem?: { server: ReturnType<typeof Bun.serve>; memory: Memory; agent: Promise<Interpreter> } };
    if (kept.stem) {
      kept.stem.server.reload({ fetch: app(kept.stem.memory, kept.stem.agent).fetch });
      console.error("stem reloaded");
      return;
    }
    const memory = await Memory.open(o.db);
    // idleTimeout 0: a design holds a request for minutes and /_events never ends, and Bun's default cuts both at 10 s.
    const server = Bun.serve({ port: o.port, idleTimeout: 0, fetch: () => new Response("starting", { status: 503 }) });
    const base = `http://localhost:${server.port}`;
    // The handler is live before the agent starts: its session connects to /_mcp as it opens.
    const agent = Interpreter.start(o.agent, o.tools === "mcp" ? `${base}/_mcp` : undefined);
    Interpreter.remember = (p) => memory.prefer(p, []);
    Interpreter.keep = (p) => memory.keepPhase(p);
    server.reload({ fetch: app(memory, agent).fetch });
    kept.stem = { server, memory, agent };
    const interpreter = await agent;
    console.error(`stem on :${server.port} · db ${o.db} · agent ${interpreter.agent} · tools ${o.tools}`);
    let url = `${base}/`;
    if (o.slug) {
      const slug = o.slug;
      url = `${await Caddy.publish(slug, Number(server.port))}/`;
      console.error(`published ${url}`);
      const leave = () => { void Caddy.unpublish(slug).finally(() => process.exit(0)); };
      process.on("SIGINT", leave).on("SIGTERM", leave);
    }
    if (o.open) process.getBuiltinModule("node:child_process").execFile("open", [url]);
  }

  export function app(memory: Memory, agent: Promise<Interpreter>) {
    const hono = new Hono();
    const port = memory.port(
      (method, path, body) => Promise.resolve(hono.request(path, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) })),
      { design: Interpreter.DESIGN, compile: Interpreter.COMPILE, judge: Interpreter.JUDGE, operate: Interpreter.PROMPT });

    hono.onError((e) => send(500, { error: String(e) }));
    hono.all("/_system", async () => send(200, await memory.system()));
    hono.post("/_teach", async (c) => {
      const { scope, instruction } = (await readBody(c.req.raw)) as { scope: string; instruction: string };
      await memory.teach(scope, instruction);
      return send(201, { scope, instruction });
    });
    hono.all("/_events", (c) => Pulse.subscribe(c.req.raw.signal));
    hono.post("/_gate", async (c) => {
      const { path = "/", decision = "continue", note } = ((await readBody(c.req.raw)) ?? {}) as { path?: string; decision?: "continue" | "revise"; note?: string };
      const open = Pulse.gates.get(path);
      if (!open) return send(409, { error: "nothing is waiting on " + path });
      Pulse.gates.delete(path);
      open({ decision, note });
      Pulse.emit("gate", { path, decision });
      return send(200, { path, decision });
    });
    hono.all("/_draft", (c) => {
      const draft = Pulse.drafts.get(new URL(c.req.url).searchParams.get("path") ?? "/");
      if (!draft) return send(404, { error: "no draft" });
      const fresh = Object.keys(draft.spec.elements ?? {}).filter((id) => !draft.previous?.elements?.[id]);
      return send(200, View.render(draft.spec, {}, {}, { fresh }), HTML);
    });
    // What a browser asks on its own is not an operation: without this, Safari's touch-icon probes woke the agent.
    hono.use(async (c, next) => {
      if (/^\/(favicon\.ico|apple-touch-icon[\w-]*\.png|robots\.txt|manifest\.json|\.well-known\/.*)$/.test(new URL(c.req.url).pathname)) return c.body(null, 204);
      await next();
    });
    // The design system catalog is the static Storybook build (`pnpm build-storybook -o storybook-static`).
    hono.all("/_ds", () => new Response(null, { status: 308, headers: { location: "/_ds/" } }));
    hono.all("/_ds/*", (c) => storybook(new URL(c.req.url).pathname));
    hono.all("/_design", async () => send(200, View.Shell({ title: "design system", body: View.render(View.DESIGN_SYSTEM.spec, View.DESIGN_SYSTEM.data), path: "/_design", tokens: await memory.tokens() }), HTML));
    hono.all("/_mcp", (c) => Mcp.SystemMcp.handle(port, c.req.raw));
    // A gesture that did not come from this page's own palette (the MCP, another tab) is replayed on
    // every open page, so whoever watches sees the menu open and the words being typed.
    for (const [route, gesture] of [["/_intent", intent], ["/_feedback", feedback], ["/_accept", accept]] as const) {
      hono.post(route, async (c) => {
        const body = ((await readBody(c.req.raw)) ?? {}) as Record<string, any>;
        if (c.req.header("x-origin") !== "palette") {
          Pulse.emit("gesture", { tool: route.slice(2), path: body.path ?? "/", text: body.intent ?? body.instruction ?? "", target: body.target });
        }
        return gesture(body);
      });
    }
    hono.post("/_judge", async (c) => judge(((await readBody(c.req.raw)) ?? {}) as Record<string, string>));
    hono.all("*", async (c) => {
      const url = new URL(c.req.url);
      const match = { method: c.req.method, path: url.pathname };
      if (match.method === "GET" && (c.req.header("accept") ?? "").includes("text/html")) return page(match.path);
      const body = await readBody(c.req.raw);
      const headers = Object.fromEntries(c.req.raw.headers);
      const op = await memory.record({ ...match, query: url.search, headers, body });
      try {
        const r = await resolve(op, match, body, headers, url.search);
        await memory.complete(op, r);
        // A write that landed changes what every open page shows: they develop in place, without a reload.
        if (match.method !== "GET" && r.status < 400) Pulse.emit("changed", { path: "*" });
        return send(r.status, r.body, r.content_type, { "x-operation": String(op), "x-resolved-by": r.by });
      } catch (e) {
        await memory.fail(op, String(e));
        return send(500, { error: String(e), operation: String(op) });
      }
    });
    return hono;

    /** A page is a stored view rendered with fresh data; the model only runs when there is no view yet. */
    async function page(path: string) {
      const found = await memory.viewFor(path);
      let spec = found?.spec;
      const params = found?.params ?? {};
      let by = found && found.path !== path ? `view ${found.path}` : "view";
      if (!spec && path === "/" && (await memory.empty())) { spec = View.BOOTSTRAP; by = "bootstrap"; }
      // An agent is already designing: show the blank page with the drafting pill instead of starting a second
      // design on this GET (which also held the request open for minutes).
      if (!spec && Pulse.working > 0) { spec = View.BOOTSTRAP; by = "designing"; }
      if (!spec) {
        const teachings = [...(await memory.teachings({ method: "SYSTEM", path: "" })), ...(await memory.teachings({ method: "GET", path }))];
        const { ms, answer } = await (await agent).design({ goal: `write the view for GET ${path}`, teachings, preferences: await memory.preferences() }, (sql) => memory.app(sql));
        if (!answer.view) return send(404, { error: `no view for ${path}` });
        spec = answer.view;
        await memory.saveView(path, spec, { kind: "first_visit", ms });
        by = `agent (${ms} ms)`;
      }
      const { data, errors } = await memory.viewData(spec, params);
      if (Object.keys(errors).length) console.error(`[view ${path}] query errors`, errors);
      const body = (Object.keys(errors).length
        ? `<div role="alert" class="alert alert-error m-4 text-sm">a view ${path} tem query quebrada: ${Object.keys(errors).join(", ")}</div>` : "")
        + View.render(spec, data, params);
      return send(200, View.Shell({ title: spec.title ?? path, body, path, tokens: await memory.tokens(), bootstrap: by === "bootstrap" }), HTML, { "x-resolved-by": by });
    }

    async function intent(body: { intent?: string; path?: string; preferences?: string; interactive?: boolean; from?: number }) {
      const { path = "/", preferences, from } = body;
      // Starting again from a phase already lived: the earlier approved phases come back, and a design waiting now is stopped.
      const lived = from ? await memory.phasesOf(path) : undefined;
      const intent = body.intent || lived?.intent;
      const interactive = Boolean(body.interactive || from);
      if (!intent) return send(400, { error: "intent is required" });
      if (from) { Pulse.gates.get(path)?.({ decision: "abort" }); Pulse.gates.delete(path); }
      await memory.teach("SYSTEM ", intent);
      const { ms, turns, tool_calls, answer } = await (await agent).design(
        { goal: `The owner just said what this should become. Write the view for GET ${path}.`, intent,
          preferences: preferences === "off" ? [] : await memory.preferences() },
        (sql) => memory.app(sql), path, interactive, from && lived ? { from, phases: lived.phases } : undefined);
      if (answer.view) await memory.saveView(path, answer.view, { kind: "intent", intent, ms, preferences: preferences !== "off" });
      // A design may also bring the views for its route templates (e.g. /notebooks/{id}).
      for (const extra of (answer as { views?: { path: string; view: View.Spec }[] }).views ?? []) {
        if (extra?.path && extra.view) await memory.saveView(extra.path, extra.view, { kind: "intent", intent, ms, template: true });
      }
      // Programs are matched against the actions of EVERY screen the design brought, not only the home:
      // the notebook screen's "add task" lives in the template view.
      await memory.adopt(answer.programs, answer.view, ((answer as { views?: { view: View.Spec }[] }).views ?? []).map((x) => x.view));
      if (answer.tokens) await memory.saveTokens(answer.tokens, { kind: "intent", intent });
      return send(200, { ms, turns, tool_calls, view: Boolean(answer.view), tokens: Boolean(answer.tokens) });
    }

    async function feedback({ path, target, instruction }: Record<string, string>) {
      // Feedback on /notebooks/notebook:x edits the /notebooks/{id} view it came from, not a new one.
      const found = await memory.viewFor(path);
      const current = found?.spec ?? View.BOOTSTRAP;
      const viewPath = found?.path ?? path;
      const { ms, answer } = await (await agent).design(
        { goal: "The owner pointed at an element and said what should change. Return the whole updated view, or tokens.",
          path, target, element: current.elements[target], instruction, view: current, tokens: await memory.tokens(),
          preferences: await memory.preferences() },
        (sql) => memory.app(sql));
      const origin = { kind: "feedback", target, instruction, ms };
      if (answer.view) await memory.saveView(viewPath, answer.view, origin);
      await memory.adopt(answer.programs, answer.view);
      if (answer.tokens) await memory.saveTokens({ ...(await memory.tokens()), ...answer.tokens }, origin);
      return send(200, { ms, view: Boolean(answer.view), tokens: Boolean(answer.tokens) });
    }

    /**
     * Acceptance closes a journey. Its length is the metric — prompts until the owner said yes —
     * and its corrections are compiled into scoped preferences that every later design task reads.
     */
    async function accept({ path = "/" }: { path?: string }) {
      const views = await memory.journey(path);
      if (!views.length) return send(400, { error: `nothing to accept at ${path}` });
      const steps = views.map((v, i) => ({
        version: i + 1, origin: v.origin, elements: Object.keys(v.spec.elements).length, spec: v.spec }));
      const { ms, answer } = await (await agent).compile({
        path, steps, existing: await memory.preferences() }, (sql) => memory.app(sql));
      const ids = views.map((v) => v.id);
      const created = [];
      for (const p of answer.preferences ?? []) created.push(await memory.prefer(p, ids));
      const turns = views.filter((v) => ["intent", "feedback"].includes(v.origin?.kind)).length;
      const corrections = views.filter((v) => v.origin?.kind === "feedback").length;
      await memory.accept(path, turns, corrections, views.at(-1)!.id, created);
      return send(200, { path, turns_to_accept: turns, corrections_to_accept: corrections, preferences: answer.preferences ?? [], ms });
    }

    /** Blind audit: the judge sees two first drafts as A and B in random order, and the preferences. */
    async function judge({ control, treatment }: Record<string, string>) {
      const preferences = await memory.preferences();
      const [c, t] = [await memory.view(control), await memory.view(treatment)];
      if (!c || !t) return send(400, { error: "both paths need a view" });
      const flip = Math.random() < 0.5;
      const { ms, answer } = await (await agent).judge({
        preferences: preferences.map((p) => `[${p.scope}] ${p.rule}`), a: flip ? t : c, b: flip ? c : t });
      const [ctl, trt] = flip ? [answer.b, answer.a] : [answer.a, answer.b];
      const score = (xs: boolean[] = []) => `${xs.filter(Boolean).length}/${preferences.length}`;
      return send(200, { control: score(ctl), treatment: score(trt), flip, notes: answer.notes, ms });
    }

    /**
     * capability → program → learning → agent, cheapest first. A program is the agent's own SurrealQL for a
     * family of operations; it runs without a model once the agent wrote the same one twice.
     */
    async function resolve(op: RecordId, match: Memory.Match, body: unknown, headers: Record<string, string>, query: string): Promise<Memory.Resolution> {
      const capability = await memory.find<{ id: RecordId; behavior: Memory.Behavior }>("capability", match);
      if (capability) return { ...staticBody(capability.behavior), by: String(capability.id) };

      const program = await memory.program(match);
      // A program answers the known shape. A request that brings new instructions is asking for something the
      // program was not written for, so the agent takes it.
      const instructed = typeof (body as { instructions?: unknown })?.instructions === "string" && (body as { instructions: string }).instructions.trim() !== "";
      if (program?.promoted && !instructed) {
        try {
          const started = Date.now();
          const result = (await memory.app(program.sql, { ...program.params, data: (body as any)?.data ?? {} })) as unknown[];
          const last = result.at(-1);
          const out = program.one && Array.isArray(last) ? last[0] : last;
          await memory.witness(program.id, op, "ran");
          return { status: program.status, body: out, by: `${program.id} (${Date.now() - started} ms)` };
        } catch (e) {
          // A program that breaks goes back to being a candidate; the agent answers this one.
          await memory.demote(program.id, String(e));
        }
      }

      const learning = await memory.find<Parameters<Memory["confirm"]>[1]>("learning", match);
      if (learning) {
        const promoted = await memory.confirm(op, learning);
        return { ...staticBody(learning.behavior), by: `${learning.id}${promoted ? " (promoted)" : ""}` };
      }

      const interpreter = await agent;
      const accept = headers.accept ?? "application/json";
      const teachings = await memory.teachings(match);
      // What the system believes this request is, shown on every open page while the agent works on it.
      const size = Object.entries((body ?? {}) as Record<string, unknown>)
        .filter(([, v]) => Array.isArray(v)).map(([k, v]) => `${(v as unknown[]).length} ${k}`).join(" \u00B7 ");
      const meaning = teachings.at(-1)?.split(/(?<=[.:])\s/)[0] ?? "rota que ningu\u00E9m ensinou: o agente vai deduzir";
      Pulse.emit("operation", { method: match.method, path: match.path, size, meaning: meaning.slice(0, 160) });
      const { transcript, ms, answer } = await interpreter.resolve(
        { ...match, accept, query, body, teachings, screens: await memory.contracts() }, (sql) => memory.app(sql));
      await memory.execution(op, interpreter.agent, transcript, ms);
      const written = (answer as { program?: Memory.Program }).program;
      if (written?.sql && written.route && Memory.routeMatch(written.route, match.path)) {
        await memory.propose(op, match.method, written);
      }
      if (answer.reusable && !answer.side_effects) {
        await memory.learn(op, match,
          { type: "static_response", status: answer.status, body: answer.body, content_type: answer.content_type });
      }
      return { status: answer.status, body: answer.body, content_type: answer.content_type, by: `agent (${ms} ms)` };
    }

    function staticBody(b: Memory.Behavior) { return { status: b.status, body: b.body, content_type: b.content_type }; }
  }

  const HTML = "text/html; charset=utf-8";

  function send(status: number, body: unknown, contentType = "application/json", headers: Record<string, string> = {}) {
    const raw = typeof body === "string" && !contentType.includes("json");
    return new Response(raw ? body : JSON.stringify(Memory.jsonSafe(body)), { status, headers: { ...headers, "content-type": contentType } });
  }

  async function readBody(req: Request): Promise<any> {
    const text = await req.text();
    if (!text) return null;
    // HTMX sends forms urlencoded: the fields are the operation's data, as the JSON clients send it.
    if (String(req.headers.get("content-type")).includes("application/x-www-form-urlencoded")) {
      const fields = Object.fromEntries(new URLSearchParams(text));
      return new URL(req.url).pathname.startsWith("/_") ? fields : { data: fields };
    }
    try { return JSON.parse(text); } catch { return text; }
  }

  async function storybook(pathname: string) {
    const { readFile } = process.getBuiltinModule("node:fs/promises");
    const { join } = process.getBuiltinModule("node:path");
    const root = join(import.meta.dirname, "storybook-static");
    const file = join(root, decodeURIComponent(pathname.slice("/_ds/".length)) || "index.html");
    if (!file.startsWith(root)) return new Response(null, { status: 403 });
    try {
      const types: Record<string, string> = { html: HTML, js: "text/javascript", mjs: "text/javascript", css: "text/css",
        json: "application/json", svg: "image/svg+xml", png: "image/png", woff2: "font/woff2", map: "application/json" };
      return new Response(await readFile(file), { headers: { "content-type": types[file.split(".").pop() ?? ""] ?? "application/octet-stream" } });
    } catch {
      return new Response("storybook not built: pnpm build-storybook -o storybook-static", { status: 404, headers: { "content-type": "text/plain" } });
    }
  }
}

/** The two verbs of the command line, parsed into what main() dispatches. */
export namespace Cli {
  export const USAGE = `usage:
  bun main.ts serve [<app>.ts] [--new] [--no-open] [--slug <name>] [--port <n>] [--db <url>] [--agent <cmd>] [--tools json|mcp]
  bun main.ts acp caps | list [--cwd <dir>|--all] | daemon [--cwd <dir>] [--session <id>] [--allow]`;

  export type Command =
    | { verb: "serve"; options: Server.Options }
    | { verb: "acp caps" | "acp list" | "acp daemon"; agent: string; cwd: string; all: boolean; session?: string; allow: boolean }
    | { verb: "usage" };

  export function parse(argv: string[]): Command {
    const [verb, ...rest] = argv;
    const valued = new Set(["--slug", "--port", "--db", "--agent", "--tools", "--cwd", "--session"]);
    const flag = (name: string) => { const i = rest.indexOf(name); return i >= 0 ? rest[i + 1] : undefined; };
    const positionals = rest.filter((a, i) => !a.startsWith("--") && !valued.has(rest[i - 1]));
    const agent = flag("--agent") ?? "claude-agent-acp";
    if (verb === "serve") {
      const slug = flag("--slug");
      const fresh = rest.includes("--new");
      return { verb, options: {
        app: positionals[0],
        db: Memory.address({ db: flag("--db"), fresh, cwd: process.cwd() }),
        port: Number(flag("--port") ?? (slug ? 0 : 3000)),
        agent, tools: flag("--tools") ?? "json", slug,
        open: fresh && !rest.includes("--no-open"),
      } };
    }
    const sub = `${verb} ${positionals[0]}`;
    if (sub === "acp caps" || sub === "acp list" || sub === "acp daemon") {
      return { verb: sub, agent, cwd: flag("--cwd") ?? process.cwd(), all: rest.includes("--all"), session: flag("--session"), allow: rest.includes("--allow") };
    }
    return { verb: "usage" };
  }
}

async function main() {
  const command = Cli.parse(process.argv.slice(2));
  switch (command.verb) {
    case "serve": return Server.serve(command.options);
    case "acp caps": return Acp.Commands.caps(command.agent);
    case "acp list": return Acp.Commands.list(command.agent, command.all ? undefined : command.cwd);
    case "acp daemon": return Acp.Commands.daemon(command.agent, command.cwd, command.session, command.allow);
    default: console.error(Cli.USAGE); process.exit(2);
  }
}

if (import.meta.main) main().catch((e) => { console.error(e); process.exit(1); });
