#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";

const [packageRootArg, workDirArg, skill, agent, expectedVersion, expectedFingerprint] = process.argv.slice(2);

if (!packageRootArg || !workDirArg || !skill || !agent || !expectedVersion || !expectedFingerprint) {
  throw new Error("benchmark skill installer received incomplete arguments");
}
if (agent !== "claude" && agent !== "codex") {
  throw new Error(`unsupported benchmark agent: ${agent}`);
}

const packageRoot = resolve(packageRootArg);
const workDir = resolve(workDirArg);
const packageJson = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"));
const manifest = JSON.parse(readFileSync(join(packageRoot, "dist", "skillpacks-manifest.json"), "utf8"));

if (packageJson.name !== "skillpacks" || packageJson.version !== expectedVersion) {
  throw new Error(`skillpacks package version mismatch: expected ${expectedVersion}, got ${packageJson.name}@${packageJson.version}`);
}
if (manifest.package?.name !== "skillpacks" || manifest.package?.version !== expectedVersion) {
  throw new Error(`skillpacks manifest package mismatch for ${expectedVersion}`);
}
if (manifest.source_fingerprint !== expectedFingerprint) {
  throw new Error(`skillpacks manifest fingerprint mismatch: expected ${expectedFingerprint}, got ${manifest.source_fingerprint ?? "missing"}`);
}

const entry = manifest.skills?.find((candidate) =>
  candidate.name === skill && candidate.platform === agent && candidate.installable !== false,
);
if (!entry?.path || !entry.path.endsWith("/SKILL.md")) {
  throw new Error(`skillpacks manifest is missing ${agent} platform skill ${skill}`);
}

const sourceSkillFile = resolve(packageRoot, entry.path);
const sourceRelative = relative(packageRoot, sourceSkillFile);
if (isAbsolute(sourceRelative) || sourceRelative.startsWith("..") || !existsSync(sourceSkillFile)) {
  throw new Error(`skillpacks package is missing declared skill file ${entry.path}`);
}

const selectedRoot = join(workDir, `.${agent}`, "skills", skill);
const otherAgent = agent === "codex" ? "claude" : "codex";
const otherRoot = join(workDir, `.${otherAgent}`, "skills", skill);
rmSync(otherRoot, { recursive: true, force: true });
mkdirSync(dirname(selectedRoot), { recursive: true });
rmSync(selectedRoot, { recursive: true, force: true });
cpSync(dirname(sourceSkillFile), selectedRoot, {
  recursive: true,
  filter(source) {
    return !relative(dirname(sourceSkillFile), source).split(/[\\/]/).includes("archive");
  },
});

if (!existsSync(join(selectedRoot, "SKILL.md")) || existsSync(otherRoot)) {
  throw new Error(`failed to isolate ${skill} to the ${agent} benchmark root`);
}

const agentsRoot = join(workDir, ".agents");
mkdirSync(agentsRoot, { recursive: true });
const projectPath = join(agentsRoot, "project.json");
const existingProject = existsSync(projectPath)
  ? JSON.parse(readFileSync(projectPath, "utf8"))
  : {};
writeFileSync(projectPath, `${JSON.stringify({
  ...existingProject,
  project_type: existingProject.project_type ?? "benchmark-fixture",
  enabled_packs: existingProject.enabled_packs ?? [],
  enabled_skills: { ...(existingProject.enabled_skills ?? {}), [skill]: entry.pack ?? "base" },
  skill_pack_version: 1,
  agent_mode: `${agent}-only`,
}, null, 2)}\n`);
