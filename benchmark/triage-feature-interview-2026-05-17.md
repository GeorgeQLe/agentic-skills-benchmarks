# Triage: feature-interview Benchmark Failure

**Date:** 2026-05-17
**Command:** `$session-triage feature-interview benchmark failure`
**Target:** `feature-interview` benchmark failure from `$benchmark-test-skill feature-interview`

## Evidence Sources

- `benchmark/test-feature-interview-2026-05-17.md`
- `tests/benchmarks/runs/feature-interview-claude-6bd2c89a/report.json`
- `tests/benchmarks/runs/feature-interview-codex-5bd5a8da/report.json`
- `tests/benchmarks/runs/feature-interview-claude-6bd2c89a/run-000.json`
- `tests/benchmarks/runs/feature-interview-claude-6bd2c89a/run-001.json`
- `tests/benchmarks/runs/feature-interview-claude-6bd2c89a/run-002.json`
- `tests/benchmarks/runs/feature-interview-codex-5bd5a8da/run-000.json`
- `tests/benchmarks/runs/feature-interview-codex-5bd5a8da/run-001.json`
- `tests/benchmarks/runs/feature-interview-codex-5bd5a8da/run-002.json`
- `tests/layer4/setups/tier1-workflows.setup.ts`
- `global/codex/feature-interview/SKILL.md`
- `global/claude/feature-interview/SKILL.md`
- `tasks/lessons.md`

## User-Identified Issue

The fresh `feature-interview` benchmark failed and needs triage.

## Verification Verdict

**Verified, with a corrected failure interpretation.**

The benchmark failure is real: Claude passed 0/3 hard assertion runs and Codex passed 1/3. No runs were infrastructure-blocked.

The prior benchmark report's prose interpreted the failed assertion backwards. `Output recommends $spec-interview` is the assertion description for the expected route, not proof that failed outputs recommended `$spec-interview`. The raw run evidence shows most failed outputs did not recommend `$spec-interview`:

- Claude run 0 recommended `/feature-interview "benchmark report coverage column"` or `/investigate`.
- Claude run 1 recommended `/feature-interview`.
- Claude run 2 recommended `/feature-interview benchmark-reporting`.
- Codex run 0 recommended `$roadmap`.
- Codex run 1 recommended `$spec-interview` and was the only passing hard-assertion run.
- Codex run 2 recommended `$roadmap`.

## Timeline

1. `$benchmark-test-skill feature-interview` confirmed custom coverage via `tests/layer4/setups/tier1-workflows.setup.ts`.
2. `pnpm verify --skill feature-interview` passed layer1 and skipped layer2 because no target-specific layer2 tests matched.
3. The both-agent benchmark ran three evaluated runs per agent with no infrastructure blocks.
4. The Tier 1 setup required the final next route to be `$spec-interview`.
5. Five of six evaluated outputs chose `/feature-interview`, `$feature-interview`, `/investigate`, or `$roadmap` instead.
6. The benchmark was reported as a hard assertion failure and routed to this triage.

## Root Cause

The responsible issue is a benchmark harness route expectation mismatch, not an infrastructure issue and not a verified `feature-interview` skill contract failure.

`tests/layer4/setups/tier1-workflows.setup.ts` currently configures the `feature-interview` fixture with:

- `nextRoute: "$spec-interview"`
- `recommendedRoute: "$spec-interview"`

That expectation conflicts with the mirrored `feature-interview` contracts. Both Codex and Claude versions say the skill is narrower than `spec-interview`, does not assume the output must be a full new implementation spec, and explicitly says not to route brainstorm ideas directly to `spec-interview` unless the user explicitly asks for a full spec.

The benchmark prompt asks for a no-follow-up interview log from a one-line idea in a scratch fixture. It does not explicitly ask for a full spec. Under the skill contract, `$spec-interview` should not be the unconditional expected next route for this fixture.

## Responsible Contract Gap

**Benchmark harness:** `tests/layer4/setups/tier1-workflows.setup.ts`.

The skill contracts are mirrored and sufficiently clear on the direct-to-spec-interview constraint. The harness is stale or over-specific.

Secondary documentation issue: `benchmark/test-feature-interview-2026-05-17.md` says failed outputs "recommended `$spec-interview`"; the raw evidence shows the opposite. That report should be treated as having an inverted failure explanation until corrected by the remediation step or superseded by a fresh benchmark report.

## Recommended Fix

Route to a targeted harness update:

`$targeted-skill-builder feature-interview benchmark route alignment`

The smallest durable fix should update `tests/layer4/setups/tier1-workflows.setup.ts` for the `feature-interview` fixture so the expected route matches the actual skill contract. A good implementation target is:

- keep the fixture focused on producing `specs/benchmark-reporting-feature-interview.md`;
- keep hard assertions for assumptions, evidence, decision, risks, and custom/generic/blocked coverage;
- remove `$spec-interview` as the unconditional next route;
- either expect `$roadmap` only when the fixture prompt explicitly states the planning destination is confirmed and ready for sequencing, or allow a contract-valid route set such as `$feature-interview` follow-up and `$roadmap` depending on the artifact's decision;
- add layer1 setup coverage proving the fixture no longer rewards direct `$spec-interview` routing for an unconfirmed idea interview.

If the desired benchmark behavior is specifically "promote this idea into an implementation spec," then the prompt should say so explicitly and the route should still follow the skill contract: write the feature-interview log, then route to `$roadmap` after a ready spec or sequenced task decision, not directly to `$spec-interview`.

## Validation Plan

After the targeted update:

```bash
pnpm --dir tests exec vitest run --project layer1 bench-setups
pnpm --dir tests verify --skill feature-interview
pnpm --dir tests bench --skill feature-interview --agent codex --runs 1 --chunk-size 1 --pause 0
pnpm --dir tests bench:coverage
git diff --check
```

If the smoke benchmark updates curated benchmark evidence, also run:

```bash
scripts/validate-skills-showcase-data.sh
```

Then rerun the full workflow:

```bash
pnpm --dir tests bench --skill feature-interview --agent both --runs 3 --chunk-size 3 --pause 0
```

## Confidence And Evidence Gaps

Confidence: high that the failed benchmark is caused by a harness route mismatch. The raw run files, Tier 1 setup, and mirrored skill contracts all point to the same mismatch.

Evidence gaps:

- I did not inspect broad session history because this was a narrow benchmark failure, and recurrence evidence is not needed to classify the immediate issue.
- A remediation run should decide the exact accepted route shape after choosing whether this fixture represents an unconfirmed interview-log-only outcome or a confirmed planning-ready outcome.

Recommended next skill: `$targeted-skill-builder feature-interview benchmark route alignment`
