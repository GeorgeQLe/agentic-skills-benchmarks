# Fable 5: Orchestrator/Executor vs Direct Execution

**Date:** 2026-07-10
**Source:** /analyze-sessions over ~/.claude/projects/**/*.jsonl (Claude Code full transcripts)
**Scope:** Should Fable 5 be used as an orchestrator calling subagents? Does history show orchestration vs direct execution — which is better / more token-efficient?
**Companion:** [model-behavioral-comparison-2026-07-10.md](model-behavioral-comparison-2026-07-10.md) (this doc is the orchestration-specific deep-dive behind that file's "0 of 729 sessions" line)

## Summary

The requested comparison **cannot be made from history, because it never happened**: across 729 real Claude Code sessions, **zero** ever spawned a subagent — not Fable 5, not Opus. Every session is a single main-loop model editing files directly. So there is no orchestrator-vs-executor data to weigh for Fable, or for any model.

What the data *can* say: as a direct executor, Fable 5 is **more terse per edit than Opus (~10k vs ~12k output tokens/edit) while doing more edits per session (median 13 vs 8)**, at the same user-correction load (median 4 turns). Cost is dominated by cache-reads (44%), not generation — which is exactly the cost an orchestration pattern attacks.

Recommendation: **pilot** an async-subagent orchestration pattern on genuinely parallel work and measure it; do not blanket-switch. This is grounded in Anthropic's own Fable 5 guidance (Fable is built for dependable async sub-agent delegation), not in local evidence — of which there is none yet.

## Corpus & method

- Signal source is the **per-turn transcript jsonl** (`~/.claude/projects/**/*.jsonl`), not `history.jsonl` (which stores only user prompts — no model, tokens, or tool calls).
- Excluded the `-skill-test-*` fixture directories. **729** files had real assistant activity.
- A session's model = the most common `message.model` across its main-loop (`isSidechain: false`) assistant turns. Fable-driven sessions: **171**. Opus-driven: **556**. (The companion doc's slightly different split — 175/559 — reflects a different bucketing/snapshot; the 729 total and the 0-orchestration finding agree.)
- **Subagent spawn** = a `tool_use` block with `name == "Task"` in a main-loop assistant message; subagent runs additionally appear as `isSidechain: true` messages with their own model. Both markers were checked and agree.
- **Exact-match gotcha (load-bearing):** match `name == "Task"` exactly. `TaskCreate` / `TaskUpdate` / `TaskList` are progress-tracking to-do tools, **not** delegation. A substring match (`"Task" in name`) would falsely flag ordinary sessions — see F04 spot-check.

## Findings

### F01 — Orchestration never occurred

| Marker | Fable 5 (n=171) | Opus (n=556) | All models (n=729) |
| --- | ---: | ---: | ---: |
| Sessions that spawned a `Task` subagent | 0 | 0 | 0 |
| Sessions where the model ran *as* a sidechain subagent | 0 | 0 | 0 |
| Max `Task`-spawn count in any single session | 0 | 0 | 0 |

The orchestrator/executor split does not exist anywhere in the history. Consistent with the user's workflow (short implement→ship→plan sessions), which rarely fans out.

### F02 — Fable-as-executor vs Opus-as-executor

Executor = `Task`-spawn count 0, edit count > 0.

| Metric | Fable 5 (n=165) | Opus (n=513) |
| --- | ---: | ---: |
| median edits / session | **13** | 8 |
| median output tokens / edit | **9,994** | 12,118 |
| median total output tokens / session | 144k | 93k |
| median user turns (correction proxy) | 4 | 4 |

Read: Fable is *more* token-efficient per code change and does more changes per session, with no increase in back-and-forth. No evidence of a quality penalty from the turn-count parity.

### F03 — Cost composition (Fable pricing $10/$50 per 1M in/out; cache-read ≈0.1× input)

165 Fable executor sessions: median **$22.76/session**, ~$5,100 total.

| Component | Share of cost |
| --- | ---: |
| cache-read | **44%** |
| output | 30% |
| input + cache-create | 26% |

The 44% cache-read share is the standing cost of re-flowing one growing context through a single main loop every turn — the specific inefficiency subagent scoping would reduce.

### F04 — Classifier spot-check (session `9ea6c068…`, metternich-engine-redux, row 1)

Raw first assistant line: `type: assistant`, `isSidechain: False`, `message.model: 'claude-fable-5'` (400/403 main-loop turns are Fable; 3 are `<synthetic>` injected summaries). Main-loop tool calls:

```
Edit 65 · Write 65 · Read 48 · Bash 47 · TaskUpdate 13 · TaskCreate 8 · ToolSearch 1
Task present? False   |  edit-family total: 130   |  sidechains: 0
```

This session has **21 "Task*" calls but 0 real `Task` spawns** — the exact-match guard correctly excluded the to-do tools. `Edit(65)+Write(65)=130` reconciles with the table's edit count.

## Recommendation

**Adopt as an instrumented pilot, not a default.**

1. Keep direct execution as the default — it is working (terse, low-correction).
2. On the next genuinely parallel task (fan-out migration, broad audit/review), run Fable as an **async orchestrator** (subagents that communicate back, not spawn-and-block) and measure cache-read tokens and wall-clock against a comparable solo session.
3. Adopt for that class of work only if cache-read share drops meaningfully. Do not blanket-switch — there is zero local baseline, so treat the first runs as experiments.

Rationale is external, not local: Anthropic's Fable 5 migration guidance explicitly reverses the prior-model "suppress subagents" guardrail — *"Parallel sub-agents are dependable on Claude Fable 5 … use sub-agents frequently … sub-agents that communicate asynchronously with the orchestrator outperform spawn-and-block."*

## Evidence & confidence

| Claim | Confidence | Basis |
| --- | --- | --- |
| F01 — 0 orchestration across 729 sessions | High | Two independent markers (`Task` tool-use + sidechain presence) agree; exact-match verified in F04 |
| F02 — Fable more terse/edit, more edits/session | High | 165 vs 513 sessions; direct tool-call + usage counts |
| F03 — cost composition (44% cache-read) | High | Verified provider pricing (claude-api skill, cached 2026-06-24); direct usage-field sums |
| Orchestration would cut Fable's cache-read cost | Medium | Mechanistic inference from cost composition; no local before/after data |
| Fable is good at async orchestration | Medium | Anthropic Fable 5 guidance, not local measurement |

## Not claimed

- **No orchestrator-vs-executor comparison for Fable.** It has never been run locally; the recommendation is forward-looking.
- **No quality claim** beyond turn-count parity — output tokens/edit measures verbosity, not correctness.
- Dollar figures use Fable rates throughout; a real orchestration setup might run subagents on a cheaper model, lowering cost further (untested).

## Provenance

Generated 2026-07-10 from local Claude Code session history via `/analyze-sessions`. Scripts and the full 729-row per-session CSV (`sid, proj, model, turns, task, edits, out, sidechain`) were produced in the session scratchpad. Detection method recorded in the user's memory (`reference_subagent_detection.md`).
