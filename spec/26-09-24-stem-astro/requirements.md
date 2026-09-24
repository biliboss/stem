---
title: stem-astro — requirements
description: Scope, decisions and context for the Astro projection, issue #23.
---

**Stem gains a second surface: the public pages of an app — a landing and a
blog — are projected from Stem into an Astro project that builds them static,
while the app's own screens stay on `View.Shell`.** Each case gets the tool
that is best at it: Stem owns the content and the agent that writes it, and
Astro owns the page a visitor and a search engine read. The Via Corretor is
the first case: `viacorretor.com.br` from `apps/via-app`, not from a separate
hand-kept `apps/via-landing-blog`.

## The request

> "new spec for the new landing page and blog, using apps/via-app stem > astro
> version.
>
> stem framework, should use the best for each case, LP and Blogs, Astro is the
> lead, so we need to enhance the stem, in order to be able to do this."
> — Gabriel, 24/09

## Decisions (pending — the owner decides at the gate)

```
reading      "stem > astro": Stem is the source, Astro is the output.
             Not Astro importing Stem at runtime, not Stem imitating Astro.
lead         Astro renders LP and blog: static HTML, MDX, collections,
             sitemap, canonical, JSON-LD. View.Shell never serves a
             public page (landing-lighthouse.md: Shell is the worst of
             three for Lighthouse 100)
content      a post and a landing section are Stem records; the
             projection writes them as the Astro content collection
             (.mdx + frontmatter, the schema already in content.config.ts)
kit          the vc-* Lit kit stays as the client script; it costs 0
             points (measured, landing-lighthouse.md)
mission      "no build step" becomes "no build step for the app's
             screens"; the public surface is built, by Astro, outside
             stem.ts. The single-file rule holds for the kernel
```

## Scope

- **In.** A projection verb in Stem (`stem project astro <out>` or the like)
  that writes an Astro project from the app's records; the landing's 12
  sections and the 27 posts imported into `via-app` as records; the build
  reproducing today's `via-landing-blog` output — same URLs without trailing
  slash, canonical, JSON-LD, sitemap; the four Lighthouse fixes (lazy below the
  fold, font off the critical path, favicon, `<main>` in the post); the
  mission and tech-stack amended.
- **Out.** Switching `viacorretor.com.br` off galgal's Next.js (production
  today; a cutover is its own feature); a container for the landing; RSS; the
  agent writing posts on its own; any other app's public pages.

## Context

- **Stem cannot serve a public page today.** `Shell` sets only charset,
  viewport and title (`stem.ts:982-984`); no canonical, og, JSON-LD or sitemap
  exists, and `robots.txt` answers 204 (`:3617-3620`). It loads Tailwind as a
  synchronous browser runtime and DaisyUI from a CDN (`:984-986`), 71 + 98 KB
  gz. `Image` is always lazy with no size (`:817-818`).
- **The Astro site already exists.** `apps/via-landing-blog`: static, `site:
  https://viacorretor.com.br`, `trailingSlash: "never"`, MDX and sitemap
  (`astro.config.mjs:19-31`); 27 `.mdx` posts with no imports or JSX, zod
  schema at `src/content.config.ts:19-61`; SEO in `Base.astro:27-63` and
  `src/lib/jsonld.ts:14-60`. It has no Dockerfile and no CI job
  (`.github/workflows/viacorretor.yml:135-139`).
- **This was already planned.** `.data/projects/034_via-corretor/via-no-stem.md:73-76`,
  item 10: "landing e blog como projeção Astro gerada pelo Stem … O View.Shell
  do Stem não serve a página pública." The owner's direction, 14/09: "tudo vem
  para o viacorretor via stem" (`:3-4`).
- **Mission conflict.** `mission.md` keeps out "a general web framework… no
  build step". This feature moves that line, so it is decided here, not in
  the build.
- **Not verified.** Where a Stem record for a post should live (a `post` table
  or a generic content table); whether the projection runs on each change or on
  demand; the 28 indexed URLs match the 27 posts + landing one-to-one.
- **No prototype.** The pages already exist in Figma and in
  `via-landing-blog`; this feature changes how they are produced, not how they
  look.
