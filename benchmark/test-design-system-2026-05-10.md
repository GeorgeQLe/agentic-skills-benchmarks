# Benchmark Test: design-system

**Date:** 2026-05-10
**Raw session:** `tests/benchmarks/runs/design-system-534194ed/`
**Generated report:** `tests/benchmarks/runs/design-system-534194ed/report.md`

## Verify

| Layer | Status | Wall Time |
| --- | --- | ---: |
| layer1 | PASS | 7.5s |
| layer2 | PASS | 167.1s |

Layer 1 passed 1,184 tests. Layer 2 passed both `design-system` behavior tests.

## Benchmark

| Metric | Result |
| --- | ---: |
| Runs | 3 |
| Passed | 2 |
| Pass rate | 66.7% |
| Wilson 95% CI | 20.8% - 93.9% |
| Latency p50 | 91.0s |
| Latency p95 | 225.0s |
| Latency p99 | 236.9s |
| Cost per run | $1.00 |
| Total cost | $3.00 |
| Mean pairwise similarity | 0.843 |
| Outliers | 0 |

## Failed Assertions

Run 2 failed one assertion:

| Assertion | Result |
| --- | --- |
| Interview log created | FAIL |

All other benchmark assertions passed in all runs.

## Next Step

Recommended next command: `$session-triage design-system benchmark failure`
