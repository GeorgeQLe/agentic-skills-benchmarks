# Benchmark Test: conversion-map

Date: 2026-05-21

Target skill: `conversion-map`

Command: `$benchmark-test-skill conversion-map`

Coverage: custom, `tests/layer4/setups/packs/pack-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.1s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `conversion-map`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 100.0% (3/3) | 0 | 43.8%-100.0% | 100.0% | 0 | 30.1s | 33.1s | 33.4s | $1.00 | $3.00 | 0.878 | 0 |
| codex | 100.0% (3/3) | 0 | 43.8%-100.0% | 100.0% | 0 | 39.1s | 41.3s | 41.5s | $1.00 | $3.00 | 0.803 | 0 |

## Failed Assertions

None — all hard assertions passed.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 100.0% | 0 | 0 | All criteria 100.0% |
| codex | 3 | 100.0% | 0 | 0 | All criteria 100.0% |

Domain enrichment impact: `customer-lifecycle-context` improved from 0% (2026-05-20) to 100% for both agents. `pack-workflow-traits` no longer appears as a separate low-scoring criterion. Overall quality improved from 85.0% to 100.0%.

## Infrastructure Blocked Runs

None.

## Raw Sessions

- Claude: `tests/benchmarks/runs/conversion-map-claude-512230fe/`
- Codex: `tests/benchmarks/runs/conversion-map-codex-c564edf9/`

## Next Route

Recommended next command: `$run`
