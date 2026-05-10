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
| Passed | 1 |
| Pass rate | 33.3% |
| Wilson 95% CI | 6.1% - 79.2% |
| Latency p50 | 13.5s |
| Latency p95 | 104.9s |
| Latency p99 | 113.0s |
| Cost per run | $1.00 |
| Total cost | $3.00 |
| Mean pairwise similarity | 1.000 |
| Outliers | 0 |

## Failed Assertions

Runs 1 and 2 failed one assertion each:

| Run | Exit Code | Failed Assertion |
| ---: | ---: | --- |
| 1 | 1 | DESIGN.md created in project root |
| 2 | 1 | DESIGN.md created in project root |

Both failed runs exited after the agent runner reported: `You've hit your limit · resets 3:40pm (America/New_York)`. The missing `DESIGN.md` assertion is therefore a harness-runner limit failure, not evidence that the skill completed and produced incorrect output.

## Next Step

Recommended next command: `$session-triage design-system benchmark failure`
