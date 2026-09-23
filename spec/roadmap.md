---
title: Roadmap
description: What is done, what is being built, and what comes next — each item closed by proof.
---

**The next milestone is the first five minutes: an empty app that walks a
non-technical owner from what they want to a working screen.** Everything the
kernel needs for that is in place except the kickstart itself. An item closes
with proof — command output, a row, a capture — never with "it works".

## Done

```
_meta, the one declaration        a screen declared once, answered from cache after
programs (H3, H4)                 repeated SQL runs with no model: 20 ms; first
                                  click deterministic when the designer writes it (19 ms)
preferences carry over (H1)       14/14 against 1–2/14 without — ceiling caveat stands
/api/* interprets itself          no 404 under /api; the first call is the declaration
                                  (23/09, 480b491)
bare body                         {"name": …} works like {"data": {…}} (ff39661)
RocksDB for new apps              existing .skv kept on surrealkv (23/09, 1bd86eb)
? shortcuts on every page         View.KEYS, and a test that no key goes unlisted
the kickstart (#22)               GET / on an empty app → 302 /_stem; one live run
                                  to a real /todos, $2.65 (23/09, 8dfa3f8;
                                  spec/26-09-23-stem-kickstart/)
docs                              bili-docs /stem/: landing, 8 concepts, guides, reference
```

## Now

**stem new** (roadmap item 1 below, branch `stem-new`,
`spec/26-09-23-stem-new/`). Groups 1–4 are built; group 5 — export, publish,
the one-take run — installs from our repo (`bunx github:biliboss/stem`),
no npm login (24/09).

## Next, in order

```
1  stem new         `npx stem new <app>`: the four setup questions, app.ts +
                    SKILL.md + .system/, the skill linked globally, browser
                    opens on /_stem. Overlaps #18 (npx stem --meta): merge the two.
     proof: a fresh machine goes from the command to the kickstart, one take
2  app.ts runs      `bun app.ts` starts the app (import.meta.main); no `serve`
     proof: an app folder with no stem.ts path in the command boots
3  H5 replay        a promoted program agrees with the agent that wrote it,
                    replayed on a copy of the database, with a planted error
                    that MUST be caught
     proof: divergences = 0 over ≥ 10 real operations, planted one detected
4  the cost curve   model cost per request over a week of real use of one app
     proof: the curve, published — this is the bet in the mission
5  via-app on Stem  #8, #9: the Via Corretor migrates onto Stem
6  H6               versioned prompts make an execution replayable
```

## Later, and not before a reason

- **The outside MCP door.** Back from "coming soon" when an outside agent needs
  something HTTP and the skill cannot give it.
- **Automate a process.** The kickstart shows it; the path that runs on its own
  when something happens (the world's producers and consumers, `docs/world.md`)
  waits for its first real case.
- **Production for others.** Stem is published as research; a dependency
  promise waits for the cost curve.
