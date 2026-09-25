---
title: stem new — validation
description: How we know `stem new` works and the branch can merge.
---

**The branch merges when a HOME with no Stem in it goes from one command to
the kickstart in one recorded take, and `just stem::test` is green.** Tests
prove the parts; the take proves the promise in the roadmap, and it is the
only proof that catches a path into this repo leaking into the package.

## The take

Run 25/09 (reviewer), after pushing the split `2e2f04c` to `biliboss/stem`
main, with its own HOME, cwd and TMPDIR; transcript in `take-25-09.txt`.
The take FAILS: after the two questions and the folder, `serve` dies with
`Cannot find module '@surrealdb/node'` — `stem.ts` imports it and the
package's `dependencies` omit it (the mono supplies it from the root).

```
export HOME=$(mktemp -d)                  no ~/.claude/skills, no ~/.stem
cd $(mktemp -d)
bunx github:biliboss/stem new todo --meta "a list of what I have to buy"
```

- [ ] exactly three questions asked (app name came as the positional, so
      account and Caddy are asked; `what` came from --meta and is skipped)
      — 25/09: account and Caddy asked, `what` skipped; left open because
      the run died before `serve`
- [ ] `todo/` holds `app.ts`, `SKILL.md`, `.system/system.rocksdb` —
      nothing else — 25/09: `.system/` empty, no `system.rocksdb`
- [ ] `$HOME/.claude/skills/todo` resolves to `todo/SKILL.md` — 25/09: the
      link resolves to the `todo/` folder, not the file; not measured end to end
- [ ] the browser opens on `/_stem`, and the what step shows the --meta text
      — not measured: the server never came up
- [ ] no path under `~/src/biliboss-mono` appears in the output or the files
      (`grep -r biliboss-mono todo/` → nothing) — 25/09: grep exit 1 on the
      files; the run is incomplete, so the box stays open
- [ ] the terminal transcript and one capture of `/_stem` are attached to
      the PR; the capture is the only image, because only the eye judges it
      — not measured: no `/_stem` to capture

## The gates

- [x] `just stem::test` green, with new tests for parse, prompts and folder
      — 25/09, after merging main (`4fd806b`): `32 pass · 0 fail`, 4 files;
      `tests/apps/stem/new.spec.ts` holds the parse, prompt and folder tests
- [x] `just check` clean — 25/09, `4fd806b`: exit 0, `catraca ok: nada piorou`
- [x] `stem check todo/app.ts` exits 0 — 25/09, on a folder from `new` in a
      temp HOME: `rules ok`, exit 0; control: a broken `app.ts` gave exit 1
      (`Unexpected end of file`), restored gave 0
- [x] a second `new todo` in the same place exits 1 and touches nothing —
      25/09: `…/todo already exists and is not empty`, exit 1; shasum of the
      files identical before and after
- [x] no TTY + a missing flag exits 1 naming the flag, never hangs
      (`CI=true` run in the transcript) — 25/09, `CI=true … new shop` without
      `--account`, stdin `/dev/null`: `--account is required: no answer, and
      no terminal to ask`, exit 1, no `shop/` written

## Not proof

- "it works on my shell" from the mono checkout: the take must run the
  published package, not `bun apps/stem/stem.ts`
- a 200 from `/`: the kickstart redirect (302 `/_stem`) is what is claimed
