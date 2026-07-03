import { describe, expect, it } from "vitest";
import { resolveBenchSetup } from "../harness/bench-setups.js";
import {
  avoidsUnqualifiedPnpmLatest,
  provesSelectedPnpmToolchainAgeEligibility,
} from "../layer4/setups/tier23-base-workflows.setup.js";

// Class 3 lock — the already-landed update-packages genuine-gap guards must
// stay red/green after the negation-aware forbidden-term change (they are
// separate semantic predicates, not forbidden-term substring checks).

describe("update-packages pnpm@latest guard", () => {
  it("passes when pnpm@latest is only warned against", () => {
    expect(avoidsUnqualifiedPnpmLatest("Do not use pnpm@latest; pin pnpm@10.11.0")).toBe(true);
  });

  it("fails when pnpm@latest is invoked unqualified", () => {
    expect(avoidsUnqualifiedPnpmLatest("Run pnpm@latest")).toBe(false);
  });
});

describe("update-packages pnpm toolchain age-eligibility proof", () => {
  it("passes on the retained run #2 shape (selected version + dated npm-view-times key + age note)", () => {
    const content = [
      "Recommended `packageManager` pnpm@10.11.0",
      'See npm-view-times.json: "10.11.0": "2026-05-01T12:00:00.000Z"',
      "This pin is older than 8 days, so it is age-eligible.",
    ].join("\n");
    expect(provesSelectedPnpmToolchainAgeEligibility(content)).toBe(true);
  });

  it("fails when a local pnpm version is chosen with no retained proof", () => {
    expect(provesSelectedPnpmToolchainAgeEligibility("Selected pnpm@9.0.0 from the local install.")).toBe(false);
  });
});

// #4 — roadmap must keep routing to `$plan-phase 1`; no change makes `$run`
// an acceptable next route.

describe("roadmap next-route requirement", () => {
  const setup = resolveBenchSetup("roadmap");
  const routeCriterion = setup?.qualityEvaluator?.rubric.criteria.find(
    (criterion) => criterion.id === "actionable-next-route",
  );

  it("resolves a roadmap setup with an actionable-next-route criterion", () => {
    expect(routeCriterion).toBeDefined();
  });

  it("accepts a $plan-phase 1 handoff and rejects $run", () => {
    expect(routeCriterion!.evaluate("## Next Command\n`$plan-phase 1`").score).toBe(1);
    expect(routeCriterion!.evaluate("## Next Command\n`$run`").score).toBe(0);
  });
});
