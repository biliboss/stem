---
title: the kickstart — requirements
description: Scope, decisions and context for the kickstart, issue #22.
---

**An empty Stem app no longer shows a blank page: `/` redirects to `/_stem`,
a guided screen that takes a non-technical person from what they want to a
working screen.** Five steps — what, why, plan, pick a layout, done — and
after them `/_stem` becomes the overview of the app.

## Decisions (23/09, the owner)

```
prototype   design/kickstart.html, one URL per step (?step=1…5), approved
steps       1 what   interface · process · business model, in their words
            2 why    three reasons written from the first answer
            3 plan   WHY · HOW · WHAT before anything exists
            4 pick   three layouts of the component, with sample data
            5 done   the screen live, and the log: designed, program written
                     with it, cached
after       /_stem turns into the overview: screens, API, how to grow it
cost        the steps that need a model go through the embedded agent and
            show what they cost
```

## Scope

- **In.** `/_stem` in the kernel with the five steps; `GET /` on an empty
  system → 302 `/_stem`; the agent parts (why, plan, layouts) and the build;
  the after state; the quickstart rebuilt on the six screens (bili-docs).
- **Out.** Getting an app running in the first place (`stem new`, roadmap
  item 1); automating a process (roadmap, Later); cheaper answer sessions.

## Context

- Before this, the blank page taught `?_meta` and `curl`: only someone who
  already speaks HTTP got past it.
- The owner's request is recorded as issue #22 (`Project: Stem - Kickstart -
  Stakeholder: Gabriel`); no verbatim text of it exists outside that issue.
