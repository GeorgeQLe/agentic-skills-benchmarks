# Session Triage: benchmark-test-skill Fresh Benchmark Failure

Date: 2026-05-12
Target: `$session-triage benchmark-test-skill benchmark failure`
Scope: current repository, fresh benchmark report, persisted Claude/Codex run artifacts, mirrored `benchmark-test-skill` contracts, tier1 benchmark setup, route helper, layer1 setup coverage, and relevant lessons.

## Evidence Sources

- `benchmark/test-benchmark-test-skill-2026-05-12.md`
- `tests/benchmarks/runs/benchmark-test-skill-claude-5893361a/report.json`
- `tests/benchmarks/runs/benchmark-test-skill-claude-5893361a/run-000.json`
- `tests/benchmarks/runs/benchmark-test-skill-claude-5893361a/run-001.json`
- `tests/benchmarks/runs/benchmark-test-skill-claude-5893361a/run-002.json`
- `tests/benchmarks/runs/benchmark-test-skill-codex-97a37d8a/report.json`
- `tests/benchmarks/runs/benchmark-test-skill-codex-97a37d8a/run-000.json`
- `tests/benchmarks/runs/benchmark-test-skill-codex-97a37d8a/run-001.json`
- `tests/benchmarks/runs/benchmark-test-skill-codex-97a37d8a/run-002.json`
- `packs/agentic-skills-bench/codex/benchmark-test-skill/SKILL.md`
- `packs/agentic-skills-bench/claude/benchmark-test-skill/SKILL.md`
- `tests/layer4/setups/tier1-workflows.setup.ts`
- `tests/layer4/setup-helpers/routing.ts`
- `tests/layer1/bench-setups.test.ts`
- `tasks/lessons.md`

## User-Identified Issue

The fresh `$benchmark-test-skill benchmark-test-skill` run still failed after the latest targeted fix and needs triage.

## Verification Verdict

Verified.

The benchmark report shows `benchmark-test-skill` is a custom-covered target, verify passed layer1 in 9.1s across 1,302 tests, and layer2 was skipped because no target-specific layer2 tests matched. Both agent batches completed with no infrastructure-blocked runs.

The fresh failures are concrete:

- Claude passed 1/3 hard assertions. Runs #0 and #1 created `benchmark/test-run-2026-05-11.md` and satisfied the report-field checks, but failed `Output recommends /ship` because the generated content recommended `$ship`.
- Codex passed 2/3 hard assertions. Run #2 exited 0 but did not leave `benchmark/test-run-2026-05-11.md` in the result file list, so the report artifact assertion failed.
- Claude quality averaged 80.0% with 2 threshold failures and 2 critical failures. Codex quality averaged 85.7% with 1 threshold failure and 1 critical failure.

This is not an unknown-skill preflight issue, not a verify-gate failure, and not an infrastructure-blocked benchmark run.

## Timeline

1. The prior `$targeted-skill-builder benchmark-test-skill benchmark failure` update made the benchmark fixture ask for a literal `Recommended next command:` line and added runner-specific `/ship` versus `$ship` route expectations.
2. `$benchmark-test-skill benchmark-test-skill` was rerun.
3. Verify passed; the both-agent benchmark ran.
4. Claude runs #0 and #1 generated the expected report file but chose `$ship` after inferring from `run-codex-abc` in the fixture raw path.
5. Claude run #2 generated the expected report with `/ship` and passed.
6. Codex runs #0 and #1 generated the expected report and passed.
7. Codex run #2 entered the right workflow and began writing the report, but the persisted file list only contains `bench-output.txt` and `verify-output.txt`, so the artifact was absent.

## Root Cause

There are two separate issues.

The primary durable issue is fixture ambiguity. `tests/layer4/setups/tier1-workflows.setup.ts` asks each runner to use its route convention, but the fixture data contains `raw=tests/benchmarks/runs/run-codex-abc/report.json`. Claude runs #0 and #1 explicitly inferred Codex routing from that raw path and recommended `$ship`. The benchmark hard assertion expects `/ship` for Claude. The lesson in `tasks/lessons.md` already says shared benchmark setups must respect Claude slash and Codex dollar conventions; this fixture now does that in assertions, but its evidence text points Claude toward the wrong convention.

