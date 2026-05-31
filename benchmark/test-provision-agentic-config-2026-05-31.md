# Benchmark Test: provision-agentic-config

Date: 2026-05-31

Target skill: `provision-agentic-config`

Command: `pnpm --dir tests bench --skill provision-agentic-config --agent both --runs 3 --chunk-size 3 --pause 0`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

This is a Phase 41 re-benchmark. The skill was previously graded pre-fixture-remediation with near-zero pass rates; this clean re-run uses the Phase-43 fixture prompt (carries `Recommended next command: $exec` route guidance and the orchestration/monorepo/shipping evidence matrix).

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 2.7s | Skill-relevant static contract checks pass: focused `bench-coverage` + `bench-setups` = 90/90. The full `pnpm verify --skill` run also surfaces one **unrelated, pre-existing** `skill-dev` `.claude/skills` output-path conflict (`targeted-skill-builder` + `create-local-skill`), outside this skill's surface and tracked separately in task history. |
| layer2 | SKIP | -- | No layer2 tests matched `provision-agentic-config`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Threshold Failures | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| claude | 100.0% (3/3) | 0 | 43.8%-100.0% | 98.7% | 0 | 0 | 56.3s | 64.6s | 65.3s | $1.00 | $3.00 | 0.869 | none |
| codex | 66.7% (2/3) | 0 | 20.8%-93.9% | 94.7% | 0 | 1 | 64.3s | 102.2s | 105.6s | $1.00 | $3.00 | 0.889 | none |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| codex | #0 | 0 | Output preserves primary-branch shipping policy; Stdout avoids forbidden pattern `/(?:private\/var\|var\/folders\|tmp)\//i` |

The single Codex failure is genuine output variance (1 of 3 runs): that run omitted the primary-branch shipping-policy text and echoed a `/tmp/...` path in stdout. The other two Codex runs and all three Claude runs passed. No harness/setup false-negative was observed.

## Output Quality

The output-quality score is an additional deterministic rubric score, not a statistical confidence measure.

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 98.7% | 0 | 0 | workflow-actionability 75.0%; all other criteria 100.0% |
| codex | 3 | 94.7% | 0 | 1 | workflow-output-preserves-primary-branch-shipping-policy 66.7%; workflow-actionability 66.7%; all other criteria 100.0% |

## Infrastructure Blocked Runs

- none

## Raw Sessions

- Claude: `tests/benchmarks/runs/provision-agentic-config-claude-5bd3b160/`
- Codex: `tests/benchmarks/runs/provision-agentic-config-codex-86b4839a/`

## Recommendation

Clean re-benchmark with strong results, a large improvement over the pre-fixture near-zero pass rates: Claude 100% hard-assertion pass (98.7% quality), Codex 66.7% (94.7% quality) with a single output-variance failure rather than a harness false-negative. No skill-source or setup change is warranted from this run. The one Codex run that dropped the primary-branch shipping-policy line and leaked a temp path is worth a subjective look if remediation is pursued, but it does not block coverage.

Recommended next command: `/ship`
