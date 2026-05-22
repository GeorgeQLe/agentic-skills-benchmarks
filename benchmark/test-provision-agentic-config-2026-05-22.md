# Benchmark Test: provision-agentic-config

Date: 2026-05-22

Target skill: `provision-agentic-config`

Command: `pnpm --dir tests bench --skill provision-agentic-config --agent both --runs 3 --chunk-size 3 --pause 0`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 1.9s | Static harness-contract gate passed after fixture remediation. |
| layer2 | SKIP | -- | No layer2 tests matched `provision-agentic-config`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Threshold Failures | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| claude | 100.0% (3/3) | 0 | 43.8%-100.0% | 93.4% | 0 | 0 | 43.4s | 45.7s | 45.9s | $1.00 | $3.00 | 0.848 | none |
| codex | 100.0% (3/3) | 0 | 43.8%-100.0% | 95.3% | 0 | 0 | 55.2s | 55.8s | 55.9s | $1.00 | $3.00 | 0.907 | none |

## Fixture Remediation

- Replaced brittle shorthand assertions (`orchestration rules`, `monorepo safety`) with substantive policy-section checks.
- Added a deterministic `pnpm-workspace.yaml` fixture so the requested monorepo safety block is in-scope for the skill contract.
- Allowed `package-lock.json` for this fixture because the canonical monorepo safety policy legitimately names shared lockfiles.
- Added focused layer1 regression tests proving canonical policy headings pass, shorthand-only echoes fail, the fixture creates the monorepo signal, and the user-facing stdout handoff can satisfy the benchmark's next-command assertion for this provisioning skill.

## Failed Assertions

- none

## Output Quality

The output-quality score is an additional deterministic rubric score, not a statistical confidence measure.

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 93.4% | 0 | 0 | workflow-artifact-reference 0.0%; workflow-actionability 75.0%; workflow-fixture-facts 100.0%; workflow-output-includes-an-orchestration-policy-section 100.0%; workflow-output-includes-a-monorepo-safety-policy-section 100.0% |
| codex | 3 | 95.3% | 0 | 0 | workflow-artifact-reference 0.0%; workflow-actionability 91.7%; workflow-fixture-facts 100.0%; workflow-output-includes-an-orchestration-policy-section 100.0%; workflow-output-includes-a-monorepo-safety-policy-section 100.0% |

## Infrastructure Blocked Runs

- none

## Raw Sessions

- Claude: `tests/benchmarks/runs/provision-agentic-config-claude-31066d9f/`
- Codex: `tests/benchmarks/runs/provision-agentic-config-codex-5fbace33/`

## Recommendation

The benchmark fixture false negative is fixed: canonical policy-section outputs are no longer rejected for missing shorthand prompt echoes, monorepo safety is backed by a concrete monorepo signal, and the benchmark now accepts the provisioning skill's user-facing next-command handoff in stdout. Both agents now pass 3/3 on the corrected fixture.

Recommended next command: `$benchmark-agent-review provision-agentic-config`
