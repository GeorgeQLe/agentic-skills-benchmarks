# Benchmark Agent Review: analyze-sessions

Date: 2026-05-15

## Source Evidence

- Curated benchmark report: `benchmark/test-analyze-sessions-2026-05-15.md`
- Claude run directory: `tests/benchmarks/runs/analyze-sessions-claude-b5357730/`
- Codex run directory: `tests/benchmarks/runs/analyze-sessions-codex-8f7e860a/`
- Reviewed artifacts: `session-analysis.md` snapshots retained in `run-000.json`, `run-001.json`, and `run-002.json` for both agents.
- Benchmark setup: `tests/layer4/setups/tier23-global-workflows.setup.ts`
- Target skill contracts: `global/claude/analyze-sessions/SKILL.md` and `global/codex/analyze-sessions/SKILL.md`

## Benchmark Context

Both runners completed 3/3 evaluated runs with no infrastructure-blocked runs.

| Runner | Hard Assertions | Deterministic Output Quality | Threshold Failures | Critical Failures |
| --- | ---: | ---: | ---: | ---: |
| Claude | 3/3 (100.0%) | 92.3% | 0 | 0 |
| Codex | 3/3 (100.0%) | 92.3% | 0 | 0 |

The fixture asked each runner to analyze three local session logs under `sessions/`, write `session-analysis.md`, identify recurring patterns, automation opportunities, risks, and a final recommended next command. The key fixture facts were repeated validation misses and lessons-capture misses on 2026-05-01, 2026-05-08, and 2026-05-15. The intended broad follow-up was runner-specific `targeted-skill-builder`: `/targeted-skill-builder run post-doc-edit validation and lessons capture gate` for Claude and `$targeted-skill-builder run post-doc-edit validation and lessons capture gate` for Codex.

The deterministic scores are context only. This review judges the retained generated artifacts for usefulness to a next operator.

## Output-Quality Verdict

The reviewed outputs are good to excellent overall. Every artifact identifies the central recurring workflow gap: task, roadmap, or todo documentation edits repeatedly missed validation proof and lessons capture until the user intervened. The outputs preserve the three fixture dates, separate explicit evidence from inference, identify a likely run/ship or task-document owner surface, include a validation expectation, and avoid unsupported external services or repository claims.

The prior major weakness, broad or dual-mode handoffs, is mostly fixed. Claude outputs now end with one slash command, and Codex outputs consistently use the dollar command family. The remaining ergonomic issue is narrower: all three Codex artifacts append `for Codex` to the final command argument. That is traceable to ambiguous benchmark prompt wording, but it still makes the retained artifact less clean for a next operator because the intended command is `$targeted-skill-builder run post-doc-edit validation and lessons capture gate`.

## Agent-Review Scores

| Reviewer | Runner | Run | Score | Grade Band | Notes |
| --- | --- | ---: | ---: | --- | --- |
| Codex reviewer | Claude | 0 | 92 | Excellent | Strong scope control, evidence labels, exact final route, and clear owner/validation handoff. Slightly speculative on slash-side parity, but flags the evidence limit. |
| Codex reviewer | Claude | 1 | 94 | Excellent | Best overall artifact: precise attribution, concrete gate behavior, block-before-ship expectation, and clean runner-native command. |
| Codex reviewer | Claude | 2 | 90 | Excellent | Clear recurring-pattern and risk analysis with useful acceptance-check language. Slightly broader owner surface, but still actionable. |
| Codex reviewer | Codex | 0 | 88 | Good | Strong evidence/inference split and remediation shape. Final command appends `for Codex`, which is less exact than the intended route. |
| Codex reviewer | Codex | 1 | 89 | Good | Concise and useful with explicit evidence and validation expectations. Final command again includes the unnecessary `for Codex` suffix. |
| Codex reviewer | Codex | 2 | 90 | Excellent | Strongest Codex artifact: good source comparison, owner caution, and benchmark-validation expectation. Final command still carries the suffix. |

Median subjective score: 90.0. Score range: 88-94.

## Common Strengths

- Every output treats the fixture as a recurring cross-session workflow gap, not a single incident for session triage.
- Every output names both recurring misses: validation skipped after task/planning documentation edits and lessons capture missed before shipping or final handoff.
- Every output uses all three dated fixture logs and avoids unsupported broad history claims.
- Evidence attribution is much cleaner than the previous review: runner-unknown entries stay runner-unknown, and owner surface is marked as inferred when appropriate.
- Owner and validation expectations are now consistently remediation-ready enough for targeted follow-up.
- No reviewed output invents external services, GitHub Actions, deploys, package-manager mutations, or nonexistent benchmark results.

## Common Weaknesses

- Codex outputs include `for Codex` as part of the final command line. The route family is correct, but the command argument is not as exact or clean as the intended handoff.
- Some owner-surface language remains broad (`shared runner/task-document workflow`) before converging on `run`; this is acceptable given the sparse fixture, but it leaves a small amount of discovery for the next operator.
- The deterministic rubric still reports `workflow-artifact-reference` at 0.0% even when outputs mention the artifact in stdout or the retained benchmark evidence clearly identifies `session-analysis.md`; this is not material to operator usefulness here.

## Remediation Handoff

| Finding | Classification | Owner Target | Proposed Change | Validation Check | Route |
| --- | --- | --- | --- | --- | --- |
| Codex artifacts append `for Codex` to the final command, making an otherwise correct handoff less exact. | harness/setup issue | `tests/layer4/setups/tier23-global-workflows.setup.ts` | Reword the `analyze-sessions` benchmark prompt so `for Claude` / `for Codex` are explanatory labels outside the literal command, and tighten the final-route assertion or quality criterion to reject trailing runner-label suffixes when exact final command text is required. | `pnpm --dir tests exec vitest run --project layer1 bench-setups` plus a one-run Codex benchmark smoke for `analyze-sessions` showing the final command is exactly `$targeted-skill-builder run post-doc-edit validation and lessons capture gate`. | `$targeted-skill-builder analyze-sessions benchmark final-route exactness` |
| The reviewed outputs sometimes name a broad shared owner surface before `run`, reflecting sparse fixture evidence. | retained-evidence gap | `tests/layer4/setups/tier23-global-workflows.setup.ts` fixture logs | If future reviews need stronger owner certainty, add one more fixture log or prompt fact that explicitly establishes whether the owner is `run`, `ship`, or a shared post-doc-edit gate. Keep the current cautious wording acceptable until that evidence exists. | Add/adjust a fixture assertion only if owner specificity becomes a required quality dimension; rerun `pnpm --dir tests verify --skill analyze-sessions`. | `$targeted-skill-builder analyze-sessions benchmark owner-evidence fixture` |

## Deterministic-Rubric Notes

The deterministic rubric aligned with the broad result: all runs passed hard assertions, preserved fixture facts, used the correct route family, and included owner/validation/evidence-attribution details. It did not surface the `for Codex` command suffix because the route check accepts the expected route as a substring of the final command. Subjectively, this is worth tightening because the benchmark prompt says the final command must be exact.

The `workflow-artifact-reference` 0.0% score is not the important weakness in these artifacts. The generated artifact path is retained by the benchmark, and several outputs name `session-analysis.md` in stdout or scope. Route exactness is the higher-value rubric improvement.

## Next Work

Tighten the `analyze-sessions` benchmark setup so the runner-native final command is unambiguous and exact, especially for Codex outputs that currently append `for Codex`.

Recommended next command: `$targeted-skill-builder analyze-sessions benchmark final-route exactness`
