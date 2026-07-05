import { describe, expect, it } from "vitest";
import {
  benchmarkCoverageMatrix,
  discoverRepositorySkills,
  validateBenchmarkCoverage,
} from "../harness/bench-coverage.js";
import {
  catalogSkillNames,
  loadBenchmarkCatalogMetadata,
  loadSkillsCatalog,
} from "../harness/skills-catalog.js";

describe("benchmark coverage catalog import", () => {
  it("loads the imported public catalog", () => {
    const catalog = loadSkillsCatalog();
    expect(catalog.schema_version).toBe("skills-catalog.v1");
    expect(catalog.skills.length).toBeGreaterThan(0);
  });

  it("loads benchmark catalog metadata from the imported snapshot", () => {
    expect(loadBenchmarkCatalogMetadata("canary")).toEqual({
      skillsCatalogRef: "8b71c638a32df52daa3f1bdfe05f4116ae42a55f",
      skillsCatalogVersion: "0.1.17",
      sourceCommit: "ef4151b65f8b7618381c39145036b4dafc0108c3",
      releaseChannel: "canary",
    });
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
