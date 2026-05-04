import { readFileSync, mkdirSync, copyFileSync } from "node:fs";
import { resolve, join } from "node:path";

const FIXTURES_DIR = resolve(import.meta.dirname, "../fixtures");

export function inputFixture(name: string): string {
  return readFileSync(resolve(FIXTURES_DIR, "inputs", name), "utf-8");
}

export function inputFixturePath(name: string): string {
  return resolve(FIXTURES_DIR, "inputs", name);
}

export function goldenSchema(name: string): Record<string, unknown> {
  const raw = readFileSync(resolve(FIXTURES_DIR, "golden", name), "utf-8");
  return JSON.parse(raw);
}

export function setupDriftctlFixture(
  workDir: string,
  opts: { tier: 1 | 2 | 3 | 4 },
): void {
  const driftctlDir = resolve(FIXTURES_DIR, "inputs/driftctl");
  const youtubeDir = join(workDir, "research/youtube");
  const researchDir = join(workDir, "research");
  mkdirSync(youtubeDir, { recursive: true });

  copyFileSync(
    join(driftctlDir, "creator-positioning-driftctl.md"),
    join(youtubeDir, "creator-positioning-driftctl.md"),
  );

  if (opts.tier >= 2) {
    copyFileSync(
      join(driftctlDir, "product-led-media-map-driftctl.md"),
      join(youtubeDir, "product-led-media-map-driftctl.md"),
    );
  }

  if (opts.tier >= 3) {
    const specsDir = join(workDir, "specs/youtube");
    mkdirSync(specsDir, { recursive: true });
    copyFileSync(
      resolve(FIXTURES_DIR, "inputs/driftctl-series-spec.md"),
      join(specsDir, "series-driftctl-deep-dives.md"),
    );
  }

  if (opts.tier >= 4) {
    copyFileSync(
      join(driftctlDir, "journey-map.md"),
      join(researchDir, "journey-map.md"),
    );
    copyFileSync(
      join(driftctlDir, "gtm.md"),
      join(researchDir, "gtm.md"),
    );
  }
}

export function driftctlScriptFixture(workDir: string): void {
  const specsDir = join(workDir, "specs/youtube");
  mkdirSync(specsDir, { recursive: true });
  copyFileSync(
    resolve(FIXTURES_DIR, "inputs/driftctl/video-script-driftctl.md"),
    join(specsDir, "video-script-driftctl.md"),
  );
}
