# Triage: update-packages Fresh Benchmark Artifact Failure

Date: 2026-05-18

Command: `$session-triage update-packages benchmark failure`

Target: `update-packages` benchmark failure from `benchmark/test-update-packages-2026-05-18.md`

## Evidence Sources

- Curated benchmark report: `benchmark/test-update-packages-2026-05-18.md`
- Raw Claude run directory: `tests/benchmarks/runs/update-packages-claude-5adfd816/`
- Raw Codex run directory: `tests/benchmarks/runs/update-packages-codex-06adb3a6/`
- Benchmark setup: `tests/layer4/setups/tier23-global-workflows.setup.ts`
- Runner and infrastructure classifier: `tests/harness/runner.ts`, `tests/harness/bench-runner.ts`
- Mirrored skill contracts: `global/claude/update-packages/SKILL.md`, `global/codex/update-packages/SKILL.md`
- Relevant lessons: `tasks/lessons.md`

## User-Identified Issue

The fresh `$benchmark-test-skill update-packages` run failed and needs classification: skill-contract gap, benchmark harness defect, generated-output noncompliance, or infrastructure-only block.

## Verification Verdict

Verified as a benchmark harness infrastructure-classification defect with one evaluated passing Claude run, not as an `update-packages` skill-contract gap.

The curated report recorded Claude at 1/3 hard-assertion pass rate and Codex at 0/3, with failed assertions centered on command exit and missing `package-update-plan.md`. Raw evidence shows most failed runs did not produce agent output because the runner failed or timed out before the skill could complete:

- Claude run 0 exited 0, created `package-update-plan.md`, and passed all hard assertions.
- Claude run 1 exited 143 with empty stdout and only the stdin warning, consistent with a runner timeout/termination rather than generated skill noncompliance.
- Claude run 2 exited 1 with `API Error: Unable to connect to API (ConnectionRefused)`.
- Codex runs 0 and 1 exited 0 but stderr contains repeated `failed to connect to websocket`, `failed to lookup address information`, and `Reconnecting...` errors; neither produced stdout or the required artifact.
- Codex run 2 exited 1 after the same websocket/DNS failures and ended with `stream disconnected before completion`.

The current infrastructure classifier only recognizes rate limits, quota exhaustion, budget exhaustion, and image-processing errors, and it returns immediately when `exitCode === 0`. That means Codex connection failures that exit 0 and produce no artifact are treated as evaluated skill failures. It also does not classify exit 143 timeout/termination or API connection refusal as infrastructure blocks.

## Timeline

1. `$benchmark-test-skill update-packages` ran on 2026-05-18 after verify passed.
2. The benchmark setup required `package-update-plan.md`, age-gate evidence, pnpm strategy, major-upgrade handling, verification commands, and runner-native next route.
3. Claude run 0 completed successfully and passed all hard assertions.
4. Later Claude runs were interrupted by timeout/termination and API connection refusal before producing the artifact.
5. All Codex runs logged backend websocket/DNS/stream connection errors and produced no retained artifact.
6. The benchmark report counted these runner failures as evaluated hard assertion and quality failures instead of infrastructure-blocked runs.

## Root Cause

The benchmark harness infrastructure classifier is too narrow for live-agent runner failures.

Specific gaps:

- `classifyInfrastructureBlock` in `tests/harness/bench-runner.ts` exits early for `exitCode === 0`, so a Codex process that exits 0 after backend connection failure but produces no artifact is still evaluated.
- The classifier does not recognize connection-refused, websocket DNS lookup, stream-disconnected, or model/app refresh transport errors.
- The classifier does not recognize exit 143 timeout/termination as an infrastructure block when no meaningful output or artifact exists.
- `runSpawnedCommand` in `tests/harness/runner.ts` kills timed-out commands with `SIGTERM` but does not annotate stderr with a timeout marker, making later classification weaker.

## Responsible Contract Gap

Responsible contract gap: benchmark harness, not `global/claude/update-packages/SKILL.md` or `global/codex/update-packages/SKILL.md`.

The mirrored `update-packages` contracts already require the behavior the benchmark is testing: pnpm preference when safe, 8-day age gates, no unqualified `pnpm@latest`, major-upgrade batch/risk handling, verification, and runner-native migration routes. The observed failed runs mostly did not reach a generated `update-packages` output, so they cannot fairly prove skill noncompliance.

## Recommended Fix

Use `$targeted-skill-builder update-packages benchmark infrastructure classification` to update the benchmark harness.

Suggested implementation scope:

- In `tests/harness/runner.ts`, add an explicit timeout marker when `runSpawnedCommand` terminates a child after `timeoutMs`, such as `Agent runner timed out after <ms>ms`.
- In `tests/harness/bench-runner.ts`, broaden `classifyInfrastructureBlock` to recognize:
  - `connectionrefused`
  - `unable to connect to api`
  - `failed to connect to websocket`
  - `failed to lookup address information`
  - `stream disconnected before completion`
  - `http/request failed`
  - `transport channel closed`
  - explicit timeout markers
- Do not rely solely on nonzero exit codes. If stdout is empty, no expected output artifact exists, and stderr contains known runner transport failures, classify the run as infrastructure-blocked even when exit code is 0.
- Add layer1 coverage using retained Codex stderr shapes from `update-packages-codex-06adb3a6` and a timeout/exit-143 shape from `update-packages-claude-5adfd816`.

Do not loosen `update-packages` hard assertions or quality criteria as part of this fix.

## Validation Plan

- `pnpm --dir tests exec vitest run --project layer1 bench-setups --testNamePattern "infrastructure|update-packages"`
- `pnpm --dir tests exec vitest run --project layer1 bench-report`
- `pnpm --dir tests bench:coverage`
- `pnpm --dir tests verify --skill update-packages`
- Targeted `rg` check that retained connection strings are covered in layer1 fixtures.
- After the classifier fix, rerun `$benchmark-test-skill update-packages` and confirm runner transport failures are counted under infrastructure-blocked runs instead of evaluated failures.

## Confidence and Evidence Gaps

Confidence: high for harness classification defect; medium for whether the next rerun will fully pass, because only one evaluated Claude output completed successfully in the fresh session and all Codex outputs were blocked before producing artifacts.

Evidence gap: no completed Codex `update-packages` output exists in this fresh run, so this triage cannot judge current Codex output quality. Existing earlier same-day reports showed completed Codex outputs, but this triage intentionally scoped itself to the latest failure.

Recommended next skill: `$targeted-skill-builder update-packages benchmark infrastructure classification`
