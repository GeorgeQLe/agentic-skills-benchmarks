# Run Execution Plan

Step 36.1 adds failing benchmark quality tests before implementation. The scope is limited to `tests/layer1/bench-quality.test.ts`, `tests/layer1/bench-report.test.ts`, `tests/layer1/bench-setups.test.ts`, and `tests/fixtures/bench-quality/`.

Evidence:
- `tasks/todo.md` defines Phase 36 Step 36.1 as a tests-first benchmark quality task.
- `tests/harness/bench-report.ts` currently reports hard assertion pass rate only.
- `tests/harness/bench-types.ts` has no quality result shape yet.

Validation will run `pnpm --dir tests test:layer1 -- bench-quality bench-report bench-setups` and the expected red result is missing quality implementation.

Next work: implement benchmark quality scoring primitives.
Recommended next command: $exec
