import { designSystemSetup } from "../layer4/setups/design-system.setup.js";
import { designSystemDraftstonkSetup } from "../layer4/setups/design-system-draftstonk.setup.js";
import type { SkillBenchSetup } from "./bench-types.js";

export const BENCH_SETUPS: Record<string, SkillBenchSetup> = {
  "design-system": designSystemSetup,
  "design-system-draftstonk": designSystemDraftstonkSetup,
};

export function supportedBenchSkills(): string[] {
  return Object.keys(BENCH_SETUPS).sort();
}

