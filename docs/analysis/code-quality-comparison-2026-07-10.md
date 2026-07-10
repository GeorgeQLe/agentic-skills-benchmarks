# Code-Quality Comparison: Fable 5 vs Opus 4.8 vs GPT-5.5

**Date:** 2026-07-10
**Source:** ~/.claude/projects/**/*.jsonl (2,087 transcripts) + ~/.codex/sessions/**/*.jsonl (800 sessions); resulting codebases under ~/projects
**Scope:** static + file-level read audit of *resulting code on disk*, attributed per authoring model
**Companion:** see `model-behavioral-comparison-2026-07-10.md` (assistant-side behavior) — this file is the code-artifact counterpart.
**Artifact:** https://claude.ai/code/artifact/c7d6d9d0-dbc7-4253-bbcc-74af91e15446

## Summary

All three models produce genuinely senior-level code — near-zero `any`, real runnable logic, no stub-ware. The separation is **doctrine, not sloppiness**. Fable 5's edge is that it treats correctness as invariants that are both *stated in prose and enforced by runtime guards*, documents every module's contract uniformly, and reproduces one clean pure-core architecture across unrelated projects. The gap to GPT-5.5 is sharp (duplication, comment density, error handling); the gap to Opus 4.8 is a matter of character, not quality tier.

## Method

Authorship was attributed to the model that *made each edit*, not the session owner:
- **Claude side:** counted `Write`/`Edit`/`NotebookEdit` `tool_use` events, keyed to `message.model` of the `assistant` turn (main-loop, `isSidechain == false`).
- **Codex side:** counted `apply_patch` / `exec_command`+patch function-calls per session `cwd`, all `gpt-5.5`.

Only **clean single-model codebases** were selected so the comparison isn't confounded by mixed authorship:

| Model | Clean codebases audited | LOC |
| --- | --- | ---: |
| Fable 5 | metternich-engine-reduxer, football-slam-game, sandbox-king, three-k-stars | ~31k |
| Opus 4.8 | lexcorp-war-room, bismarck-anno-clone-concept, agent-slap-chop-media, tui-coasters (Rust) | ~52k |
| GPT-5.5 | draft-stonk-mk3 (flagship), next-camstudio, pair-app, anti-zed, calcllm | ~28k |

Three parallel auditors read ~20 files each under an identical 10-point rubric; a quantitative sweep was run independently over the same trees.

## Quantitative backbone

| Signal | Fable 5 | Opus 4.8 | GPT-5.5 |
| --- | ---: | ---: | ---: |
| Median LOC / file | 87 | 78 | **50** |
| Max hand-written *logic* file | 715 | 808 | 808 |
| Comment lines ‰ of code | **71.7** | 42.5 | 13.4 |
| `any` per kLOC | 0.17 | 0.65 | **0.00** |
| Empty `catch {}` blocks | 0 | 0 | **13** |
| TODO / stub per kLOC | **0.4** | 1.8 | 1.9 |
| Test files (clean set) | 59 | 108 (+175 Rust `#[test]`) | 11 |

> Bold = the extreme value in that row, not necessarily "best" — smaller files and denser comments are not strictly virtues. Read direction in the findings below.

## Differentiators (ranked most → least distinguishing)

### 1. Invariant-as-runtime-guard doctrine

Fable states a rule in prose, then enforces it with a throwing guard — its single strongest fingerprint.

```ts
// sandbox-king/packages/sim/src/advance.ts:90
// the sim must never grow non-integer money
if (!Number.isInteger(next.treasury))
  throw new Error('Non-integer treasury after tick');
```

- **Fable 5** — fails *loud on invariant violation*. Seeded RNG, canonical-sort helpers, `Number.isInteger` checks; determinism as doctrine.
- **Opus 4.8** — fails *soft on I/O*. Every external value NaN/null-guarded; network calls `console.warn`-and-`continue` (`github.ts:116`), never crash but never throw loudly.
- **GPT-5.5** — pushes correctness to *types + boundary Zod validation*, then trusts it: only **3 `try/catch` in 27k LOC**, plus `!` non-null shortcuts in hot paths (`currentPickNumber!`).

