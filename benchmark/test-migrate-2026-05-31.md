# Benchmark Test: migrate

Date: 2026-05-31

Target skill: `migrate`

Command: `pnpm --dir tests bench --skill migrate --agent both --runs 3 --chunk-size 3 --pause 0`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

This is a Phase 41 re-benchmark. The skill was previously graded pre-fixture-remediation with a 0% Claude pass rate and 3/3 Codex infrastructure-blocked runs; this clean re-run uses the Phase-43 fixture prompt with explicit `$exec` next-route guidance and the per-run budget.

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 2.7s | Skill-relevant static contract checks pass: focused `bench-coverage` + `bench-setups` = 90/90. |
| layer2 | SKIP | -- | No layer2 tests matched `migrate`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Threshold Failures | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| claude | 33.3% (1/3) | 0 | 6.1%-79.2% | 85.6% | 2 | 2 | 52.6s | 54.5s | 54.7s | $1.00 | $3.00 | 1.000 | none |
| codex | 33.3% (1/3) | 0 | 6.1%-79.2% | 79.5% | 2 | 2 | 44.6s | 51.3s | 51.9s | $1.00 | $3.00 | 1.000 | none |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| claude | #0 | 0 | Output recommends $exec |
| claude | #2 | 0 | Output recommends $exec |
| codex | #0 | 0 | Output includes phases |
| codex | #2 | 0 | Output includes phases |

This is a real clean-run failure pattern, not an infrastructure block. Claude reliably created `migration-plan.md` and included the requested content, but two runs did not preserve the required final `$exec` next-route. Codex reliably created `migration-plan.md` and preserved the `$exec` route, but two runs missed the literal `phases` assertion shape.

## Output Quality

The output-quality score is an additional deterministic rubric score, not a statistical confidence measure.

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 85.6% | 2 | 2 | workflow-next-route 33.3%; workflow-actionability 75.0%; workflow-fixture-facts 100.0%; workflow-artifact-reference 100.0%; workflow-domain-specificity 100.0% |
| codex | 3 | 79.5% | 2 | 2 | workflow-fixture-facts 33.3%; workflow-actionability 75.0%; workflow-artifact-reference 100.0%; workflow-next-route 100.0%; workflow-domain-specificity 100.0% |

## Infrastructure Blocked Runs

- none

## Raw Sessions

- Claude: `tests/benchmarks/runs/migrate-claude-7c742313/`
- Codex: `tests/benchmarks/runs/migrate-codex-f3658761/`

## Recommendation

Clean re-benchmark with partial improvement over the pre-fixture run: both agents now complete all three runs without infrastructure blocks and create `migration-plan.md`, but both still pass only 1/3 hard-assertion runs. Do not mass-rerun. The next step should inspect whether the remaining misses are skill-contract weakness, fixture/rubric literalism, or generated-output noncompliance: Claude route preservation (`$exec`) and Codex literal `phases` coverage.

Recommended next command: `$session-triage migrate benchmark failure`
