import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { BenchmarkCatalogMetadata, ReleaseChannel } from "./bench-types.js";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const CATALOG_PATH = join(REPO_ROOT, "data", "skills-catalog", "v1", "catalog.json");
const IMPORT_SOURCE_PATH = join(REPO_ROOT, "data", "skills-catalog", "v1", "import-source.json");
const MANIFEST_PATH = join(REPO_ROOT, "data", "skills-catalog", "v1", "manifest.json");

interface CatalogSkill {
  name: string;
  mirrorKey?: string | null;
  path?: string | null;
}

interface SkillsCatalog {
  schema_version: string;
  skill_count: number;
  skills: CatalogSkill[];
}

interface ImportSource {
  skills_repo_ref?: string;
  source_commit?: string;
}

interface CatalogManifest {
  package?: {
    version?: string;
  };
}

export const UNKNOWN_BENCHMARK_CATALOG_METADATA: BenchmarkCatalogMetadata = {
  skillsCatalogRef: "unknown",
  skillsCatalogVersion: "unknown",
  sourceCommit: "unknown",
  releaseChannel: "unknown",
};

export function loadSkillsCatalog(): SkillsCatalog {
  if (!existsSync(CATALOG_PATH)) {
    throw new Error(
      `Missing imported skills catalog at data/skills-catalog/v1/catalog.json. Run pnpm catalog:import first.`,
    );
  }

  const catalog = JSON.parse(readFileSync(CATALOG_PATH, "utf8")) as SkillsCatalog;
  if (catalog.schema_version !== "skills-catalog.v1") {
    throw new Error(`Unsupported skills catalog schema_version: ${catalog.schema_version}`);
  }
  if (!Array.isArray(catalog.skills)) {
    throw new Error("Imported skills catalog is missing a skills array.");
  }
  return catalog;
}

export function parseReleaseChannel(value: string | undefined, source = "--release-channel"): ReleaseChannel {
  const releaseChannel = value ?? "release";
  if (releaseChannel === "release" || releaseChannel === "canary") return releaseChannel;
  throw new Error(`${source} must be "release" or "canary", got "${releaseChannel}"`);
}

export function loadBenchmarkCatalogMetadata(releaseChannel: ReleaseChannel): BenchmarkCatalogMetadata {
  if (!existsSync(IMPORT_SOURCE_PATH)) {
    throw new Error(
      `Missing imported skills catalog source at data/skills-catalog/v1/import-source.json. Run pnpm catalog:import first.`,
    );
  }
  if (!existsSync(MANIFEST_PATH)) {
    throw new Error(
      `Missing imported skills catalog manifest at data/skills-catalog/v1/manifest.json. Run pnpm catalog:import first.`,
    );
  }

  const importSource = JSON.parse(readFileSync(IMPORT_SOURCE_PATH, "utf8")) as ImportSource;
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as CatalogManifest;
  const skillsCatalogRef = importSource.skills_repo_ref;
  const skillsCatalogVersion = manifest.package?.version;
  const sourceCommit = importSource.source_commit;

  if (!skillsCatalogRef) throw new Error("Imported skills catalog source is missing skills_repo_ref.");
  if (!skillsCatalogVersion) throw new Error("Imported skills catalog manifest is missing package.version.");
  if (!sourceCommit) throw new Error("Imported skills catalog source is missing source_commit.");

  return {
    skillsCatalogRef,
    skillsCatalogVersion,
    sourceCommit,
    releaseChannel,
  };
}

export function catalogMetadataFromManifest(
  manifest: Partial<BenchmarkCatalogMetadata>,
): BenchmarkCatalogMetadata {
  return {
    skillsCatalogRef: manifest.skillsCatalogRef ?? UNKNOWN_BENCHMARK_CATALOG_METADATA.skillsCatalogRef,
    skillsCatalogVersion: manifest.skillsCatalogVersion ?? UNKNOWN_BENCHMARK_CATALOG_METADATA.skillsCatalogVersion,
    sourceCommit: manifest.sourceCommit ?? UNKNOWN_BENCHMARK_CATALOG_METADATA.sourceCommit,
    releaseChannel: manifest.releaseChannel ?? UNKNOWN_BENCHMARK_CATALOG_METADATA.releaseChannel,
  };
}

export function catalogSkillMap(): Map<string, string[]> {
  const skills = new Map<string, string[]>();
  for (const skill of loadSkillsCatalog().skills) {
    const name = skill.mirrorKey || skill.name;
    if (!name) continue;
    const paths = skills.get(name) ?? [];
    if (skill.path) paths.push(skill.path);
    skills.set(name, paths.sort());
  }
  return new Map([...skills.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

export function catalogSkillNames(): string[] {
  return [...catalogSkillMap().keys()];
}
