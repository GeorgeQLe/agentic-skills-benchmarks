# Benchmark Agent Review: ship

**Date:** 2026-05-16
**Workflow:** `$benchmark-agent-review ship`
**Target skill:** `ship`
**Review scope:** newest completed Claude and Codex benchmark runs for `ship`

## Source Benchmark Reports

- Aggregate benchmark report: `benchmark/test-ship-2026-05-16.md`
- Claude benchmark report: `tests/benchmarks/runs/ship-claude-9b81a26f/report.md`
- Claude benchmark data: `tests/benchmarks/runs/ship-claude-9b81a26f/report.json`
- Codex benchmark report: `tests/benchmarks/runs/ship-codex-61b220c4/report.md`
- Codex benchmark data: `tests/benchmarks/runs/ship-codex-61b220c4/report.json`

## Reviewed Runs

| Runner | Run Directory | Run Indexes | Infrastructure Blocks |
|---|---|---:|---:|
| Claude | `tests/benchmarks/runs/ship-claude-9b81a26f/` | 0, 1, 2 | 0 |
| Codex | `tests/benchmarks/runs/ship-codex-61b220c4/` | 0, 1, 2 | 0 |

The retained artifact under review for every evaluated run was `ship-manifest.md`. Full artifact text was available in each `run-*.json`, so no subjective grading had to rely on benchmark summaries alone.

## Benchmark Context

Original benchmark prompt:

> You have the ship skill installed. Read the fixture task and diff summary, then write ship-manifest.md with User goal, Changed files, Tests run, Deploy status, Rollback note, and Next command. Use your runner's command convention for Next command: Claude uses `/run`; Codex uses `$run`. Do not run git.

Fixture facts:

- `tasks/todo.md` Review says: `Validation passed for the completed fixture step.`
- `diff-summary.txt` lists `M tests/example.test.ts` and `M tasks/todo.md`.
- Expected artifact path: `ship-manifest.md`.
- Expected next command: Claude `/run`; Codex `$run`.
- Constraint: do not run git.

Hard benchmark results:

| Runner | Hard Assertion Pass Rate | Deterministic Quality Score | Threshold Failures | Critical Failures |
|---|---:|---:|---:|---:|
| Claude | 100.0% (3/3) | 100.0% | 0 | 0 |
| Codex | 100.0% (3/3) | 100.0% | 0 | 0 |

## Agent-Review Verdict

The generated manifests are good overall, and the best outputs are excellent operator handoffs. Every retained artifact names the two changed files, cites the validation evidence, avoids deploy and git claims, includes a rollback note, and uses the correct runner-specific next command.

The subjective gap is consistency of ergonomic detail. The strongest manifests convert sparse fixture evidence into a clear shipping handoff without inventing facts. The weaker but still usable manifests make the user goal more about "recording a manifest" than the actual completed fixture step, or compress the required fields into a bullet list rather than durable manifest sections. That does not break the benchmark contract, but it makes the artifact less useful as a handoff template for real `$ship` work.

## Score Table

| Reviewer | Runner | Run Index | Score | Grade Band | Notes |
|---|---|---:|---:|---|---|
| Codex self-review | Claude | 0 | 87 | Good | Complete and scoped; user goal is acceptable but generic, and deploy status is phrased as manifest-preparation rather than explicit fixture evidence. |
| Codex self-review | Claude | 1 | 95 | Excellent | Best Claude output: clear goal, concrete validation evidence, explicit no-additional-tests note, deploy status, rollback, and `/run` route. |
| Codex self-review | Claude | 2 | 84 | Good | Correct evidence and route, but compressed bullet formatting makes the manifest less durable and weaker as an operator artifact. |
| Codex self-review | Codex | 0 | 90 | Excellent | Complete and well scoped; the user goal is slightly meta but the rest of the handoff is concrete. |
| Codex self-review | Codex | 1 | 96 | Excellent | Strongest overall output: precise scope, no deploy evidence invented, concrete rollback, and correct `$run` route. |
| Codex self-review | Codex | 2 | 94 | Excellent | Clear, constrained, and actionable; minor issue is that the goal includes "without running git", which is a constraint rather than the shipped user goal. |

Median subjective score: 92

Score range: 84-96

## Common Strengths

- All outputs preserved the fixture's changed-file list: `tests/example.test.ts` and `tasks/todo.md`.
- All outputs cited the validation evidence from `tasks/todo.md` instead of claiming an unrun test command.
- All outputs avoided fabricated deploys, external services, GitHub Actions, or git operations.
- All outputs selected the correct runner-specific next route.
- Codex outputs were especially consistent about stating when deploy evidence was absent.

## Common Weaknesses

- Some user-goal fields describe the act of producing a manifest rather than the actual completed work being shipped.
- One Claude output used a compact bullet-list manifest rather than top-level sections for each required field, which is less readable for follow-on operators.
- Deploy-status wording varies between "manifest prepared without running git" and "deploy not run"; the latter is more direct and better aligned to the fixture.

## Remediation Handoff

| Finding | Classification | Owner Target | Proposed Change | Validation Check | Route |
|---|---|---|---|---|---|
| User goal can become meta instead of summarizing shipped work. | Benchmark rubric | `tests/layer4/setups/tier1-workflows.setup.ts` ship quality evaluator | Add a subjective or deterministic check that rewards user-goal text grounded in `tasks/todo.md` status and penalizes "write/record/create manifest" as the primary goal. | `pnpm verify --skill ship` and `pnpm bench --skill ship --agent both --runs 3 --chunk-size 3 --pause 0` should still pass with higher signal on goal specificity. | `$targeted-skill-builder ship benchmark goal-specificity` |
| Required fields can pass when compressed into one bullet list. | Benchmark rubric | `tests/layer4/setups/tier1-workflows.setup.ts` ship quality evaluator | Tighten `shipping-manifest-completeness` to prefer explicit section headings for `User goal`, `Changed files`, `Tests run`, `Deploy status`, `Rollback note`, and `Next command`, or document that compact bullets are acceptable. | Add/adjust a layer1 benchmark-quality fixture that fails a single-list manifest if section headings are intended. | `$targeted-skill-builder ship benchmark manifest-structure` |
| Deploy status is sometimes framed around git rather than deploy evidence. | Benchmark rubric | `tests/layer4/setups/tier1-workflows.setup.ts` ship quality evaluator | Add deploy-status wording guidance that distinguishes deploy from git and rewards "Deploy not run/no deploy contract or evidence" over unrelated git phrasing. | `pnpm verify --skill ship` should cover the updated quality criterion; a focused bench run should surface the wording in retained artifacts. | `$targeted-skill-builder ship benchmark deploy-status-specificity` |

## Deterministic-Rubric Notes

The deterministic rubric was not misleading about pass/fail: all outputs were compliant and none should fail the hard benchmark. It did, however, flatten meaningful ergonomic differences by assigning every run 100.0%. If future triage needs to distinguish excellent shipping handoffs from merely compliant ones, the highest-impact rubric improvement is goal specificity.

## Result

The `ship` benchmark outputs are good to excellent under agent review. No output fails human review, and no immediate skill-contract remediation is required before use. The best next improvement is benchmark-rubric refinement so future deterministic reports surface when a manifest goal is meta rather than evidence-linked to the shipped work.

**Next work:** tighten the `ship` benchmark quality rubric for user-goal specificity.
**Recommended next command:** `$targeted-skill-builder ship benchmark goal-specificity`
