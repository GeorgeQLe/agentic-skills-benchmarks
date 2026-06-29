import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const CATALOG_PATH = join(REPO_ROOT, "data", "skills-catalog", "v1", "catalog.json");

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
