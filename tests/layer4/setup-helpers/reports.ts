import type { BenchReport } from "../../harness/bench-types.js";
import type { Assertion } from "../../harness/types.js";

export function assertReportHasEvaluatedRuns(report: BenchReport): Assertion {
  return {
    description: "Benchmark report has evaluated runs",
    pass: report.evaluatedRuns > 0,
  };
}

export function assertReportPassRateAtLeast(
  report: BenchReport,
  minimumPassRate: number,
): Assertion {
  return {
    description: `Benchmark pass rate is at least ${minimumPassRate}`,
    pass: report.passRate >= minimumPassRate,
    detail: `actual=${report.passRate}`,
  };
}

export function assertReportRecordsFailedAssertions(report: BenchReport): Assertion {
  return {
    description: "Benchmark report records failed assertion details",
    pass: report.failedRuns.every((run) => run.failedAssertions.length > 0),
  };
}
