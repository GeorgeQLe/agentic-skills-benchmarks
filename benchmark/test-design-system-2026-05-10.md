# Benchmark Test: design-system

**Date:** 2026-05-10
**Raw session:** `tests/benchmarks/runs/design-system-d7f8c628/`
**Generated report:** `tests/benchmarks/runs/design-system-d7f8c628/report.md`

## Verify

| Layer | Status | Wall Time |
| --- | --- | ---: |
| layer1 | PASS | 7.4s |
| layer2 | PASS | 177.2s |

Layer 1 passed 1,185 tests. Layer 2 passed both `design-system` behavior tests.

## Benchmark

| Metric | Result |
| --- | ---: |
| Runs | 3 |
| Evaluated runs | 1 |
| Infrastructure-blocked runs | 2 |
| Passed evaluated runs | 1 |
| Evaluated pass rate | 100.0% |
| Wilson 95% CI | 20.7% - 100.0% |
| Latency p50 | 13.5s |
| Latency p95 | 104.9s |
| Latency p99 | 113.0s |
| Cost per run | $1.00 |
| Total cost | $3.00 |
| Mean pairwise similarity | 1.000 |
| Outliers | 0 |

## Failed Assertions

No evaluated runs failed skill assertions.

## Infrastructure Blocked Runs

Runs 1 and 2 were blocked before skill behavior could be evaluated:

| Run | Exit Code | Reason |
| ---: | ---: | --- |
| 1 | 1 | agent runner rate limit |
| 2 | 1 | agent runner rate limit |

Both blocked runs exited after the agent runner reported: `You've hit your limit · resets 3:40pm (America/New_York)`. They should not count as skill failures.

## Next Step

Recommended next command: `$session-triage design-system benchmark failure`
