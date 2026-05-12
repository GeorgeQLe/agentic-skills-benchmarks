# Benchmark Agent Review: benchmark-test-skill

Date: 2026-05-12
Command: `$benchmark-agent-review benchmark-test-skill`
Target skill: `benchmark-test-skill`

## Sources

- Deterministic benchmark report: `benchmark/test-benchmark-test-skill-2026-05-12.md`
- Claude run report: `tests/benchmarks/runs/benchmark-test-skill-claude-babf5870/report.json`
- Codex run report: `tests/benchmarks/runs/benchmark-test-skill-codex-c4f58932/report.json`
- Benchmark setup: `tests/layer4/setups/tier1-workflows.setup.ts`

## Reviewed Runs

| Runner | Run | Status | Reviewed Evidence |
| --- | ---: | --- | --- |
| Claude | #0 | evaluated | Retained stdout, hard assertions, deterministic quality result |
| Claude | #1 | evaluated | Retained stdout, hard assertions, deterministic quality result |
| Claude | #2 | evaluated | Retained stdout, hard assertions, deterministic quality result |
| Codex | #0 | evaluated | Retained generated artifact text in stderr, stdout, hard assertions, deterministic quality result |
| Codex | #1 | evaluated | Retained generated artifact text in stderr, stdout, hard assertions, deterministic quality result |
| Codex | #2 | evaluated | Retained generated artifact text in stderr, stdout, hard assertions, deterministic quality result |

Limitation: Claude generated file bodies were not retained in `run-000.json`, `run-001.json`, or `run-002.json`; only stdout summaries, assertion results, file lists, and deterministic quality details were available. Claude scores grade retained evidence rather than a complete artifact body.

## Benchmark Context

Original prompt:

> You have the benchmark-test-skill skill installed. Using bench-output.txt and verify-output.txt, write benchmark/test-run-2026-05-11.md with exact evidence from the fixture: `layer1 PASS`, `layer2 SKIPPED`, `passRate=1.0` or `100%`, `p50=1200`, `totalCost=0.42`, raw session path `run-agent-abc`, source file names, literal report path `benchmark/test-run-2026-05-11.md`, and a literal `Recommended next command:` line. Use your runner's command convention for the route, regardless of fixture file names or raw session path text: Claude `/ship`, Codex `$ship`. Do not run pnpm.

Fixture facts:

- `verify-output.txt`: `layer1 PASS in 7.1s`; `layer2 SKIPPED no tests matched run`
- `bench-output.txt`: `Benchmark coverage for run: custom`; `passRate=1.0`; `p50=1200`; `totalCost=0.42`; `raw=tests/benchmarks/runs/run-agent-abc/report.json`
- Expected artifact: `benchmark/test-run-2026-05-11.md`

Deterministic benchmark:

| Runner | Hard Assertion Pass Rate | Deterministic Quality Score | Deterministic Notes |
| --- | ---: | ---: | --- |
| Claude | 100.0% (3/3 evaluated) | 92.4% | 0 threshold failures, 0 critical failures; `benchmark-evidence-reporting` 46.7% |
| Codex | 100.0% (3/3 evaluated) | 92.4% | 0 threshold failures, 0 critical failures; `benchmark-evidence-reporting` 46.7% |

## Agent-Review Verdict

The evaluated outputs are good overall, with one excellent Codex artifact and five good-but-thin retained outputs. All runs respected the fixture, avoided `pnpm`, created the requested report, preserved the required evidence literals in the retained evidence, and used the correct runner-specific next route.

The main residual weakness is report ergonomics. Several retained outputs are closer to a compliance note than a durable benchmark report: they include the required facts, but not always with enough structure, labels, or source traceability to make later audit effortless. Codex #0 is the strongest exemplar because it keeps exact fixture lines, labels the metrics, separates verify and benchmark evidence, and validates the required literals. Codex #2 is the weakest evaluated artifact because it is correct but very compressed, and it records a sandbox path hiccup that is irrelevant to the final report quality.

## Score Table

