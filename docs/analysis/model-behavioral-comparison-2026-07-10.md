# Model Behavioral Comparison: Fable 5 vs Opus 4.8 vs GPT-5.5

**Date:** 2026-07-10
**Source:** /analyze-sessions over ~/.claude/projects/**/*.jsonl and ~/.codex/sessions/**/*.jsonl
**Scope:** per-turn model attribution

## Summary

Across the user's local Claude Code and Codex history, the three models show distinct assistant-side behavioral signatures. Fable 5 tends toward quiet first-pass correctness: it narrates verification less and walks back its own conclusions rarely. Opus 4.8 narrates verification far more and concedes/corrects itself roughly an order of magnitude more often — a "show-the-work then reconsider" style. GPT-5.5 is mostly headless (batch/non-interactive) usage, so its interactive signals are thin; where it is interactive it is terse and test-heavy. None of this is subagent orchestration — the autonomy signal is progress-tracking (`TaskUpdate`), not Task-tool delegation.

## Corpus & method

| Model | Sessions | Assistant messages | Notes |
| --- | ---: | ---: | --- |
| Opus 4.8 | 559 | 68,900 | Primary interactive driver |
| Fable 5 | 175 | 24,100 | Interactive |
| GPT-5.5 | 799 | 15,500 | 322 sessions headless (~40%) |

Method notes:
- All signals are measured **assistant-side** (what the model emitted), not user-side.
- Per-turn model + token attribution is read from the per-turn transcript jsonl (`~/.claude/projects/**/*.jsonl`), **not** `history.jsonl`.
- Task-tracking activity here is progress tracking, **not** subagent orchestration: Task-tool orchestration was observed in 0 of 729 sessions. `TaskUpdate` (progress) ≠ `Task` (delegation).

## Findings

### F01 — Concession / walk-back rate

Assistant self-corrections or concessions ("actually", "you're right", "let me reconsider") per 1,000 assistant messages.

| Model | Per 1k asst-msgs | Approx. absolute |
| --- | ---: | ---: |
| Fable 5 | 0.04 | ~1 |
| Opus 4.8 | 0.38 | ~26 |
| GPT-5.5 | 0.06 | ~1 |

Opus concedes ~10x more than Fable per message. GPT-5.5's rate is low-confidence (see [Not claimed](#not-claimed) and headless caveat).

### F02 — Verification narration

Phrases narrating that the model is verifying/checking its work, per 1,000 assistant messages.

| Model | Per 1k asst-msgs |
| --- | ---: |
| Fable 5 | 7.5 |
| Opus 4.8 | 28.4 |
| GPT-5.5 | 48.5 |

Fable narrates verification least; GPT-5.5 most. Note F02 is narration frequency, not verification correctness or thoroughness.

### F03 — Autonomy / task-tracking

| Signal | Fable 5 | Opus 4.8 |
| --- | ---: | ---: |
| Messages per session | 162 | 129 |
| Write share of tool calls | 11% | 5% |
| `TaskUpdate` in top-8 tools | yes | no |

Fable runs longer sessions, writes files more, and surfaces progress-tracking (`TaskUpdate`) into its most-used tools. This is autonomy/persistence in a single turn — **not** subagent orchestration.

### Cross-cutting — shell file-reading via cat/sed/head/tail/awk

Share of shell calls that read files with `cat`/`sed`/`head`/`tail`/`awk` (a shared rule violation — these should use dedicated file tools):

| Model | Share of shell calls |
| --- | ---: |
| Fable 5 | 65% |
| Opus 4.8 | 66% |
| GPT-5.5 | 40% |

All three models violate the "prefer dedicated read tools over shell" rule at high rates.

### Keep (positive signals worth preserving)

| Model | Signal | Value |
| --- | --- | --- |
| GPT-5.5 | Test-run frequency | 242 test-runs / 1k asst-msgs |
| GPT-5.5 | Terseness | 291 chars / msg |
| Opus 4.8 | Ad-hoc testing | high |

## Evidence & confidence

| Claim | Confidence | Basis |
| --- | --- | --- |
| F01 concession: Opus >> Fable | High | Large message counts (68.9k / 24.1k); consistent phrase-match signal |
| F02 verification narration ordering | High | Large counts; simple lexical signal |
| F03 autonomy/task-tracking (Fable) | High | Tool-call distributions, session-length metrics |
| Cross-cutting shell file-reading | High | Direct tool-call inspection |
| Keep: GPT-5.5 terseness / test frequency | Medium | Skewed by ~40% headless sessions |
| Any GPT-5.5 *interactive* signal (F01/F02) | Medium/Low | ~40% headless usage dilutes interactive attribution |

## Not claimed

- **Per-turn user correction rate** was dropped as too sparse. After filtering slash-command headers and tool-result echoes, genuine free-text user corrections came to roughly ~1 per session — too thin to support a per-turn model comparison.
- No claim that Fable (or any model) **orchestrates subagents**. F03 is `TaskUpdate` progress-tracking, distinct from Task-tool orchestration, which was seen in 0/729 sessions.
- GPT-5.5 interactive behavioral signals are labeled low-confidence because ~40% of its sessions are headless.

## Recommended config contributions (proposed, not yet applied)

Source of truth is `tools/agentic-skills/CLAUDE.md` (propagates to runners via the provisioner). The Codex `AGENTS.md` mirror should carry only the model-agnostic items (02 & 04).

| # | Doctrine item | Target(s) | Rationale |
| --- | --- | --- | --- |
| 01 | Concede/reconsider only when warranted; a walk-back should follow new evidence, not reflex | `CLAUDE.md` | Balances Opus's high concession rate (F01) without suppressing genuine correction |
| 02 | Prefer dedicated file-read tools over `cat`/`sed`/`head`/`tail`/`awk` for reading | `CLAUDE.md` + `AGENTS.md` | Directly addresses the 40–66% cross-cutting shell-read violation |
| 03 | Narrate verification only when it adds signal; verifying quietly is fine | `CLAUDE.md` | Tempers the F02 narration spread (esp. GPT-5.5 / Opus) |
| 04 | Keep messages terse and test-backed | `CLAUDE.md` + `AGENTS.md` | Preserves the GPT-5.5 terseness + test-frequency positives |

These are **proposed only**. Editing the actual `CLAUDE.md` / `AGENTS.md` doctrine is deferred to the user.

## Provenance

Generated 2026-07-10 from local Claude Code and Codex session history via `/analyze-sessions`. A briefing artifact from that run exists and backs the numbers above. Signals are assistant-side lexical/tool-call measurements over per-turn transcript jsonl; treat interactive GPT-5.5 figures as directional given its headless share.
