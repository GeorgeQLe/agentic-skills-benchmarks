# Triage: benchmark-test-skill Benchmark Failure

Date: 2026-05-13
Target: `$session-triage benchmark-test-skill benchmark failure`
Scope: `benchmark-test-skill` 2026-05-13 benchmark report, persisted Claude/Codex run artifacts, mirrored skill contracts, and tier1 benchmark setup.

## Evidence Sources

- `benchmark/test-benchmark-test-skill-2026-05-13.md`
- `tests/benchmarks/runs/benchmark-test-skill-claude-92d5d568/report.json`
- `tests/benchmarks/runs/benchmark-test-skill-claude-92d5d568/run-000.json`
- `tests/benchmarks/runs/benchmark-test-skill-claude-92d5d568/run-001.json`
- `tests/benchmarks/runs/benchmark-test-skill-claude-92d5d568/run-002.json`
- `tests/benchmarks/runs/benchmark-test-skill-codex-234ee94c/run-000.json`
- `tests/layer4/setups/tier1-workflows.setup.ts`
- `tests/layer1/bench-setups.test.ts`
- `packs/agentic-skills-bench/codex/benchmark-test-skill/SKILL.md`
- `packs/agentic-skills-bench/claude/benchmark-test-skill/SKILL.md`
- `tasks/lessons.md`

## User-Identified Issue

The fresh `$benchmark-test-skill benchmark-test-skill` run failed and needs triage.

## Verification Verdict

Verified.

The 2026-05-13 benchmark report shows Claude failed 0/3 evaluated hard assertions, while Codex passed 3/3. No runs were infrastructure-blocked. Each Claude run exited successfully, created `benchmark/test-run-2026-05-11.md`, included the required sections, exact fixture facts, source file names, raw session path, and the correct Claude route `/ship`, but failed `Output matches workflow expectation`.

The failed quality criterion was consistent across all Claude runs: `metrics-table-structure`. The persisted run notes say the missing patterns were the `p50=1200` and `totalCost=0.42` evidence rows inside the `## Benchmark Metrics` table. The hard assertion regex in `tests/layer4/setups/tier1-workflows.setup.ts` requires pass rate, p50, and total cost as metric-table rows before `## Raw Evidence`.

Codex run 0 demonstrates the intended structure: separate `Benchmark Metrics` table rows for `passRate`, `p50`, `totalCost`, and raw session path.

## Timeline

1. `$benchmark-test-skill benchmark-test-skill` ran on 2026-05-13.
2. Eligibility passed with `coverage=custom` from `tests/layer4/setups/tier1-workflows.setup.ts`.
3. Verify passed: layer1 `PASS` in 9.2s across 1,312 tests; layer2 skipped because no target-specific layer2 tests matched.
4. Claude completed three evaluated benchmark runs with no infrastructure blocks.
5. Claude included all broad required facts and the `/ship` route, but all three runs failed the structural workflow expectation and critical `metrics-table-structure` quality criterion.
6. Codex completed three evaluated runs and passed hard assertions plus quality checks.

## Root Cause

The responsible gap is benchmark fixture prompt specificity.

The tier1 setup now requires exact metric evidence tokens to appear as rows inside `## Benchmark Metrics`, but the prompt only says to use Markdown tables for the verify and benchmark metrics sections and to include exact evidence from the fixture. That is enough for a runner to place `p50=1200` and `totalCost=0.42` in prose, summary text, or raw evidence while still believing it followed the instruction. The assertion is stricter than the prompt.

The mirrored Claude and Codex `benchmark-test-skill` contracts are aligned at the workflow level. They require real benchmark reports to include evaluated pass rate, latency p50/p95/p99, cost, raw session path, and next routing. They do not require the artificial fixture's exact `p50=1200` and `totalCost=0.42` evidence tokens to appear as separate metric-table rows. This is appropriate for real reports, so the benchmark failure should not be fixed by overfitting the skill contract.

## Responsible Contract Gap

`tests/layer4/setups/tier1-workflows.setup.ts`

The custom `benchmark-test-skill` fixture should make its expected table shape explicit. The hard assertion and output-quality rubric are coherent with each other, but the prompt should state the required row-level table contract in terms the runner can directly follow.

## Recommended Fix

Route to `$targeted-skill-builder benchmark-test-skill benchmark failure` for a narrow benchmark harness update.

Update the `benchmark-test-skill` setup prompt in `tests/layer4/setups/tier1-workflows.setup.ts` to require the `## Benchmark Metrics` table to contain separate rows with these exact evidence tokens:

- `passRate=1.0` or `100%`
- `p50=1200`
- `totalCost=0.42`
- `run-agent-abc`

Suggested prompt wording:

```text
In the `## Benchmark Metrics` section, create a Markdown table with one row each for pass rate, p50 latency, total cost, and raw session path. The pass-rate row must contain `passRate=1.0` or `100%`; the p50 row must contain `p50=1200`; the total-cost row must contain `totalCost=0.42`; the raw-session row must contain `run-agent-abc`.
```

Do not loosen the `metrics-table-structure` assertion. The benchmark already has a regression test rejecting reports that keep the facts but move metrics out of the table, and that is the behavior this setup is intended to enforce.

## Validation Plan

Run these checks after the targeted update:

```bash
pnpm --dir tests test:layer1 -- bench-setups bench-quality
pnpm --dir tests verify --skill benchmark-test-skill
pnpm --dir tests bench --skill benchmark-test-skill --agent claude --runs 1 --chunk-size 1 --pause 0
git diff --check
```

Expected result: layer1 still rejects malformed metrics-table reports, verify passes, and a fresh one-run Claude smoke passes the hard workflow expectation with `metrics-table-structure` satisfied. If the one-run Claude smoke still fails with the same criterion after the prompt is explicit, then the next triage should classify the remaining issue as runner noncompliance rather than harness ambiguity.

## Confidence And Evidence Gaps

Confidence: high.

The evidence is consistent across all three Claude failures, and Codex passing output shows the expected shape is achievable. The only evidence gap is that the harness does not persist the full generated Claude report body in `run-*.json`, so this triage relies on assertion results, quality notes, stdout summaries, and file presence rather than direct inspection of the generated Markdown. That is sufficient to identify the mismatch because the missing regex patterns are recorded in the quality notes.

No broad `$analyze-sessions` run is needed; this is a focused benchmark setup issue.

Recommended next skill: `$targeted-skill-builder benchmark-test-skill benchmark failure`
