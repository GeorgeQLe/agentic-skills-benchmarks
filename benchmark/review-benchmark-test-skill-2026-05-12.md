# Benchmark Agent Review: benchmark-test-skill

Date: 2026-05-12
Command: `$benchmark-agent-review benchmark-test-skill`
Target skill: `benchmark-test-skill`

## Sources

- Deterministic benchmark report: `benchmark/test-benchmark-test-skill-2026-05-12.md`
- Claude run report: `tests/benchmarks/runs/benchmark-test-skill-claude-d0075f7e/report.json`
- Codex run report: `tests/benchmarks/runs/benchmark-test-skill-codex-76616c00/report.json`
- Benchmark setup: `tests/layer4/setups/tier1-workflows.setup.ts`

## Reviewed Runs

| Runner | Run | Status | Reviewed Evidence |
| --- | ---: | --- | --- |
| Claude | #0 | infrastructure-blocked | Excluded from subjective scoring: agent runner budget exceeded |
| Claude | #1 | evaluated | Retained stdout, hard assertions, deterministic quality result |
| Claude | #2 | evaluated | Retained stdout, hard assertions, deterministic quality result |
| Codex | #0 | evaluated | Retained generated artifact text in stderr, stdout, hard assertions, deterministic quality result |
| Codex | #1 | evaluated | Retained generated artifact text in stderr, stdout, hard assertions, deterministic quality result |
| Codex | #2 | evaluated | Retained generated artifact text in stderr, stdout, hard assertions, deterministic quality result |

Limitation: Claude generated file contents were not retained in `run-001.json` or `run-002.json`; only stdout summaries, assertion results, file lists, and deterministic quality details were available. Claude scores grade retained evidence rather than a complete artifact body.

## Benchmark Context

Original prompt:

> You have the benchmark-test-skill skill installed. Using bench-output.txt and verify-output.txt, write benchmark/test-run-2026-05-11.md with verify status, benchmark pass rate, latency, cost, raw session path, source file names, report path, and a literal `Recommended next command:` line. Use your runner's command convention for the route, regardless of fixture file names or raw session path text: Claude `/ship`, Codex `$ship`. Do not run pnpm.

Fixture facts:

- `verify-output.txt`: `layer1 PASS in 7.1s`; `layer2 SKIPPED no tests matched run`
- `bench-output.txt`: `Benchmark coverage for run: custom`; `passRate=1.0`; `p50=1200`; `totalCost=0.42`; `raw=tests/benchmarks/runs/run-agent-abc/report.json`
- Expected artifact: `benchmark/test-run-2026-05-11.md`

Deterministic benchmark:

| Runner | Hard Assertion Pass Rate | Deterministic Quality Score | Deterministic Notes |
| --- | ---: | ---: | --- |
| Claude | 100.0% (2/2 evaluated) | 72.9% | 2 threshold failures, 2 critical failures; `evidence-linked` 0.0% |
| Codex | 100.0% (3/3 evaluated) | 85.7% | 0 threshold failures, 2 critical failures; `evidence-linked` 33.3% |

## Agent-Review Verdict

The retained evaluated outputs are usable but not excellent. They satisfy the benchmark's hard artifact contract and choose the correct runner-specific next route, but several reports compress benchmark evidence so aggressively that the next operator loses exact fixture facts. The most important quality gap is evidence fidelity: multiple generated reports say `PASS` or summarize "verify status" without preserving the exact `layer1 PASS` fact, and some omit explicit `totalCost` / `passRate` field names even when the underlying fixture provided them.

The outputs are not failing human review because they create the requested report, keep scope tight, avoid unsupported external work, and include the correct route. They are also not good enough to ship as a durable benchmark-report exemplar because an operator auditing the report would have to infer which layer passed and which benchmark field came from which source line.

## Score Table

| Reviewer | Runner | Run | Score | Grade Band | Notes |
| --- | --- | ---: | ---: | --- | --- |
| Codex agent-review | Claude | #1 | 70 | usable | Retained stdout claims the report included required fields, but the visible evidence does not preserve the generated artifact body and deterministic quality shows missing `layer1 PASS`, verify status, and benchmark pass-rate traits. |
| Codex agent-review | Claude | #2 | 82 | good | Stdout is more evidence-specific and includes `verify layer1 PASS (7.1s)`, `bench passRate=1.0`, p50, cost, raw path, and `/ship`, but generated artifact text is still unavailable for direct review. |
| Codex agent-review | Codex | #0 | 92 | excellent | Artifact is clear, concrete, preserves `layer1 PASS`, `layer2 SKIPPED`, `pass rate`, p50, cost, raw path, source files, report path, and `$ship`. |
| Codex agent-review | Codex | #1 | 78 | usable | Artifact is compact and complete enough, but it weakens the exact fixture fact to `PASS with layer2 skipped` instead of preserving `layer1 PASS`; the model also noted skill-list uncertainty that was irrelevant to the artifact. |
| Codex agent-review | Codex | #2 | 80 | good | Artifact is actionable and preserves the route, but still summarizes `layer1 PASS` as generic `PASS`; evidence wording is adequate, not exemplary. |

