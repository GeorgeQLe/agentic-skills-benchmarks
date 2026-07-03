import { describe, expect, it } from "vitest";
import { classifyVerdict } from "../../scripts/lib/regression-verdict.mjs";

// Class 3 — a fully infra-blocked lane (0 evaluated runs) must NOT register as a
// skill regression. It is inconclusive: the skill was never exercised, so the
// passRate/wilsonLower "drop" from a healthy prior is spurious.

const healthyPrior = {
  passRate: 0.9,
  wilsonLower: 0.8,
  averageScore: 0.85,
  status: "graded",
};

describe("classifyVerdict — infra-blocked lane quarantine", () => {
  it("returns `blocked`, not `regression`, for a 0-evaluated lane", () => {
    const grade = {
      passRate: 0,
      wilsonLower: 0,
      averageScore: null,
      status: "blocked",
      evaluatedRuns: 0,
    };
    const { verdict, reasons } = classifyVerdict({ prior: healthyPrior, grade });
    expect(verdict).toBe("blocked");
    const joined = reasons.join("; ");
    expect(joined).not.toContain("passRate dropped");
    expect(joined).not.toContain("wilsonLower dropped");
  });

  it("still flags a real passRate drop on an evaluated lane", () => {
    const grade = {
      passRate: 0.5,
      wilsonLower: 0.4,
      averageScore: 0.8,
      status: "graded",
      evaluatedRuns: 3,
    };
    const { verdict, reasons } = classifyVerdict({ prior: healthyPrior, grade });
    expect(verdict).toBe("regression");
    expect(reasons.join("; ")).toContain("passRate dropped");
  });

  it("seeds a baseline when there is no prior grade", () => {
    const grade = { passRate: 0.9, wilsonLower: 0.8, averageScore: 0.85, status: "graded", evaluatedRuns: 3 };
    expect(classifyVerdict({ prior: null, grade }).verdict).toBe("baseline");
  });

  it("keeps stable when metrics hold and no runs are blocked", () => {
    const grade = { passRate: 0.9, wilsonLower: 0.8, averageScore: 0.85, status: "graded", evaluatedRuns: 3 };
    expect(classifyVerdict({ prior: healthyPrior, grade }).verdict).toBe("stable");
  });
});
