# Agent Review: `feature-interview` Benchmark Outputs 2026-05-17

## Source Evidence

- Curated benchmark report: `benchmark/test-feature-interview-2026-05-17.md`
- Claude run directory: `tests/benchmarks/runs/feature-interview-claude-9139ad15`
- Codex run directory: `tests/benchmarks/runs/feature-interview-codex-ab46e0d0`
- Reviewed evaluated artifacts:
  - Codex run 0: `specs/benchmark-reporting-feature-interview.md`
  - Codex run 1: `specs/benchmark-reporting-feature-interview.md`
  - Codex run 2: `specs/benchmark-reporting-feature-interview.md`
- Excluded from subjective scoring: Claude runs 0, 1, and 2, because all three were infrastructure-blocked by `agent runner budget exceeded`.

## Deterministic Benchmark Context

| Agent | Session | Evaluated runs | Hard assertion pass rate | Infrastructure blocks | Deterministic quality | Cost |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Claude | `feature-interview-claude-9139ad15` | 0 | 0.0% (0/0) | 3 | n/a | $0.75 |
| Codex | `feature-interview-codex-ab46e0d0` | 3 | 100.0% | 0 | 100.0% | $0.75 |

The deterministic rerun confirms the artifact-path remediation: all evaluated Codex artifacts include the retained `Artifact path` line, pass hard assertions, route to `$roadmap`, and avoid direct `spec-interview`.

## Subjective Review Verdict

The evaluated Codex outputs are excellent. They are immediately usable as feature-interview artifacts for a roadmap operator: each names the source idea, preserves the confirmed no-follow-up and roadmap-sequencing constraints, defines the coverage-status concept, identifies missing implementation evidence instead of inventing repo facts, and gives a concrete `$roadmap` handoff.

Median subjective score: **96/100**

Range: **94-97**

| Reviewer | Agent | Run | Score | Grade | Subjective verdict |
| --- | --- | ---: | ---: | --- | --- |
| Codex | Codex | 0 | 94 | Excellent | Strong, complete interview artifact with clear traceability and risk handling; slightly more verbose than needed for the tiny fixture. |
| Codex | Codex | 1 | 97 | Excellent | Best output: crisp scope, clear category definitions, concrete deferrals, and useful roadmap-ready implementation boundaries. |
| Codex | Codex | 2 | 96 | Excellent | Excellent evidence discipline and next-route ergonomics, with especially good warnings about report semantics and automation consumers. |

## Strengths

- All evaluated artifacts include `Artifact path: specs/benchmark-reporting-feature-interview.md`, resolving the prior retained-artifact traceability weakness.
- All runs correctly treat roadmap sequencing as confirmed and do not route to `$spec-interview`.
- The outputs distinguish confirmed idea facts from implementation unknowns instead of inventing report schemas, source files, services, metrics, deploys, or repository history.
- The best artifacts give roadmap-ready scope boundaries: structured coverage status, visible per-skill rendering, definitions for `custom`, `generic`, and `blocked`, blocked reasons, serialization/rendering tests, and explicit deferrals.
- Residual risks are practical and tied to the fixture: ambiguous `generic`, conflated `blocked`, multiple report paths, missing structured models, and historical report compatibility.

## Weaknesses

- Claude produced no evaluated artifacts in the latest benchmark, so this review cannot compare runner families.
- Run 0 is somewhat heavy for a one-line idea. The extra detail is still useful and does not harm operator handoff quality.

## Remediation

| Finding | Classification | Owner target | Proposed change | Validation check | Route |
| --- | --- | --- | --- | --- | --- |
| No material evaluated-output weakness remains in the latest Codex artifacts. | No remediation needed. | n/a | Keep the current `feature-interview` contract and benchmark fixture behavior. | Existing evidence: `pnpm verify --skill feature-interview`; `pnpm bench --skill feature-interview --agent both --runs 3 --chunk-size 3 --pause 0`; this review report. | `$ship` |
| Claude lane was fully infrastructure-blocked by runner budget and produced no retained artifacts. | Infrastructure limitation, not skill-output weakness. | Benchmark runner capacity. | Do not score blocked runs. Re-run only when a fresh Claude comparison is specifically needed. | A future `$benchmark-test-skill feature-interview` after runner budget reset would provide Claude artifacts. | `$ship` |

## Deterministic Rubric Notes

No rubric tightening is recommended from this review. The deterministic rubric surfaced and then verified the prior artifact-path issue; the latest evaluated outputs pass both hard assertions and human review.

## Next Work

No follow-up remediation is needed for the latest evaluated `feature-interview` benchmark outputs.

**Recommended next command:** `$ship`
