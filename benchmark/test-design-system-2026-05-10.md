# Benchmark Test: design-system

**Date:** 2026-05-10
**Claude raw session:** `tests/benchmarks/runs/design-system-claude-d263df0d/`
**Claude generated report:** `tests/benchmarks/runs/design-system-claude-d263df0d/report.md`
**Codex raw session:** `tests/benchmarks/runs/design-system-codex-1a9bc956/`
**Codex generated report:** `tests/benchmarks/runs/design-system-codex-1a9bc956/report.md`

## Verify

| Layer | Status | Wall Time |
| --- | --- | ---: |
| layer1 | PASS | 7.9s |
| layer2 | PASS | 185.7s |

Layer 1 passed 1,186 tests. Layer 2 passed both `design-system` behavior tests.

## Benchmark

| Agent | Runs | Evaluated | Infrastructure-blocked | Evaluated pass rate | Wilson 95% CI | Latency p50 | Latency p95 | Latency p99 | Cost/run | Total cost | Mean similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Claude | 3 | 3 | 0 | 100.0% | 43.8% - 100.0% | 154.9s | 319.0s | 333.6s | $1.00 | $3.00 | 0.822 | 0 |
| Codex | 3 | 3 | 0 | 0.0% | 0.0% - 56.2% | 429.8s | 1014.6s | 1066.6s | $1.00 | $3.00 | 1.000 | 0 |

## Failed Assertions

Claude had no failed assertions.

Codex failed the same assertion in all three evaluated runs:

| Run | Exit Code | Failed Assertion |
| ---: | ---: | --- |
| 1 | 0 | `DESIGN.md created in project root` |
| 2 | 0 | `DESIGN.md created in project root` |
| 3 | 0 | `DESIGN.md created in project root` |

## Infrastructure Blocked Runs

No infrastructure-blocked runs were reported for either agent.

## Next Step

Recommended next command: `$session-triage design-system benchmark failure`
