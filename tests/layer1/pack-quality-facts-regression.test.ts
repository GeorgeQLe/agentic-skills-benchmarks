import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PACK_WORKFLOW_SETUPS } from "../layer4/setups/packs/pack-workflows.setup.js";

const FIXTURE_ROOT = resolve(import.meta.dirname, "../fixtures/bench-quality");

describe("pack workflow quality fact aliases", () => {
  for (const skill of ["assumption-tracker", "runway-model", "investor-update"] as const) {
    it(`accepts the captured ${skill} currency and wording variants`, () => {
      const output = readFileSync(resolve(FIXTURE_ROOT, `${skill}-codex-captured.md`), "utf8");
      const result = PACK_WORKFLOW_SETUPS[skill].qualityEvaluator!.evaluate(output);
      const evidence = result.criteria.find((criterion) => criterion.id === "pack-fixture-evidence");
      expect(evidence?.passed, evidence?.notes.join("\n")).toBe(true);
    });

    it(`still rejects unrelated prose for ${skill}`, () => {
      const result = PACK_WORKFLOW_SETUPS[skill].qualityEvaluator!.evaluate(
        "This generic strategy discusses industry-leading best practices without fixture evidence.",
      );
      const evidence = result.criteria.find((criterion) => criterion.id === "pack-fixture-evidence");
      expect(evidence?.passed).toBe(false);
      expect(result.passed).toBe(false);
    });
  }
});