The secondary issue is a Codex runner/artifact capture failure in run #2. The run transcript shows Codex read the skill and announced it was creating `benchmark/test-run-2026-05-11.md`; however, the persisted `files` array excludes the `benchmark/` directory and `stdout` is empty. This looks like a runner/tool execution failure or timeout during the write path, not a `benchmark-test-skill` contract defect. It should not drive the primary skill-contract fix unless it recurs after the fixture is clarified.

The mirrored skill contracts are aligned except for expected command syntax differences. They already require report-level literal next-route labels and final-response route labels. The route helper and layer1 tests also recognize literal route labels. The remaining harness gap is the contradictory fixture data and prompt wording.

## Responsible Contract Gap

Primary owner: benchmark coverage fixture for `benchmark-test-skill`.

Files to update:

- `tests/layer4/setups/tier1-workflows.setup.ts`
- `tests/layer1/bench-setups.test.ts`

Optional if implementation exposes contract drift:

- `packs/agentic-skills-bench/codex/benchmark-test-skill/SKILL.md`
- `packs/agentic-skills-bench/claude/benchmark-test-skill/SKILL.md`

No new skill is needed. No broad `$analyze-sessions` pass is needed.

## Recommended Fix

Use `$targeted-skill-builder benchmark-test-skill benchmark failure` for a narrow harness update:

1. Remove route-convention inference from the fixture data. Replace the raw path value `tests/benchmarks/runs/run-codex-abc/report.json` with a neutral value such as `tests/benchmarks/runs/run-agent-abc/report.json`, or make fixture files per-agent so Claude receives a slash-command raw/session clue and Codex receives a dollar-command raw/session clue.
2. Strengthen the fixture prompt to say the runner convention is authoritative and must not be inferred from fixture filenames or raw session paths:

   ```text
   Use your runner's command convention for the route, regardless of file names or raw session path text: Claude `/ship`, Codex `$ship`.
   ```

3. Keep `recommendedRoutes` runner-aware and preserve the current hard assertions for `/ship` on Claude and `$ship` on Codex.
4. Extend layer1 setup coverage to assert the fixture does not contain misleading `run-codex-abc` evidence while simultaneously asking Claude to emit `/ship`.
5. Treat the Codex run #2 artifact-missing case as a retained risk. If it recurs after the fixture update, triage the runner write path separately from the skill contract.

## Validation Plan

Run:

```bash
pnpm --dir tests test:layer1 -- bench-setups bench-quality
pnpm --dir tests bench:coverage
pnpm --dir tests verify --skill benchmark-test-skill
pnpm --dir tests bench --skill benchmark-test-skill --agent claude --runs 1 --chunk-size 1 --pause 0
pnpm --dir tests bench --skill benchmark-test-skill --agent codex --runs 1 --chunk-size 1 --pause 0
git diff --check
```

Success criteria:

- Layer1 fails if the `benchmark-test-skill` fixture combines a Codex-specific raw path with Claude `/ship` expectations.
- Claude one-run benchmark passes the `/ship` route assertion after the fixture no longer nudges it toward `$ship`.
- Codex one-run benchmark still passes the `$ship` route assertion and creates `benchmark/test-run-2026-05-11.md`.
- Quality scoring remains aligned with literal `Recommended next command:` report labels.

## Confidence And Evidence Gaps

Confidence: high that the Claude failures are fixture ambiguity rather than mirrored skill drift. Two Claude run summaries explain the wrong route choice as an inference from the raw path, and the setup currently includes `run-codex-abc` while expecting `/ship` for Claude.

Confidence: medium on the Codex run #2 cause. The transcript shows it was in the right workflow but stopped before a persisted artifact appeared. The temp workdir was cleaned, so the exact local state at failure cannot be inspected. Because Codex passed the same fixture twice in the same session, this looks less like a durable skill contract issue than a runner/tool-write anomaly.

No recurrence analysis is needed unless the artifact-missing failure repeats after the fixture ambiguity is removed.

Recommended next skill: `$targeted-skill-builder benchmark-test-skill benchmark failure`
