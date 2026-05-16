# Benchmark Agent Review: ship

**Date:** 2026-05-16
**Workflow:** `$benchmark-agent-review ship`
**Target skill:** `ship`
**Review scope:** newest completed Claude and Codex benchmark runs for `ship`

## Source Benchmark Reports

- Aggregate benchmark report: `benchmark/test-ship-2026-05-16.md`
- Claude benchmark report: `tests/benchmarks/runs/ship-claude-920245e6/report.md`
- Claude benchmark data: `tests/benchmarks/runs/ship-claude-920245e6/report.json`
- Codex benchmark report: `tests/benchmarks/runs/ship-codex-898663d6/report.md`
- Codex benchmark data: `tests/benchmarks/runs/ship-codex-898663d6/report.json`

## Reviewed Runs

| Runner | Run Directory | Run Indexes | Infrastructure Blocks |
|---|---|---:|---:|
| Claude | `tests/benchmarks/runs/ship-claude-920245e6/` | 0, 1, 2 | 0 |
| Codex | `tests/benchmarks/runs/ship-codex-898663d6/` | 0, 1, 2 | 0 |

The retained artifact under review for every evaluated run was `ship-manifest.md`. Full artifact text was available in each `run-*.json`, so subjective grading did not rely on benchmark summaries alone.

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

The generated manifests are excellent overall. Every retained output names the concrete changed files, cites validation evidence from `tasks/todo.md`, avoids invented deploys or services, avoids GitHub Actions, and uses the correct runner-specific next command.

The remaining differences are ergonomic rather than material. The strongest outputs use clear section headings and say directly that no deploy was requested or run. The weaker outputs still work as operator handoffs, but they include slightly less precise deploy wording or make the user goal partly about packaging the manifest rather than only the completed fixture step. None of those issues is severe enough to require another remediation pass.

## Score Table

| Reviewer | Runner | Run Index | Score | Grade Band | Notes |
|---|---|---:|---:|---|---|
| Codex self-review | Claude | 0 | 92 | Excellent | Clear sections, correct `/run` route, concrete validation evidence; deploy status includes unrelated git wording but still states not deployed. |
| Codex self-review | Claude | 1 | 91 | Excellent | Complete and concise with strong validation and rollback notes; compact bullet format is a little less durable than sectioned manifests. |
| Codex self-review | Claude | 2 | 94 | Excellent | Strong goal specificity, validation evidence, rollback note, and route; deploy wording is acceptable though it mentions skipped git operations. |
| Codex self-review | Codex | 0 | 90 | Excellent | Complete, scoped, and evidence-linked; the user goal partly describes making a manifest but stays grounded in the completed fixture step. |
| Codex self-review | Codex | 1 | 96 | Excellent | Best output: precise handoff goal, clear deploy rationale, exact changed files, validation evidence, rollback, and `$run` route. |
| Codex self-review | Codex | 2 | 91 | Excellent | Correct and useful with direct deploy status; user goal includes manifest-production language but remains tied to the validated fixture step. |

Median subjective score: 91.5

Score range: 90-96

## Common Strengths

- All outputs preserved the changed-file list: `tests/example.test.ts` and `tasks/todo.md`.
- All outputs cited the fixture validation evidence instead of inventing an unrun test command.
- All outputs avoided fabricated deploys, external services, GitHub Actions, and repository state claims.
- All outputs selected the correct runner-specific next route.
- Sectioned manifests were especially easy to scan and would be suitable as real `$ship` handoff templates.

## Common Weaknesses

- A few user-goal fields still include "manifest" or "handoff" phrasing, but each also ties back to the completed validated fixture step.
- Two Claude deploy-status fields mention git operations even though deploy status is the requested field; they still explicitly say not deployed.
- One Claude output uses a compact bullet-list manifest. It is readable and complete, but less robust as a durable handoff format than the sectioned outputs.

## Remediation Handoff

No material remediation is required. The prior rubric fixes now surface and prevent the earlier goal-specificity and validation-evidence problems, and the retained outputs are all excellent or near-excellent as operator artifacts.

| Finding | Classification | Owner Target | Proposed Change | Validation Check | Route |
|---|---|---|---|---|---|
| Minor wording variance in otherwise excellent manifests. | No action | none | No change recommended; the current skill and benchmark rubric are sufficient for the reviewed evidence. | Existing fresh benchmark and this review are adequate. | `$ship` |

## Deterministic-Rubric Notes

The deterministic rubric aligned with subjective review for this fresh run. It reported 100.0% hard assertions and 100.0% output-quality scores for both agents, and the retained artifacts were excellent enough that no new deterministic rubric tightening is justified from this evidence.

## Result

The `ship` benchmark outputs pass human review. All six retained manifests are excellent operator handoffs, with only minor wording differences and no meaningful remediation target.

**Next work:** none
**Recommended next command:** `$ship`
