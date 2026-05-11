# Benchmark Agent Review: ship

**Date:** 2026-05-11
**Target:** `ship`
**Source benchmark report:** `benchmark/test-ship-2026-05-11.md`

## Source Evidence

- `tests/benchmarks/runs/ship-claude-726530ae/report.md`
- `tests/benchmarks/runs/ship-claude-726530ae/report.json`
- `tests/benchmarks/runs/ship-claude-726530ae/run-000.json`
- `tests/benchmarks/runs/ship-claude-726530ae/run-001.json`
- `tests/benchmarks/runs/ship-claude-726530ae/run-002.json`
- `tests/benchmarks/runs/ship-codex-b69cb187/report.md`
- `tests/benchmarks/runs/ship-codex-b69cb187/report.json`
- `tests/benchmarks/runs/ship-codex-b69cb187/run-000.json`
- `tests/benchmarks/runs/ship-codex-b69cb187/run-001.json`
- `tests/benchmarks/runs/ship-codex-b69cb187/run-002.json`

## Reviewed Outputs

| Runner | Run indexes | Infrastructure-blocked | Hard assertion pass rate | Deterministic quality score |
|--------|-------------|------------------------|--------------------------|-----------------------------|
| claude | 0, 1, 2 | 0 | 100.0% (3/3) | 78.6% average |
| codex | 0, 1, 2 | 0 | 100.0% (3/3) | 78.6% average |

No runs were infrastructure-blocked, so all six persisted outputs were eligible for subjective review.

The retained artifacts include stdout/stderr transcripts and the created `ship-manifest.md` patches for Codex runs. Claude retained only the final stdout summary plus file list, so Claude scoring is limited by missing manifest text and cannot judge all wording details directly.

## Agent-Review Scores

| Reviewer | Runner | Run index | Score | Grade band |
|----------|--------|-----------|-------|------------|
| codex | claude | 0 | 74 | Usable but meaningfully incomplete |
| codex | claude | 1 | 74 | Usable but meaningfully incomplete |
| codex | claude | 2 | 74 | Usable but meaningfully incomplete |
| codex | codex | 0 | 86 | Good |
| codex | codex | 1 | 84 | Good |
| codex | codex | 2 | 88 | Good |

**Median subjective score:** 79
**Score range:** 74-88

## Common Strengths

- All evaluated outputs selected the right task: create `ship-manifest.md` from `tasks/todo.md` and `diff-summary.txt`.
- All runs preserved runner-specific next-route convention: Claude used `/run`; Codex used `$run`.
- The manifest outputs covered the required shipping fields and avoided git commands as the fixture requested.
- Codex runs tied changed files and tests to concrete fixture evidence, especially `tests/example.test.ts`, `tasks/todo.md`, and the validation-passed note.
- Scope control was strong: no run invented a deployment, committed files, or broadened the fixture into a full repository ship.

## Common Weaknesses

- Claude retained output is too terse for a high-confidence human review. The run summaries say the manifest was written, but the persisted evidence does not include the manifest body.
- The deterministic quality score caught the main issue: every run failed the `evidence-linked` criterion even though hard assertions passed.
- The fixture prompt only required six manifest sections, while the real Codex `ship` contract expects a richer manifest for non-trivial shipping boundaries: per-file purpose, user-goal mapping, skipped tests, adversarial review, residual risk, and explicit next work.
- Validation strength is adequate for the tiny fixture but would be weak for real shipping. The outputs repeat "validation passed" rather than naming an executable command or log source.
- The rollback notes are practical but generic. They identify files to revert, not the specific shipping boundary or commit/patch evidence.

## Rubric Tightening

The deterministic rubric should be tightened before treating `ship` as excellent rather than merely passing.

Proposed criteria:

- Require persisted generated artifact text for every evaluated run, or mark the run as retained-evidence-limited and exclude it from artifact-specific quality scoring.
- Require the manifest to cite the exact evidence source for tests, changed files, and deployment status, such as `tasks/todo.md` and `diff-summary.txt`.
- Add a high-score criterion for real `ship` manifest completeness: per-file purpose, user-goal mapping, skipped tests, adversarial review, residual risk, rollback note, next work, and next command.
- Require deployment status to distinguish "not requested by fixture", "skipped because no deploy contract exists", and "blocked by deploy/auth failure" rather than accepting any deploy-skipped phrase.
- For Codex runs, assert that sandbox/tool failures during manifest creation do not leak into the artifact and that the final created file is the one scored.

## Next Work

Tighten the `ship` benchmark rubric so evidence-linked, retained-artifact, and full manifest-completeness checks determine whether the output is excellent, not only whether the fixture passed.

**Recommended next command:** `$targeted-skill-builder ship benchmark review rubric`
