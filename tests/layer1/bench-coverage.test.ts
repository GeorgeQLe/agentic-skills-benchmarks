import { describe, expect, it } from "vitest";
import {
  benchmarkCoverageMatrix,
  discoverRepositorySkills,
  validateBenchmarkCoverage,
} from "../harness/bench-coverage.js";
import { catalogSkillNames, loadSkillsCatalog } from "../harness/skills-catalog.js";

describe("benchmark coverage catalog import", () => {
  it("loads the imported public catalog", () => {
    const catalog = loadSkillsCatalog();
    expect(catalog.schema_version).toBe("skills-catalog.v1");
    expect(catalog.skills.length).toBeGreaterThan(0);
  });

  it("validates every imported logical skill has a coverage row", () => {
    const result = validateBenchmarkCoverage();
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("keeps coverage rows aligned to catalog skill names", () => {
    const catalogNames = catalogSkillNames();
    const rows = benchmarkCoverageMatrix().map((row) => row.skill);
    expect(rows).toEqual([...rows].sort());
    expect(rows).toEqual(catalogNames);
    expect(discoverRepositorySkills().get("design-system")).toContain("packs/product-design/codex/design-system/SKILL.md");
  });
});
