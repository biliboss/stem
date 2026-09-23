---
title: Mission
description: What Stem exists to do, for whom, and what stays out.
---

**Stem is the agent-first framework: an app that starts empty and is built by
its own agent, wherever it is not defined yet.** Every framework we use was
designed for someone who reads, types and waits for the build. Stem is designed
for the builder that does none of the three, and it ships with one.

It started as a question in a post (September 2026): what would a system look
like if it were designed, from the first file, to be built by an agent? The
answer so far is not a better saddle: it is an app that mutates itself where it
is undefined, and stops calling the model the moment it knows the answer.

## Who it is for

```
the agent        builds and changes the app — the built-in one, over ACP
the owner        says what they want; technical or not, through the kickstart
the developer    reaches the same doors by hand: the address bar, HTTP, app.ts
```

The owner is the one who decides. The agent never accepts a screen on their
behalf, and no button on a screen calls the model: only words the owner gave do.

## What it is

- **Two interactions.** Every route outside `/api` is a screen, declared once
  with `_meta`. Every route under `/api` is an endpoint that defines itself on
  the first call.
- **A built-in agent.** The app starts its own agent over ACP, on whatever
  harness speaks it, fenced to the app's own tools.
- **Agent memory.** What the agent learns lives in an embedded SurrealDB, one
  per app, not in its context — so harness and model are swappable.
- **A design system.** The agent composes only from a catalog of primitives on
  DaisyUI 5; the owner's corrections become preferences.
- **Single file.** One framework file, `stem.ts`; each app is `app.ts`, a
  `SKILL.md` and a database. What the app learns is data, never new files.

## The bet, and how it is judged

The agent runs only when a shape is missing; once it exists, a stored view
answers in ~3 ms and a promoted program in ~20 ms, with no model. If model cost
per request falls with use, Stem is software. If it never falls, it is an
expensive chat with a database. That curve is the measure the project is judged
by, and it has not been measured in public yet (`docs/EXPERIMENTS.md`).

## What stays out

- **A general web framework.** No routing layer to configure, no components to
  write by hand, no build step. If a feature does not fit the outline of
  `stem.ts`, it is a second system in disguise.
- **React or any client runtime.** Screens are server-rendered HTML swapped by
  HTMX; a runtime that must survive a swap is refused.
- **The outside MCP door, for now.** `/_mcp` feeds the built-in agent; as a way
  for outside agents to operate an app it adds nothing over HTTP and the skill
  yet, and sits in "coming soon".
- **A hosted platform.** Stem runs where you run it: one process, one database
  file. Deploy is a container, as the Via Corretor's `via-app` does today.
