---
title: stem new — plan
description: The work for roadmap item 1, as numbered task groups in order.
---

**Five groups, each closed by its own proof; group 5 is the one that closes
the roadmap item.** Groups 1–3 are code in `stem.ts` and can start before the
kickstart merges; 4 and 5 cannot.

```
1  the verb
   1.1  Cli.parse learns `new <app>` and its flags: --slug --account
        --meta --caddy|--no-caddy --no-open; USAGE lists them
   1.2  Cli.Command gains { verb: "new"; … }; parse is pure and tested
   1.3  a missing positional or an existing non-empty folder exits 1
        with one line saying which
   proof: bun test covers parse for every flag and both refusals

2  the four questions
   2.1  a prompt per question, asked only when its flag is absent;
        no TTY and a missing answer → exit 1 naming the flag
   2.2  account lists `personal` plus STEM_ACCOUNTS; no default chosen
   2.3  --meta answers question 3 and skips it
   proof: a test drives the prompts through stdin; one run with every
          flag asks nothing

3  the folder
   3.1  write app.ts (identity, empty teach and routes), SKILL.md (what
        the app is for, the /_mcp address, how to serve it), and create
        .system/ — through Memory.address, not a second path rule
   3.2  link SKILL.md into ~/.claude/skills/<slug>; an existing link to
        another folder is refused, not overwritten
   3.3  `stem check app.ts` passes on the written folder
   proof: test writes into a temp dir; `check` exits 0; the link resolves

4  up and open (needs stem-kickstart merged)
   4.1  new hands off to serve --new with the answers; Caddy only when
        question 4 said yes
   4.2  the kickstart's `what` step reads question 3 and opens filled
   4.3  the browser opens on /_stem, not on /
   proof: GET / → 302 /_stem; the what field carries the --meta text

5  published
   5.1  just stem::export; public package.json: name @biliboss/stem,
        bin stem, private removed
   5.2  npm login + npm publish — the owner's gesture
   5.3  the one-take run in validation.md
   5.4  roadmap: item 1 moves to Done with the proof; #18 closed as merged
   proof: validation.md, every line checked
```
