---
title: stem new — validation
description: How we know `stem new` works and the branch can merge.
---

**The branch merges when a HOME with no Stem in it goes from one command to
the kickstart in one recorded take, and `just stem::test` is green.** Tests
prove the parts; the take proves the promise in the roadmap, and it is the
only proof that catches a path into this repo leaking into the package.

## The take

```
export HOME=$(mktemp -d)                  no ~/.claude/skills, no ~/.stem
cd $(mktemp -d)
bunx @biliboss/stem new todo --meta "a list of what I have to buy"
```

- [ ] exactly three questions asked (app name came as the positional, so
      account and Caddy are asked; `what` came from --meta and is skipped)
- [ ] `todo/` holds `app.ts`, `SKILL.md`, `.system/system.rocksdb` —
      nothing else
- [ ] `$HOME/.claude/skills/todo` resolves to `todo/SKILL.md`
- [ ] the browser opens on `/_stem`, and the what step shows the --meta text
- [ ] no path under `~/src/biliboss-mono` appears in the output or the files
      (`grep -r biliboss-mono todo/` → nothing)
- [ ] the terminal transcript and one capture of `/_stem` are attached to
      the PR; the capture is the only image, because only the eye judges it

## The gates

- [ ] `just stem::test` green, with new tests for parse, prompts and folder
- [ ] `just check` clean
- [ ] `stem check todo/app.ts` exits 0
- [ ] a second `new todo` in the same place exits 1 and touches nothing
- [ ] no TTY + a missing flag exits 1 naming the flag, never hangs
      (`CI=true` run in the transcript)

## Not proof

- "it works on my shell" from the mono checkout: the take must run the
  published package, not `bun apps/stem/stem.ts`
- a 200 from `/`: the kickstart redirect (302 `/_stem`) is what is claimed
