---
title: stem new — requirements
description: Scope, decisions and context for roadmap item 1, `stem new`.
---

**`bunx @biliboss/stem new <app>` asks four questions, writes an app folder,
links the skill globally and opens the browser on `/_stem`.** It is the door
in front of the kickstart: the kickstart assumes an app is already running,
and today getting one running takes a command with five flags and a path into
this repo (`bun ../../stem.ts serve --new --slug … --tools mcp --account …`).

## Decisions (23/09, the owner)

```
command      bunx @biliboss/stem new <app> [--meta "…"]
             `stem` is taken on npm (node-stem); the scope is ours.
             bunx, not npx: the bin is Bun (#!/usr/bin/env bun) and
             no Node launcher is written.
questions    1 app name / slug    folder name and <slug>.localhost
             2 account            which Claude subscription pays the agent
             3 what it is for     one sentence; seeds the kickstart's `what`
             4 publish on Caddy   <slug>.localhost, or a plain localhost port
#18          merged, partly: --meta "…" answers question 3 and skips it.
             The deterministic classifier and the Astro target stay OUT;
             #18 closes as merged into this phase.
proof        a temp HOME on this Mac, recorded in one take (validation.md)
```

## Scope

- **In.** The `new` verb in `Cli`; the prompts (skipped by flags:
  `--slug`, `--account`, `--meta`, `--caddy|--no-caddy`); the folder
  `<app>/` with `app.ts`, `SKILL.md` and `.system/`; the skill linked into
  `~/.claude/skills/<slug>`; `serve` started and the browser opened on
  `/_stem` with question 3 already answered; the package published as
  `@biliboss/stem` from the public repo.
- **Out.** `bun app.ts` booting on its own (roadmap item 2 — `new` still
  starts the app through `stem.ts serve`); the classifier and Astro from
  #18; a Node launcher for `npx`; any hosted deploy.

## Context the work depends on

- **The kickstart is not merged.** `/_stem` lives in the `stem-kickstart`
  worktree (w2 in progress). `new` can be written against it, but the
  end-to-end proof waits for that merge.
- **`--account` has no default by rule** (`apps/stem/CONTEXT.md`). `new`
  keeps the rule by asking; it never guesses `personal`.
- **The public repo is behind.** `biliboss/stem` is `just stem::export`
  (a `git subtree split`), last pushed 16/09, and its `package.json` is
  `private: true`. Publishing needs the export, `private` removed, a `bin`
  field, and `npm login` — this machine has none (`npm whoami` →
  `ENEEDAUTH`), so the publish is a human gesture.
- **`Memory.address` already knows the fresh layout**: `--new` means
  `<cwd>/.system/system.rocksdb`. `new` reuses it instead of inventing a path.
- **The app is data, not files** (mission). `new` writes the three files an
  app is and nothing else; no template gallery, no generated screens.
