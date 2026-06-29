#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outRoot = path.join(repoRoot, "data", "skills-catalog", "v1");
const schemaVersion = "skills-catalog.v1";
const defaultRepoUrl = "https://github.com/GeorgeQLe/agentic-skills.git";

// Pinned root commit for reproducible catalog snapshots. Refresh deliberately:
// bump this SHA -> `pnpm catalog:import` -> commit the regenerated data/ files.
// `SKILLS_REPO_REF=master` (or any ref) and `SKILLS_REPO_REF=WORKTREE` still override.
const defaultRepoRef = "8b71c638a32df52daa3f1bdfe05f4116ae42a55f";

const skillsRepoUrl = process.env.SKILLS_REPO_URL || defaultRepoUrl;
const skillsRepoRef = process.env.SKILLS_REPO_REF || defaultRepoRef;

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function execGit(args, cwd) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function resolveSource() {
  if (
    existsSync(path.join(skillsRepoUrl, ".git")) &&
    ["WORKTREE", "worktree", "working-tree", "local"].includes(skillsRepoRef)
  ) {
    return skillsRepoUrl;
  }

  const tmp = path.join(tmpdir(), `agentic-skills-catalog-${Date.now()}-${process.pid}`);
  try {
    execGit(["clone", "--depth", "1", "--branch", skillsRepoRef, skillsRepoUrl, tmp], repoRoot);
  } catch {
    rmSync(tmp, { recursive: true, force: true });
    execGit(["clone", skillsRepoUrl, tmp], repoRoot);
    execGit(["checkout", skillsRepoRef], tmp);
  }
  return tmp;
}

function validateArtifact(name, value) {
  if (value.schema_version !== schemaVersion) {
    throw new Error(`${name} uses schema_version ${value.schema_version ?? "(missing)"}, expected ${schemaVersion}`);
  }
}

const sourceRoot = resolveSource();
const sourceExportRoot = path.join(sourceRoot, "exports", "skills-catalog", "v1");

try {
  const artifacts = {
    "catalog.json": readJson(path.join(sourceExportRoot, "catalog.json")),
    "proof.json": readJson(path.join(sourceExportRoot, "proof.json")),
    "manifest.json": readJson(path.join(sourceExportRoot, "manifest.json")),
  };

  for (const [name, value] of Object.entries(artifacts)) {
    validateArtifact(name, value);
  }

  mkdirSync(outRoot, { recursive: true });
  for (const fileName of Object.keys(artifacts)) {
    cpSync(path.join(sourceExportRoot, fileName), path.join(outRoot, fileName));
  }

  const importSource = {
    schema_version: schemaVersion,
    imported_at: "1970-01-01T00:00:00.000Z",
    skills_repo_url: skillsRepoUrl,
    skills_repo_ref: skillsRepoRef,
    source_commit: artifacts["catalog.json"].source_commit,
    source_fingerprint: artifacts["catalog.json"].source_fingerprint,
  };
  writeFileSync(path.join(outRoot, "import-source.json"), `${JSON.stringify(importSource, null, 2)}\n`);

  console.log(`Imported ${artifacts["catalog.json"].skill_count} skills from ${skillsRepoUrl} @ ${skillsRepoRef}`);
} finally {
  if (sourceRoot !== skillsRepoUrl) {
    rmSync(sourceRoot, { recursive: true, force: true });
  }
}
