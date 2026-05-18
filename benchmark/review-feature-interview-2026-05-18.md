# Agent Review: `feature-interview` Benchmark Outputs 2026-05-18

**Workflow:** `$benchmark-agent-review feature-interview`
**Source benchmark report:** `benchmark/test-feature-interview-2026-05-18.md`
**Reviewed skill:** `feature-interview`
**Review object:** retained generated `specs/benchmark-reporting-feature-interview.md` artifacts, not benchmark strictness

## Source Evidence

- Curated benchmark report: `benchmark/test-feature-interview-2026-05-18.md`
- Claude run directory: `tests/benchmarks/runs/feature-interview-claude-bd781522/`
- Codex run directory: `tests/benchmarks/runs/feature-interview-codex-59a38b3c/`
- Reviewed evaluated artifacts:
  - Codex run 0: `specs/benchmark-reporting-feature-interview.md`
  - Codex run 1: `specs/benchmark-reporting-feature-interview.md`
  - Codex run 2: `specs/benchmark-reporting-feature-interview.md`
- Excluded from subjective scoring: Claude runs 0, 1, and 2, because all three were infrastructure-blocked by `agent runner budget exceeded`.

## Deterministic Benchmark Context

| Agent | Session | Evaluated runs | Hard assertion pass rate | Infrastructure blocks | Deterministic quality | Cost |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Claude | `feature-interview-claude-bd781522` | 0 | n/a | 3 | n/a | $0.75 |
| Codex | `feature-interview-codex-59a38b3c` | 3 | 100.0% | 0 | 100.0% | $0.75 |

The deterministic benchmark context is clean for evaluated runs. Codex passed all hard assertions and the configured output-quality rubric. Claude produced no scorable output in this run, so it is treated as infrastructure-limited evidence rather than a `feature-interview` weakness.

## Subjective Review Verdict

The evaluated Codex outputs are excellent. Each artifact is a usable feature-interview handoff for a roadmap operator: it names the exact artifact path, preserves the no-follow-up and roadmap-sequencing constraints, validates claims against the sparse fixture instead of inventing repository evidence, defines the prototype-first gate, names table-first/board-first/command-first route experiments, defers SaaS infrastructure, and routes correctly to `$roadmap`.

Median subjective score: **94/100**

Score range: **93-95**

| Reviewer | Agent | Run | Score | Grade | Subjective verdict |
| --- | --- | ---: | ---: | --- | --- |
| Codex agent-review | Codex | 0 | 94 | Excellent | Strong artifact with clear claim validation, assumptions, route experiments, promotion gate, and roadmap handoff. Slightly more verbose than the sparse fixture requires, but the detail is useful. |
| Codex agent-review | Codex | 1 | 95 | Excellent | Best operator handoff: crisp evidence limits, route hypotheses, technical gotchas, risks, and a concrete roadmap slice with ordered prototype work. |
| Codex agent-review | Codex | 2 | 93 | Excellent | Excellent prototype-first routing and infrastructure deferral. The route experiments are strong, though the final priority language is a little more assertive than the sparse evidence alone can prove. |

## Common Strengths

- All evaluated outputs preserve the fixture's explicit constraints: no follow-up questions, roadmap sequencing confirmed, no direct `spec-interview` routing, fake rows first, and no auth/Stripe/analytics/database during prototype validation.
- The artifacts distinguish confirmed user intent from unknown demand, missing product research, absent source files, and empty git history.
- The prototype-first gate is concrete: the outputs recommend route experiments and define evidence that would justify later production infrastructure.
- Route-based experiments are actionable enough for roadmap sequencing, with hypotheses and success signals for table-first, board-first, and command-first variants.
- Next-route ergonomics are correct for Codex: each evaluated output ends with `$roadmap` and explains that roadmap sequencing should happen before implementation planning.
- No evaluated output invents a production schema, deployment surface, billing flow, metrics source, or GitHub Actions workflow.

## Common Weaknesses

- Claude produced no evaluated artifacts in the latest benchmark, so this review cannot compare runner families.
- The outputs are strong for roadmap sequencing but do not all include a shared experiment comparison scorecard. That would be useful later, but it is not a material weakness for a `feature-interview` artifact whose next route is `$roadmap`.
- Run 2 says the prototype should enter roadmap sequencing at a high priority while also acknowledging there is no roadmap or user research. The conclusion is acceptable because the benchmark instruction confirmed roadmap sequencing, but a live user-facing interview should phrase that as "ready to sequence" rather than evidence-proven priority.

## Remediation

| Finding | Classification | Owner target | Proposed change | Validation check | Route |
| --- | --- | --- | --- | --- | --- |
| No material evaluated-output weakness remains in the latest Codex artifacts. | No remediation needed. | n/a | Keep the current `feature-interview` contract and benchmark fixture behavior. | Existing evidence: `pnpm verify --skill feature-interview`, `pnpm bench --skill feature-interview --agent both --runs 3 --chunk-size 3 --pause 0`, and this review report. | `$ship` |
| Claude lane was fully infrastructure-blocked by runner budget and produced no retained artifacts. | Infrastructure limitation, not skill-output weakness. | Benchmark runner capacity. | Do not score blocked runs. Re-run only if a future task specifically needs fresh Claude comparison evidence after runner budget resets. | A future `$benchmark-test-skill feature-interview` should produce evaluated Claude artifacts before any Claude subjective scoring. | `$ship` |

## Deterministic-Rubric Notes

No deterministic-rubric remediation is recommended from this review. The hard assertions and quality rubric aligned with the human review for the evaluated Codex outputs. The only missing evidence is a Claude runner comparison, and that is runner capacity, not benchmark strictness or skill-output quality.

## Next

**Next work:** none

**Recommended next command:** `$ship`