Median subjective score: 80.
Score range: 70-92.

## Common Strengths

- The evaluated outputs stayed inside the fixture and did not run `pnpm`.
- Every evaluated output created or claimed creation of `benchmark/test-run-2026-05-11.md`.
- Runner-specific route conventions were correct: Claude used `/ship`, Codex used `$ship`.
- Reports generally included verify, pass rate, latency, cost, raw path, source files, report path, and next-route evidence.
- No evaluated output introduced GitHub Actions, production deploys, databases, or unsupported external services.

## Common Weaknesses

- Evidence fidelity is inconsistent. Several outputs do not preserve the exact `layer1 PASS` fixture fact even though that fact is central to the report.
- Some report text is too terse for a durable benchmark artifact; it lists values without enough labels or source traceability for easy audit.
- Claude artifact retention is insufficient for subjective review. The benchmark persisted stdout and quality notes, but not enough generated file content to inspect the final report directly.
- The benchmark hard assertions passed outputs that were functionally compliant but ergonomically thin; the deterministic quality rubric caught the evidence-linkage issue, but the hard gate alone would not.

## Remediation

| Finding | Classification | Owner Target | Proposed Change | Validation Check | Route |
| --- | --- | --- | --- | --- | --- |
| Generated reports can pass while summarizing `layer1 PASS` as generic `PASS` or only "verify status". | benchmark rubric | `tests/layer4/setups/tier1-workflows.setup.ts` quality evaluator for `benchmark-test-skill` | Add artifact-level exact evidence requirements for `layer1 PASS`, `layer2 SKIPPED`, `passRate=1.0` or `100%`, `p50=1200`, `totalCost=0.42`, and `run-agent-abc`; keep these as critical facts for the generated report body, not only stdout. | `pnpm --dir tests test:layer1 -- bench-setups bench-quality` plus `pnpm --dir tests bench --skill benchmark-test-skill --agent codex --runs 1 --chunk-size 1 --pause 0` | `$targeted-skill-builder benchmark-test-skill exact benchmark evidence reporting` |
| The hard assertions accept reports that contain all keywords but are too thin for a next operator to audit comfortably. | harness/setup issue | `tests/layer4/setups/tier1-workflows.setup.ts` `expectedIncludes` / `expectedPattern` for `benchmark-test-skill` | Require report-level labels or table rows for verify status, benchmark pass rate, latency, cost, raw session path, source files, report path, and next command; avoid keyword-only acceptance. | Add layer1 fixture tests asserting the setup rejects a keyword-only report and accepts a structured report. | `$targeted-skill-builder benchmark-test-skill exact benchmark evidence reporting` |
| Claude generated artifact bodies were not retained in the persisted run JSON, limiting subjective review. | retained-evidence gap | benchmark harness artifact persistence for generated files under `tests/benchmarks/runs/*/run-*.json` | Persist generated artifact text or a bounded file snapshot for `qualityOutputPath` so agent-review can grade the artifact rather than stdout claims. | Add a harness test that a run result includes retained content for `qualityOutputPath`, then re-run one benchmark smoke. | `$targeted-skill-builder benchmark-agent-review retained artifact evidence` |

## Deterministic-Rubric Notes

The deterministic rubric surfaced the main quality issue: `evidence-linked` was the lowest-scoring criterion for both agents and a critical failure in four evaluated runs. The gap is not that the rubric missed the issue; it is that the hard assertions and fixture acceptance remain too permissive for ergonomically thin reports. Tightening the `benchmark-test-skill` tier1 fixture is the highest-impact next step.

## Next Work

Tighten the `benchmark-test-skill` tier1 benchmark fixture so passing generated reports must preserve exact benchmark evidence, not just contain broad keywords.

Recommended next command: `$targeted-skill-builder benchmark-test-skill exact benchmark evidence reporting`
