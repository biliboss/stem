# Prior art: backend with no routes that learns

Checked on 2026-09-14 with WebSearch and WebFetch. Our idea has four key traits.
(A) Any route reaches a runtime. (B) An LLM resolves the request. (C) State is persisted in a real DB.
(D) Repeated answers are learned and compiled into a deterministic capability, so no LLM runs on the hot path.

| # | Item | Exists? | What it actually does | Date | Traits matched | Closeness |
|---|------|---------|-----------------------|------|----------------|-----------|
| 1 | arXiv 2607.08010, Tool-Making and Self-Evolving LLM Agents in Low-Latency Systems (Kujanpää et al.) | yes | Compiles repeated procedural steps of a production agent into validated tools *before deployment*. Case study is alarm triage in a fulfillment center: p50 latency -42%, errors -53%. | Jul 9 2026 (rev. Aug 24) | D (offline) | high on D, none on A/C |
| 2 | arXiv 2604.27264, Self-Evolving Software Agents (Robol, Giorgini) | yes | BDI agents plus an LLM that evolve their own goals, reasoning and executable code from little initial knowledge. | Apr 29 2026 | D-ish (self-written code) | low to medium |
| 3 | backlex.com, "AI-native backend" | yes | A BaaS where you describe the system in language and AI builds it. It has a schema, a permissions DSL, realtime, and an MCP server with 149 admin tools. It does NOT resolve arbitrary routes at runtime. | undated (2025–26) | C, and B only at build time | low |
| 4 | github.com/mcpland/dynamic-mcp | yes (1 star) | An MCP server where tools are created, managed and run at runtime in sandboxes. | 2025–26 | a runtime tool registry, similar to our capability store | low to medium |
| 5 | Convex AI (convex.dev/ai) | yes, but not "agent mode" as described | Pitches Convex as the backend that AI-generated code should target, with serializable transactions and realtime queries. No LLM runs per request. | 2025–26 | C | low |
| 6 | backend-GPT (TheAppleTucker) | yes | The LLM infers business logic from the API call name, and the whole app state is a JSON blob of about 1 KB that the LLM rewrites. No learning and no code. | 2023 (hackathon) | A, B, C (toy) | high on A/B, zero on D |
| 7 | WebSim (websim.ai) | yes | You type any URL and an LLM (Claude) generates the site, with simulated interactivity. | 2024 | A, B (frontend) | medium; no D, and state is shallow |
| 8 | Anthropic "Imagine with Claude" | yes | A research preview (claude.ai/imagine) with Sonnet 4.5. A desktop-style UI is generated on each click, so the software is made on the fly. Max users only, for 5 days. | Sep 29 2025 | A, B (UI) | medium; ephemeral, no D |
| 9a | Agent Workflow Memory (AWM, ICML 2025) | yes | Induces reusable workflows from successful trajectories and uses them to guide later runs. The LLM is still in the loop. | 2024–25 | D (as memory, not code) | medium |
| 9b | Agentic Plan Caching | yes | Extracts plan templates from trajectories and caches them. A small LM adapts them at test time. | 2025 | D (partial, still an LM) | medium to high |
| 9c | SkillWeaver / Voyager | yes | Distills trajectories into executable skill APIs (web agent) or a code skill library (Minecraft). | 2023 / 2025 | D as code | medium to high |
| 9d | AgentKB | yes | Turns trajectories into experience units shared across agent frameworks. | 2025 | D (knowledge, not code) | low to medium |
| 9e | LLM-as-Code (arXiv 2606.15874); Blueprint First (2508.02721) | yes | The program owns control flow and the LLM is called only at bounded nodes. | Jun 2026 / Aug 2025 | the philosophy behind D | medium |
| 9f | GPTCache / semantic caches | yes | Returns cached LLM responses for similar queries. It stores data, not logic. | 2023– | a weak form of D | low |

## Notes

Nothing found combines all four traits. The any-route plus LLM half (backend-GPT, WebSim, Imagine) has
no learning. The learn-and-compile half (2607.08010, plan caching, SkillWeaver, AWM) lives inside
agent tasks, not behind an HTTP surface driven by frontend usage. Item 1 is also offline and pre-deployment.
Our online route-to-capability promotion, with the frontend defining the backend, looks unclaimed.
This is inferred from search coverage, not proven.

Corrections to the original list:
- Convex has no confirmed "agent mode". The page is about being a good target for AI-written code.
- Backlex is not an LLM-resolved runtime.
- dynamic-mcp is real but tiny (1 star).
- "JIT LLM" and "self-specifying server" returned nothing relevant.

## URLs
- https://arxiv.org/abs/2607.08010
- https://arxiv.org/abs/2604.27264
- https://backlex.com
- https://github.com/mcpland/dynamic-mcp
- https://www.convex.dev/ai
- https://github.com/TheAppleTucker/backend-GPT
- https://websim.ai, https://tomsguide.com/how-to-use-websim
- https://www.testingcatalog.com/anthropic-experiments-with-an-agent-for-gereating-ui-on-the-fly/, https://www.anthropic.com/news/claude-sonnet-4-5
- https://icml.cc/virtual/2025/poster/45496 (AWM)
- https://www.emergentmind.com/topics/agentreuse (plan caching, SkillWeaver, AgentKB overview)
- https://arxiv.org/html/2606.15874v1, https://arxiv.org/pdf/2508.02721
- https://github.com/zilliztech/GPTCache