### 2. Uniformly heavy, WHY-first documentation

Fable comments ~1.7× denser than Opus and ~5× denser than GPT — but the tell is *consistency*. Every source file opens with a purpose docblock; spec-section citations (`spec §7.5`, 27×) and per-constant unit annotations throughout.

- **Fable 5** — uniformly high regardless of artifact; WHY over what.
- **Opus 4.8** — excellent but sparser; often cites the bug it fixed ("*the previous code let an over-drag silently move the end*", `ops.ts:307`).
- **GPT-5.5** — bimodal. Flagship app nearly comment-free (24 `//` lines in all of `features/`); yet standalone tooling has the corpus's best comments — dated + empirically verified:

```js
// alignment-tts-kokoro.js:45
// Verified 2026-06-09 (instrumented probe, Windows Chrome on
// file://wsl.localhost): caches IS available on file:// origins
// and entries persist across reloads.
```

### 3. Duplication discipline

Where Fable clearly beats GPT. Fable's entire duplication footprint is a one-line helper (`const other = s => s==='home'?'away':'home'`) copied 3×.

```
# GPT-5.5 draft-stonk-mk3 — parallel UI universes shipped side by side
features/ui-v1/ ui-v2/ ui-v3/ ui-v4/ ui-v5/   # ~12k LOC of near-duplicate
app/(v3-sleeper)/ (v4-arena)/ (v5-clean)/      # create page reimplemented 3×
draft-session.ts                               # bot-pick insert block copy-pasted 3×
```

- **Fable 5** — DRYest product. A single one-liner in 3 files is the whole list.
- **Opus 4.8** — in between: a couple of duplicated split-arithmetic routines and triplicate normalize pipelines; no variant sprawl.
- **GPT-5.5** — least DRY: five UI stacks + 7 route groups + triplicated hot-path code inside an 808-line god-route handler.

## Against Opus 4.8 specifically (the close call)

Fable and Opus are roughly co-equal in overall quality; they differ in character:

- **Compiler strictness** — Fable runs the strictest tsconfig seen (`exactOptionalPropertyTypes` + `noUncheckedIndexedAccess` on, **1 `any` in 31k LOC**). Opus is nearly as clean but looser config, quarantining ~5 `any`s at LLM/JSON boundaries.
- **Architecture reuse** — Fable reproduces the *same* template ("the ONLY mutation entry point," pure sim core behind a transport shell) across four *unrelated* repos. Opus **chameleons to each repo's toolchain** (quotes, semicolons, ESM extensions): uniform within a repo, deliberately divergent across.
- **Opus tells Fable doesn't share** — module-level mutable singletons in its browser game (`game-hud.ts:60`), and mild over-caution (defensive normalization everywhere).

## Caveat — domain confound

Fable's clean corpus is **game simulations**, where determinism and integer-invariants genuinely matter — so part of its "invariant doctrine" is domain-appropriate, not purely stylistic. Opus's and GPT's clean flagships are **web apps**, where the natural discipline is boundary validation and defensive I/O.

The comment-density, DRY-ness, and type-strictness gaps look domain-general; the specific "runtime invariant guard" habit is partly amplified by Fable's problem domain. Fully isolating it would need a Fable-authored CRUD app — none exists cleanly on this machine (its web apps are Fable/Opus mixed). **Recommended follow-up:** find or commission a Fable-authored app (not a sim) to re-test the invariant-guard habit outside the simulation domain.

## One-line answer

What sets **Fable 5** apart is doctrine — invariants both stated in prose and enforced by runtime guards, uniform per-module documentation, and one clean pure-core architecture reused across unrelated projects. **GPT-5.5** matches its type-strictness and naming but sprawls into redundant UI variants with thin comments and error handling; **Opus 4.8** is its closest peer, differing mainly in preferring defensive normalization and per-repo toolchain conformity over Fable's determinism-and-invariant dogma.
