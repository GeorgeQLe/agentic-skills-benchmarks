# Benchmark Test: icon-handler — 2026-05-13

## Command Resolution

- Active workflow: `$benchmark-test-skill`
- Target skill under test: `icon-handler`
- Harness coverage: `custom`
- Setup path: `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 8.8s | 1,352 tests passed across 12 files. |
| layer2 | SKIP | -- | No target-specific layer2 tests matched `icon-handler`. |

## Benchmark Summary

Command:

```bash
pnpm bench --skill icon-handler --agent both --runs 3 --chunk-size 3 --pause 0
```

| Agent | Session | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Quality Score | Threshold Failures | Critical Failures |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | `7d05699b` | 33.3% (1/3) | 0 | [6.1%, 79.2%] | 40.2% | 2 | 6 |
| codex | `e4f1a34a` | 100.0% (3/3) | 0 | [43.8%, 100.0%] | 84.1% | 0 | 0 |

Output-quality score is an additional deterministic rubric score, not a statistical confidence measure.

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| claude | 0 | 1 | `Agent command exited successfully`; `icon-audit.md created in project root` |
| claude | 1 | 1 | `Agent command exited successfully`; `icon-audit.md created in project root` |

Codex had no failed hard assertions.

## Output Quality Details

### Claude

Lowest-scoring criteria:

| Criterion | Average Score |
| --- | ---: |
| `workflow-artifact-reference` | 0.0% |
| `workflow-actionability` | 8.3% |
| `workflow-fixture-facts` | 33.3% |
| `workflow-next-route` | 33.3% |
| `workflow-domain-specificity` | 33.3% |

### Codex

Lowest-scoring criteria:

| Criterion | Average Score |
| --- | ---: |
| `workflow-artifact-reference` | 0.0% |
| `workflow-actionability` | 25.0% |
| `workflow-fixture-facts` | 100.0% |
| `workflow-next-route` | 100.0% |
| `workflow-domain-specificity` | 100.0% |

## Infrastructure-Blocked Runs

- Claude: none
- Codex: none

## Latency

| Agent | p50 | p95 | p99 |
| --- | ---: | ---: | ---: |
| claude | 21.6s | 30.0s | 30.8s |
| codex | 65.8s | 71.5s | 72.0s |

## Cost

| Agent | Cost Per Run | Total Cost |
| --- | ---: | ---: |
| claude | $0.25 | $0.75 |
| codex | $0.25 | $0.75 |
| total | -- | $1.50 |

## Consistency

| Agent | Mean Pairwise Similarity | Outliers |
| --- | ---: | ---: |
| claude | 1.000 | 0 |
| codex | 0.825 | 0 |

## Raw Session Paths

- Claude: `tests/benchmarks/runs/icon-handler-claude-7d05699b/`
- Codex: `tests/benchmarks/runs/icon-handler-codex-e4f1a34a/`

## Interpretation

The benchmark produced evaluated runs for both agents with no infrastructure blocks. Codex passed all hard assertions. Claude failed 2 of 3 evaluated runs because the agent command exited nonzero and did not create the required `icon-audit.md` artifact in the project root.

Recommended next command: `$session-triage icon-handler benchmark failure`
