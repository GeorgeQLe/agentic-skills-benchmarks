import { describe, expect, it } from "vitest";
import { qualityAssertions } from "../harness/bench-quality.js";

describe("requiredFacts wording-drift tolerance", () => {
  it("string facts stay strict (exact case-insensitive substring)", () => {
    const evaluate = qualityAssertions.requiredFacts(["benchmark coverage reporting"]);
    expect(evaluate("We ship benchmark coverage reporting today.").score).toBe(1);
    // equivalent wording without an alias group must still fail — strict by default
    expect(evaluate("We ship a Benchmark Coverage Model today.").score).toBe(0);
  });

  it("alias groups pass on any listed wording variant", () => {
    const evaluate = qualityAssertions.requiredFacts([
      { anyOf: ["benchmark coverage reporting", "benchmark coverage model"] },
    ]);
    // the roadmap 2026-05-17 false-negative wording now passes
    expect(evaluate("Introduces a Benchmark Coverage Model section.").score).toBe(1);
    expect(evaluate("Covers benchmark coverage reporting explicitly.").score).toBe(1);
  });

  it("alias groups still fail when the concept is genuinely absent", () => {
    const evaluate = qualityAssertions.requiredFacts([
      { anyOf: ["benchmark coverage reporting", "benchmark coverage model"] },
    ]);
    const result = evaluate("This document is about unrelated CLI ergonomics.");
    expect(result.score).toBe(0);
    expect(result.notes[0]).toContain("any of [");
  });

  it("file-path style facts are unaffected and remain exact", () => {
    const evaluate = qualityAssertions.requiredFacts(["tests/example.test.ts"]);
    expect(evaluate("Modify tests/example.test.ts.").score).toBe(1);
    expect(evaluate("Modify tests/other.test.ts.").score).toBe(0);
  });

  it("mixed string + alias facts require all entries covered", () => {
    const evaluate = qualityAssertions.requiredFacts([
      "fake benchmark rows",
      { anyOf: ["Phase 2: SaaS Coverage Dashboard Implementation", "SaaS Coverage Dashboard"] },
    ]);
    expect(evaluate("Uses fake benchmark rows for the SaaS Coverage Dashboard.").score).toBe(1);
    // missing the strict string fact → still a failure
    expect(evaluate("Plans the SaaS Coverage Dashboard work.").score).toBe(0);
  });
});
