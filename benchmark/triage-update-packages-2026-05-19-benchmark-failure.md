# Triage: update-packages Benchmark Failure

Date: 2026-05-19
Command: `$session-triage update-packages benchmark failure`
Target: `update-packages` benchmark failure from `benchmark/test-update-packages-2026-05-19.md`

## Evidence Sources

- Curated benchmark report: `benchmark/test-update-packages-2026-05-19.md`
- Raw Claude run directory: `tests/benchmarks/runs/update-packages-claude-dc9580ca/`
- Raw Codex run directory: `tests/benchmarks/runs/update-packages-codex-f04f15cc/`
- Raw failed run: `tests/benchmarks/runs/update-packages-claude-dc9580ca/run-001.json`
- Raw passing Claude run: `tests/benchmarks/runs/update-packages-claude-dc9580ca/run-000.json`
- Runner infrastructure classifier: `tests/harness/bench-runner.ts`
- Mirrored skill contracts: `global/claude/update-packages/SKILL.md`, `global/codex/update-packages/SKILL.md`
- Prior related triage: `benchmark/triage-update-packages-2026-05-18-fresh-artifact-failure.md`
- Relevant lessons: `tasks/lessons.md`

## User-Identified Issue

The latest `$benchmark-test-skill update-packages` run failed and needs classification: skill-contract gap, benchmark harness defect, generated-output noncompliance, or infrastructure-only block.

## Verification Verdict

Verified as a benchmark harness infrastructure-classification defect for the evaluated hard failure, with a separate noncritical generated-output quality gap in the passing Claude artifact.

Supporting evidence:

- `benchmark/test-update-packages-2026-05-19.md` reports Claude at 1/2 evaluated hard assertion pass rate with one infrastructure-blocked timeout and one evaluated failure.
- Claude run 1 exited `1`, created no `package-update-plan.md`, and stdout is only `API Error: The socket connection was closed unexpectedly. For more information, pass \`verbose: true\` in the second argument to fetch()`.
- The current classifier in `tests/harness/bench-runner.ts` recognizes connection-refused, websocket, DNS lookup, stream-disconnect, HTTP/request, transport-channel, timeout, rate-limit, quota, budget, and image-processing failures, but it does not recognize the retained socket-close transport error.
- Because the socket-close run had no meaningful skill output and no expected artifact, the hard assertion and critical quality failures are not evidence that `update-packages` failed to follow its contract.
- Claude run 0 did complete and produced `package-update-plan.md`; it passed all hard assertions and scored 95.5% quality, but the noncritical `workflow-targeted-migration-routes` criterion scored 0 because the stop condition said `/migrate` instead of `/migrate react-19` or `/migrate vitest-3`.
- Codex completed two evaluated runs with 2/2 hard assertion pass rate, 100.0% quality, and one separately classified timeout block.

## Timeline

1. `$benchmark-test-skill update-packages` ran on 2026-05-19 after verify passed with layer1 PASS and layer2 SKIP.
2. Claude run 0 completed successfully, created `package-update-plan.md`, passed hard assertions, and retained a mostly compliant package update plan.
3. Claude run 1 failed before producing the expected artifact and returned only a live-agent API socket-close error.
4. Claude run 2 was classified correctly as an infrastructure-blocked timeout.
5. Codex runs 0 and 1 completed successfully; Codex run 2 was classified correctly as an infrastructure-blocked timeout.
6. The curated benchmark report counted Claude run 1 as an evaluated skill failure instead of an infrastructure-blocked transport failure.

## Root Cause

The benchmark infrastructure classifier is still missing one live-agent transport error shape: `The socket connection was closed unexpectedly`.

The mirrored `update-packages` skill contracts already require the package-update behavior that the benchmark evaluates:

- use pnpm where safe instead of npm,
- avoid unqualified `pnpm@latest`,
- prove the selected pnpm version is older than 8 full days,
- enforce `min-release-age=8` and pnpm's `11520` minute equivalent,
- batch major upgrades with verification and stop conditions,
- route broad compatibility work to runner-native targeted migrate commands.

The observed evaluated hard failure did not reach a generated `update-packages` output, so changing the skill contract would not address it.

The passing Claude artifact's bare `/migrate` route is generated-output noncompliance with an adequate contract, but it did not cause the benchmark failure threshold by itself. It should be tracked as evidence for future subjective review or runner behavior analysis, not as a reason to loosen the benchmark or rewrite the skill contract.

## Responsible Contract Gap

Responsible gap: benchmark harness infrastructure classification in `tests/harness/bench-runner.ts`.

No responsible gap was found in `global/claude/update-packages/SKILL.md` or `global/codex/update-packages/SKILL.md` for this failure.

## Recommended Fix

Use `$targeted-skill-builder update-packages benchmark socket transport classification`.

Implement the narrow harness fix:

- In `tests/harness/bench-runner.ts`, extend `classifyInfrastructureBlock` to classify live-agent socket-close transport failures as infrastructure blocks, including the retained phrase `socket connection was closed unexpectedly`.
- Add focused layer1 coverage using the retained Claude run 1 shape from `tests/benchmarks/runs/update-packages-claude-dc9580ca/run-001.json`.
- Keep `update-packages` hard assertions and quality criteria intact.
- Do not classify successful outputs that merely discuss sockets or connection handling as infrastructure blocks unless they have the runner-failure shape and no meaningful expected artifact/output.

Do not change the mirrored `update-packages` skill contracts for this issue. They already require targeted migrate routes and the age-gated pnpm behavior.

## Validation Plan

- `pnpm --dir tests exec vitest run --project layer1 bench-setups --testNamePattern "infrastructure|update-packages"`
- `pnpm --dir tests bench:coverage`
- `pnpm --dir tests verify --skill update-packages`
- Targeted check that `classifyInfrastructureBlock` includes `socket connection was closed unexpectedly`.
- After the classifier fix, rerun `$benchmark-test-skill update-packages` and confirm socket-close transport failures are reported as infrastructure-blocked runs rather than evaluated hard assertion and quality failures.

## Confidence and Evidence Gaps

Confidence: high for the infrastructure-classification diagnosis, because the failed run contains only a live-agent API socket-close error and no retained skill artifact.

Evidence gap: this triage did not inspect broad session history because the latest report, retained run JSON, current classifier, mirrored skill contracts, and prior related triage were sufficient. `$analyze-sessions` is not needed for this narrow incident.

Residual note: Claude run 0's bare `/migrate` stop route is a real generated-output quality miss against the existing contract. If similar misses recur after infrastructure failures are classified correctly, route that separate pattern to `$benchmark-agent-review update-packages` or a focused runner-output remediation.

Recommended next skill: `$targeted-skill-builder update-packages benchmark socket transport classification`
