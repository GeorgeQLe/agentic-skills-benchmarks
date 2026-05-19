# Benchmark Test: affected

Date: 2026-05-19

Target skill: `affected`

Command: `$benchmark-test-skill affected`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.3s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `affected`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/1) | 2 | 0.0%-79.3% | 68.2% | 1 | 31.3s | 31.3s | 31.3s | $0.25 | $0.75 | 1.000 | 0 |
| codex | 0.0% (0/3) | 0 | 0.0%-56.2% | 40.9% | 6 | 28.5s | 30.2s | 30.3s | $0.25 | $0.75 | 1.000 | 0 |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| claude | #0 | 0 | Output recommends $run |
| codex | #0 | 0 | Output includes affected packages; Output recommends $run |
| codex | #1 | 0 | Output includes affected packages; Output recommends $run |
| codex | #2 | 0 | Output includes affected packages; Output recommends $run |

**Route mismatch:** Both agents produce a `Next command` section with actual validation commands (`pnpm --filter ...`) instead of the expected `$run`. The fixture prompt says "write ... Next command" without specifying which command, and agents reasonably interpret "Next command" as "the next command to run" rather than "which skill to invoke next."

**Missing literal "affected packages":** Codex sections use "Directly Changed" and "Transitively Affected" headers rather than the literal string `affected packages` expected by `assertContentIncludes`.

## Output Quality

The output-quality score is an additional deterministic rubric score, not a statistical confidence measure.

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 1 | 68.2% | 1 | 1 | `workflow-artifact-reference` 0.0%; `workflow-next-route` 0.0%; `workflow-actionability` 50.0%; `workflow-fixture-facts` 100.0%; `workflow-domain-specificity` 100.0% |
| codex | 3 | 40.9% | 3 | 6 | `workflow-fixture-facts` 0.0%; `workflow-artifact-reference` 0.0%; `workflow-next-route` 0.0%; `workflow-actionability` 50.0%; `workflow-domain-specificity` 100.0% |

Both agents correctly identify the changed files, trace the `web → shared` dependency, and produce reasonable validation commands. The quality failures are primarily:
- `workflow-next-route`: expects `$run` in the recommended next command
- `workflow-artifact-reference`: may expect specific file naming conventions
- `workflow-fixture-facts` (Codex): may expect specific fixture fact strings

## Infrastructure Blocked Runs

| Agent | Run | Reason |
| --- | ---: | --- |
| claude | #1 | agent runner budget exceeded |
| claude | #2 | agent runner budget exceeded |

## Raw Sessions

- Claude: `tests/benchmarks/runs/affected-claude-781a30d1/`
- Codex: `tests/benchmarks/runs/affected-codex-a832b4a2/`

## Triage

**Core issue — fixture routing expectation:** The `affected` fixture expects `$run` as the recommended next command, but both agents interpret "Next command" literally and provide the actual shell commands to run (pnpm filter commands). This is a fixture-prompt clarity issue, not a skill deficiency.

**"affected packages" literal match:** The hard assertion expects the output to contain the literal string "affected packages," but Codex uses "Directly Changed" and "Transitively Affected" as section headers. The Claude output uses "Directly Changed Packages" which also misses the exact match.

**Remediation options:**
1. **Prompt fix:** Add explicit routing guidance: "End with Recommended next command: $run" and require the literal phrase "affected packages" somewhere in the output.
2. **Assertion relaxation:** Accept the pnpm commands as valid next commands, and accept synonyms like "Directly Changed Packages" or "Transitively Affected" for the "affected packages" assertion.
3. **Both:** Tighten the prompt for route while relaxing the content match.

Recommended next route: `$session-triage` to decide fixture adjustments before rerunning.
