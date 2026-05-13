# Agent Review: benchmark-test-skill

Date: 2026-05-13
Target skill: `benchmark-test-skill`
Review workflow: `$benchmark-agent-review benchmark-test-skill`

## Source Evidence

- Deterministic benchmark report: `benchmark/test-benchmark-test-skill-2026-05-13.md`
- Claude run directory: `tests/benchmarks/runs/benchmark-test-skill-claude-46f32ef6/`
- Codex run directory: `tests/benchmarks/runs/benchmark-test-skill-codex-e4c6aef6/`
- Benchmark setup: `tests/layer4/setups/tier1-workflows.setup.ts`
- Target skill contract: `packs/agentic-skills-bench/codex/benchmark-test-skill/SKILL.md`

## Benchmark Context

Both runners completed 3/3 evaluated runs with no infrastructure-blocked runs.

| Runner | Hard assertion pass rate | Deterministic output-quality score | Threshold failures | Critical failures |
| --- | ---: | ---: | ---: | ---: |
| Claude | 3/3 (100.0%) | 100.0% | 0 | 0 |
| Codex | 3/3 (100.0%) | 100.0% | 0 | 0 |

The fixture asked each runner to use only `bench-output.txt` and `verify-output.txt`, write `benchmark/test-run-2026-05-11.md`, include `## Verify`, `## Benchmark Metrics`, `## Raw Evidence`, and `## Next Route`, place pass rate, p50 latency, total cost, and raw session path as rows in the benchmark metrics table, and use the runner-specific route convention: Claude `/ship`, Codex `$ship`.

## Retained Output Limitation

Codex run JSON retained full transcript diffs containing the generated report text for all three evaluated runs. Claude run JSON retained terse final stdout summaries plus hard assertion and deterministic quality metadata, but not the full generated report body. Claude subjective scores therefore grade retained evidence and benchmark assertions, not a fully inspectable artifact snapshot.

## Agent-Review Scores

| Reviewer | Runner | Run index | Score | Grade band | Notes |
| --- | --- | ---: | ---: | --- | --- |
| Codex agent review | Claude | 0 | 92 | Excellent | Retained stdout says the report used the four required sections, verify/metrics tables, all fixture evidence, and `/ship`; assertions and quality rubric confirm required structure. Full artifact text was not retained. |
| Codex agent review | Claude | 1 | 92 | Excellent | Same retained evidence pattern as run 0, with explicit `Recommended next command: /ship`. Full artifact text was not retained. |
| Codex agent review | Claude | 2 | 92 | Excellent | Same retained evidence pattern as run 0, with all fixture evidence and `/ship` route reported. Full artifact text was not retained. |
| Codex agent review | Codex | 0 | 96 | Excellent | Generated report is concise, evidence-linked, structured, and route-correct. It includes a code block with raw evidence and names both source files. |
| Codex agent review | Codex | 1 | 96 | Excellent | Generated report has clean tables, exact fixture evidence, explicit source files, literal report path, and route-correct `$ship`. |
| Codex agent review | Codex | 2 | 95 | Excellent | Generated report is complete and route-correct. Minor ergonomic weakness: `Next work: ship the benchmark report artifact` is less specific than run 0/1, but still actionable. |

Median subjective score: 93.5
Score range: 92-96

## Output-Quality Verdict

The reviewed outputs are excellent for this fixture. They are narrow, evidence-linked, and operator-readable. Codex outputs are fully inspectable and show the requested section structure, metric rows, raw evidence, literal report path, and `$ship` handoff. Claude outputs cannot be inspected at the full artifact-text level, but all retained evidence points to compliant, useful artifacts: every run passed the hard structure assertion, the route assertion, and the deterministic quality rubric.

This review does not change the deterministic benchmark score. It adds subjective judgment that the generated artifacts are not merely assertion-compliant; the retained Codex reports are ergonomic enough for a next operator, and the retained Claude evidence is strong enough to treat those runs as excellent with an evidence-retention caveat.

## Common Strengths

- Clear task selection: every retained output stayed focused on writing the requested benchmark report from the two fixture files.
- Strong evidence traceability: outputs name `bench-output.txt`, `verify-output.txt`, `benchmark/test-run-2026-05-11.md`, `layer1 PASS`, `layer2 SKIPPED`, `passRate=1.0`, `p50=1200`, `totalCost=0.42`, and `run-agent-abc`.
- Good validation value: the reports separate verify status from benchmark metrics and preserve raw evidence for auditability.
- Scope control: no output invented external services, deploys, GitHub Actions, repository scans, or extra benchmark commands.
- Next-route ergonomics: Claude used `/ship`; Codex used `$ship`.

## Common Weaknesses

- Claude artifact retention is incomplete: the run JSON does not preserve the generated report body, only summaries plus assertion metadata.
- The fixture is intentionally narrow, so excellent scores here prove report-writing ergonomics for this constrained benchmark case, not broad end-to-end skill judgment across unknown, blocked, generic, or failing benchmark states.

## Remediation

| Finding | Classification | Owner target | Proposed change | Validation check | Route |
| --- | --- | --- | --- | --- | --- |
| Claude run evidence does not retain the generated report body even when the artifact exists and passes assertions. | Retained-evidence gap | `tests/harness` benchmark artifact capture path for Claude runner outputs | Persist generated artifact content or a file snapshot reference in each `run-*.json` for all runners when an expected output path exists. | Add a layer1 harness test that a Claude-style successful run with `outputPath` stores inspectable artifact text or a durable snapshot path in `run-*.json`. | `$targeted-skill-builder benchmark-agent-review retained evidence gap` |
| The reviewed fixture is narrow and cannot prove all `benchmark-test-skill` branches, such as unknown skills, blocked coverage, verify failure, and infrastructure-blocked runs. | Benchmark rubric/setup coverage | `tests/layer4/setups/tier1-workflows.setup.ts` for `benchmark-test-skill` | Add separate scenario coverage for one non-happy-path branch if the goal is broader skill confidence beyond report artifact ergonomics. | `pnpm --dir tests test:layer1 -- bench-setups bench-quality` plus a one-run benchmark smoke for the new scenario. | `$targeted-skill-builder benchmark-test-skill benchmark branch coverage` |

## Deterministic-Rubric Notes

The deterministic rubric aligned with the human review for the retained Codex artifacts: no meaningful weakness was hidden by the 100.0% score. For Claude, the deterministic score may be accurate, but the retained evidence is not sufficient for independent artifact-level review. That is a harness retention issue rather than an output-quality failure.

## Next Work

No target-skill remediation is needed for `benchmark-test-skill` based on this review. The highest-value follow-up is optional harness retention hardening so future reviews can inspect Claude generated artifacts as directly as Codex artifacts.

Recommended next command: `$ship`