| Reviewer | Runner | Run | Score | Grade Band | Notes |
| --- | --- | ---: | ---: | --- | --- |
| Codex agent-review | Claude | #0 | 84 | good | Stdout preserves the required facts and `/ship`, but the generated artifact body is unavailable and the quality notes still flag missing reference traits. |
| Codex agent-review | Claude | #1 | 83 | good | Retained evidence names every required field and route; review confidence is limited by missing artifact text and terse stdout-only evidence. |
| Codex agent-review | Claude | #2 | 84 | good | Similar to #1, with clear fixture literals and route; still lacks retained file body for direct report-ergonomics review. |
| Codex agent-review | Codex | #0 | 94 | excellent | Structured artifact with exact fixture lines, labeled verify and benchmark evidence, source file names, report path, and `$ship`. |
| Codex agent-review | Codex | #1 | 86 | good | Complete and scoped, but the artifact is thinner than #0 and relies on fixture-line blocks for some traceability. |
| Codex agent-review | Codex | #2 | 80 | good | Correct and evidence-preserving, but too compact for an exemplar and includes irrelevant sandbox-rejection noise in the retained trace. |

Median subjective score: 84.
Score range: 80-94.

## Common Strengths

- All evaluated outputs stayed inside the fixture and did not run `pnpm`.
- Every evaluated output created or claimed creation of `benchmark/test-run-2026-05-11.md`.
- Runner-specific route conventions were correct: Claude used `/ship`, Codex used `$ship`.
- Retained evidence includes `layer1 PASS`, `layer2 SKIPPED`, `passRate=1.0` or `100%`, `p50=1200`, `totalCost=0.42`, `run-agent-abc`, both source files, and the literal report path.
- No evaluated output introduced GitHub Actions, production deploys, databases, or unsupported external services.

## Common Weaknesses

- Report ergonomics varies: some outputs are fact-complete but too terse for a next operator to audit comfortably.
- Claude artifact retention is still insufficient for direct subjective review of the generated markdown.
- The deterministic rubric's `benchmark-evidence-reporting` criterion reports 46.7% even for outputs that retained the requested evidence, which suggests the trait detector may be underspecified or misaligned with the updated prompt.
- The hard assertions prove literal inclusion but do not distinguish a polished report from a minimal keyword-satisfying report.

## Remediation

| Finding | Classification | Owner Target | Proposed Change | Validation Check | Route |
| --- | --- | --- | --- | --- | --- |
| Generated reports can pass while remaining too terse for durable audit. | target-skill contract | `packs/agentic-skills-bench/codex/benchmark-test-skill/SKILL.md` and `packs/agentic-skills-bench/claude/benchmark-test-skill/SKILL.md` report section | Require a small structured report shape for fixture-backed summaries: source files, verify evidence, benchmark evidence, raw session path, report path, and literal next command. | Re-run the existing layer4 fixture and confirm outputs include labeled sections rather than only a one-line summary. | `$targeted-skill-builder benchmark-test-skill structured fixture report ergonomics` |
| The quality evaluator flags missing `verify status`, `benchmark pass rate`, and `latency` traits even when artifacts include exact literal equivalents such as `layer1 PASS`, `passRate=1.0`, and `p50=1200`. | benchmark rubric | `tests/layer4/setups/tier1-workflows.setup.ts` quality evaluator for `benchmark-test-skill` | Align trait matching with the fixture contract by recognizing exact literals and/or labeled synonyms; keep penalties for unlabeled or missing evidence. | Add layer1 coverage with one accepted structured report and one rejected keyword-only report, then run `pnpm --dir tests verify --skill benchmark-test-skill`. | `$targeted-skill-builder benchmark-test-skill benchmark evidence trait alignment` |
| Claude generated artifact bodies were not retained in persisted run JSON, limiting subjective review. | retained-evidence gap | benchmark harness artifact persistence for generated files under `tests/benchmarks/runs/*/run-*.json` | Persist generated artifact text or a bounded file snapshot for `qualityOutputPath` so agent-review can grade the artifact rather than stdout claims. | Add a harness test that a run result includes retained content for `qualityOutputPath`, then re-run one benchmark smoke. | `$targeted-skill-builder benchmark-agent-review retained artifact evidence` |

## Deterministic-Rubric Notes

The deterministic hard assertions now match the prompt much better than earlier runs: both Claude and Codex are 3/3 with no blocked runs. The remaining mismatch is in the quality trait notes. The quality score is high enough to pass, but `benchmark-evidence-reporting` at 46.7% is misleading when the retained artifacts visibly include the fixture's exact evidence. The rubric should distinguish "evidence present but report is terse" from "evidence missing."

## Next Work

Tighten the `benchmark-test-skill` output contract around structured fixture reports, then align the benchmark evidence trait detector to that contract.

Recommended next command: `$targeted-skill-builder benchmark-test-skill structured fixture report ergonomics`
