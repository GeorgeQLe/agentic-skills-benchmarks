import { describe, expect, it } from "vitest";
import {
  CUSTOM_BENCH_SCENARIOS,
  CUSTOM_BENCH_SETUPS,
} from "../harness/bench-setups.js";
import { benchmarkCoverageMatrix } from "../harness/bench-coverage.js";
import type { SkillBenchSetup } from "../harness/bench-types.js";

// Setups that legitimately gate on non-text state (real git state) instead of a
// text-quality rubric. Everything else must carry a real rubric so a stubbed or
// decorative quality layer is caught here rather than silently passing.
const RUBRIC_EXEMPT_SETUPS = new Set(["commit-and-push-by-feature", "sync"]);

function assertRealRubric(name: string, setup: SkillBenchSetup): void {
  if (RUBRIC_EXEMPT_SETUPS.has(name)) return;
  const evaluator = setup.qualityEvaluator;
  expect(evaluator, `${name}: missing qualityEvaluator`).toBeDefined();
  const rubric = evaluator!.rubric;
  expect(rubric.criteria.length, `${name}: rubric has no criteria`).toBeGreaterThan(0);
  expect(
    rubric.criteria.some((criterion) => criterion.critical),
    `${name}: rubric has no critical criterion`,
  ).toBe(true);
  expect(rubric.minimumScore, `${name}: minimumScore must be > 0`).toBeGreaterThan(0);
  expect(
    rubric.criteria.reduce((sum, criterion) => sum + criterion.weight, 0),
    `${name}: rubric total weight must be > 0`,
  ).toBeGreaterThan(0);
}

describe("custom bench setups carry a real quality rubric", () => {
  it("every non-exempt custom setup has a non-decorative rubric", () => {
    for (const [name, setup] of Object.entries(CUSTOM_BENCH_SETUPS)) {
      assertRealRubric(name, setup);
    }
  });

  it("every custom scenario has a non-decorative rubric", () => {
    for (const [name, setup] of Object.entries(CUSTOM_BENCH_SCENARIOS)) {
      assertRealRubric(name, setup);
    }
  });
});

describe("no dangling custom coverage rows", () => {
  it("every custom coverage row resolves to a registered runtime setup", () => {
    const missing = benchmarkCoverageMatrix()
      .filter((row) => row.coverage_status === "custom")
      .map((row) => row.skill)
      .filter((skill) => !CUSTOM_BENCH_SETUPS[skill]);
    expect(missing, `custom rows without a registered setup: ${missing.join(", ")}`).toEqual([]);
  });
});
