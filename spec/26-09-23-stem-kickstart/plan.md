---
title: the kickstart — plan
description: The work for issue #22, as numbered task groups in order.
---

**Three groups; group 2 is the one that closes the item.** Groups 1 and 3
are the design and the docs, and were done first so the kernel had a target.

```
1  the prototype                                          done  848d208
   1.1  review design/kickstart.html: back, keys
   1.2  draw the after state: the list, and how to grow the app
   proof: the prototype opens on every ?step=1…5 and on the after state

2  /_stem in the kernel                                   done  6b482bf
   2.1  namespace Kickstart: steps, cache key, build declaration, pages
   2.2  GET /_stem · GET /_stem/why|plan|layouts (htmx parts) · POST /_stem/build
   2.3  GET / on an empty system → 302 /_stem, whatever the accept header
   2.4  Memory: kickstart() · keepKickstart() · overview() · Memory.KERNEL
   2.5  designs record cost_usd; the ? dialog lists 1, 2, 3 and Enter
   proof: tests/apps/stem/kickstart.spec.ts, and one live run on an empty app

3  the quickstart                                         done  b62c572
   3.1  bili-docs /stem/ quickstart rebuilt on the six screens, step 7 grow it
   proof: the page renders with the six captures
```
