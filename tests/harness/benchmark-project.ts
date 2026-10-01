import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import type { BenchAgent, BenchRunContext, SkillBenchSetup } from "./bench-types.js";
import { createTempProject } from "./runner.js";

const require = createRequire(import.meta.url);
const REPO_ROOT = resolve(import.meta.dirname, "../..");
const CATALOG_PATH = join(REPO_ROOT, "data", "skills-catalog", "v1", "catalog.json");
const CATALOG_MANIFEST_PATH = join(REPO_ROOT, "data", "skills-catalog", "v1", "manifest.json");
const INSTALLER_PATH = join(REPO_ROOT, "scripts", "install-benchmark-skill.mjs");

export const PINNED_SKILLPACKS_VERSION = "0.1.17";

interface PackageSkill {
  name?: string;
  platform?: string;
  path?: string;
  installable?: boolean;
}

interface PackageManifest {
  package?: { name?: string; version?: string };
  source_fingerprint?: string;
  skills?: PackageSkill[];
}

interface CatalogSkill {
  name?: string;
  mirrorKey?: string | null;
  platform?: string;
  path?: string | null;
}

export interface BenchmarkPackageValidation {
  packageRoot: string;
  version: string;
  fingerprint: string;
  skillPath: string;
}

export interface BenchmarkProjectOptions {
  packageRoot?: string;
  createProject?: () => string;
}

export type BenchmarkProjectPreparer = (
  setup: SkillBenchSetup,
  context: BenchRunContext,
) => string;

export function installedSkillpacksRoot(): string {
  return dirname(require.resolve("skillpacks/package.json"));
}

export function validateBenchmarkSkillPackage(
  skill: string,
  agent: BenchAgent,
  packageRoot = installedSkillpacksRoot(),
): BenchmarkPackageValidation {
  const catalogManifest = readJson(CATALOG_MANIFEST_PATH);
  const expectedVersion = catalogManifest.package?.version;
  const expectedFingerprint = catalogManifest.manifest?.source_fingerprint;

  if (expectedVersion !== PINNED_SKILLPACKS_VERSION) {
    throw new Error(`catalog skillpacks version mismatch: expected pinned ${PINNED_SKILLPACKS_VERSION}, got ${expectedVersion ?? "missing"}`);
  }
  if (!expectedFingerprint) {
    throw new Error("catalog is missing the skillpacks package-manifest fingerprint");
  }

  const packageJsonPath = join(packageRoot, "package.json");
  const packageManifestPath = join(packageRoot, "dist", "skillpacks-manifest.json");
  if (!existsSync(packageJsonPath) || !existsSync(packageManifestPath)) {
    throw new Error(`missing pinned skillpacks package at ${packageRoot}`);
  }

  const packageJson = readJson(packageJsonPath);
  const packageManifest = readJson(packageManifestPath) as PackageManifest;
  if (packageJson.name !== "skillpacks" || packageJson.version !== PINNED_SKILLPACKS_VERSION) {
    throw new Error(
      `skillpacks package version mismatch: expected ${PINNED_SKILLPACKS_VERSION}, got ${packageJson.name ?? "missing"}@${packageJson.version ?? "missing"}`,
    );
  }
  if (
    packageManifest.package?.name !== "skillpacks" ||
    packageManifest.package?.version !== PINNED_SKILLPACKS_VERSION
  ) {
    throw new Error(`skillpacks package manifest does not identify skillpacks@${PINNED_SKILLPACKS_VERSION}`);
  }
  if (packageManifest.source_fingerprint !== expectedFingerprint) {
    throw new Error(
      `skillpacks manifest fingerprint mismatch: expected ${expectedFingerprint}, got ${packageManifest.source_fingerprint ?? "missing"}`,
    );
  }

  const catalog = readJson(CATALOG_PATH) as { skills?: CatalogSkill[] };
  const catalogEntry = catalog.skills?.find((candidate) =>
    (candidate.mirrorKey || candidate.name) === skill && candidate.platform === agent,
  );
  if (!catalogEntry?.path) {
    throw new Error(`catalog is missing ${agent} platform mirror for skill ${skill}`);
  }

  const packageEntry = packageManifest.skills?.find((candidate) =>
    candidate.name === skill && candidate.platform === agent && candidate.installable !== false,
  );
  if (!packageEntry?.path) {
    throw new Error(`skillpacks package is missing ${agent} platform mirror for skill ${skill}`);
  }
  if (packageEntry.path !== catalogEntry.path) {
    throw new Error(
      `skillpacks platform path mismatch for ${skill}/${agent}: catalog ${catalogEntry.path}, package ${packageEntry.path}`,
    );
  }
  if (!existsSync(join(packageRoot, packageEntry.path))) {
    throw new Error(`skillpacks package is missing declared skill ${packageEntry.path}`);
  }

  return {
    packageRoot,
    version: expectedVersion,
    fingerprint: expectedFingerprint,
    skillPath: packageEntry.path,
  };
}

export function prepareBenchmarkProject(
  setup: SkillBenchSetup,
  context: BenchRunContext,
  options: BenchmarkProjectOptions = {},
): string {
  const workDir = (options.createProject ?? createTempProject)();
  try {
    setup.setupProject(workDir, context);

    if (setup.installSkill === false) return workDir;

    const validation = validateBenchmarkSkillPackage(setup.skill, context.agent, options.packageRoot);
    const isolatedHome = join(workDir, ".benchmark-home");
    mkdirSync(isolatedHome, { recursive: true });
    const env = isolatedInstallerEnv(isolatedHome, context.agent);
    const result = spawnSync(process.execPath, [
      INSTALLER_PATH,
      validation.packageRoot,
      workDir,
      setup.skill,
      context.agent,
      validation.version,
      validation.fingerprint,
    ], {
      cwd: workDir,
      env,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    if (result.error || result.status !== 0) {
      const detail = result.error?.message || result.stderr.trim() || result.stdout.trim() || `exit ${result.status}`;
      throw new Error(`failed to install benchmark skill ${setup.skill}: ${detail}`);
    }

    const selected = join(workDir, `.${context.agent}`, "skills", setup.skill, "SKILL.md");
    const other = join(workDir, context.agent === "codex" ? ".claude" : ".codex", "skills", setup.skill, "SKILL.md");
    if (!existsSync(selected) || existsSync(other)) {
      throw new Error(`benchmark skill ${setup.skill} was not isolated to ${context.agent}`);
    }
    return workDir;
  } catch (error) {
    rmSync(workDir, { recursive: true, force: true });
    throw error;
  }
}

function isolatedInstallerEnv(home: string, agent: BenchAgent): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    HOME: home,
    CODEX_HOME: join(home, ".codex"),
    SKILLS_AGENT_MODE: `${agent}-only`,
    NO_UPDATE_NOTIFIER: "1",
    npm_config_update_notifier: "false",
  };
  for (const key of ["PATH", "TMPDIR", "TMP", "TEMP", "SystemRoot", "ComSpec"]) {
    if (process.env[key]) env[key] = process.env[key];
  }
  return env;
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}
