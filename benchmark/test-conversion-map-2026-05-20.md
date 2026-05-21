# Benchmark Test: conversion-map

Date: 2026-05-20

Target skill: `conversion-map`

Command: `$benchmark-test-skill conversion-map`

Coverage: custom, `tests/layer4/setups/packs/pack-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.0s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `conversion-map`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 100.0% (3/3) | 0 | 43.8%-100.0% | 85.0% | 0 | 25.1s | 28.2s | 28.4s | $1.00 | $3.00 | 0.929 | 0 |
| codex | 100.0% (3/3) | 0 | 43.8%-100.0% | 85.0% | 0 | 33.8s | 40.6s | 41.2s | $1.00 | $3.00 | 0.908 | 0 |

## Failed Assertions

None.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 85.0% | 0 | 0 | `customer-lifecycle-context` 0.0%; `pack-workflow-traits` 50.0%; `pack-skill-context` 100.0%; `pack-fixture-evidence` 100.0%; `pack-practical-risk-or-validation` 100.0% |
| codex | 3 | 85.0% | 0 | 0 | `customer-lifecycle-context` 0.0%; `pack-workflow-traits` 50.0%; `pack-skill-context` 100.0%; `pack-fixture-evidence` 100.0%; `pack-practical-risk-or-validation` 100.0% |

Both agents score identically: 0% on `customer-lifecycle-context` domain criterion, 50% on `pack-workflow-traits`.

## Infrastructure Blocked Runs

None.

## Raw Sessions

- Claude: `tests/benchmarks/runs/conversion-map-claude-8b124c68/`
- Codex: `tests/benchmarks/runs/conversion-map-codex-65e062dc/`

## Next Route

Recommended next command: `$run`
