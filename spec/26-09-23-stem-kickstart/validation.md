---
title: the kickstart — validation
description: How we know the kickstart works and the branch can merge.
---

**The branch merges when an empty app goes from `/` to a real screen through
`/_stem` in one live run, and `just stem::test` is green.** The tests prove
the redirect and the pages without a model; only the live run proves the
agent steps.

## The take

On an empty app (`/tmp/hello_world`, port 5341, `--new`), by the agent that
built it; the encoded-path line was re-checked by the parent session.

- [x] "`/` redirects to `/_stem`": `curl /` → 302 `/_stem`, with and without
      `Accept: text/html`; the page asks "What should hello_world do?"
- [x] "five steps": all six states at 1280 and 390, no horizontal overflow
      in any of the 12 captures (`/tmp/kickstart-kernel-<state>-<width>.png`)
- [x] "three layouts of the component": three, different in structure;
      "Two columns" picked
- [x] "the screen live, and the log": build 579 s to a real `/todos`, three
      programs written with it, design $0.77
- [x] "show what they cost": why $0.29 · plan $0.30 · layouts $0.38; the
      overview says 1 screen · 4 endpoints · $2.65
- [x] "the overview: screens, API": no duplicate endpoint for an encoded
      path — `/api/todos/{id}` once, `%7Bid%7D` absent from `/_stem`

## The gates

- [x] `just stem::test` 22 pass, 0 fail (kickstart.spec.ts: 10 tests, none
      calls the model)
- [x] the redirect test fails when the redirect is off: 9 pass, 1 fail;
      restored to 22/0
- [x] `tsc --noEmit` 0 errors
- [ ] one capture of `/_stem` attached to the PR — not attached yet

## Not proof

- a 200 from `/_stem` on a system that already has a view: the claim is the
  302 from `/` on an EMPTY one
- the prototype in design/: it shows the steps, not the kernel serving them

## Left open

- step 5's header already says "Overview", because the system stops being
  empty mid-flow
- `GET /api/todos` is listed as "Program for …" in step 5's log
