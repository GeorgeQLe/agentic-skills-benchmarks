import { execSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { dirname } from "node:path";

export type ConfirmationGate = (action: string) => Promise<boolean>;

export interface DisposableRepo {
  repoName: string;
  repoUrl: string;
  localPath: string;
  cleanup: () => Promise<CleanupResult>;
}

export type CleanupResult =
  | { status: "cleaned" }
  | { status: "infrastructure-blocked"; reason: string };

export type CreateResult =
  | { status: "created"; repo: DisposableRepo }
  | { status: "infrastructure-blocked"; reason: string };

const REPO_PREFIX = "agentic-skills-bench";

function repoName(skillName: string): string {
  const ts = Math.floor(Date.now() / 1000);
  return `${REPO_PREFIX}-${skillName}-${ts}`;
}

export async function createDisposableRepo(
  skillName: string,
  confirm: ConfirmationGate,
): Promise<CreateResult> {
  const name = repoName(skillName);
  const cmd = `gh repo create ${name} --private --clone`;

  const approved = await confirm(
    `Create private GitHub repository: ${name}\nCommand: ${cmd}`,
  );

  if (!approved) {
    return {
      status: "infrastructure-blocked",
      reason: "User denied repository creation",
    };
  }

  const workDir = mkdtempSync(join(tmpdir(), `bench-${skillName}-`));

  try {
    execSync(`gh repo create ${name} --private --clone`, {
      cwd: workDir,
      stdio: "pipe",
      encoding: "utf-8",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      status: "infrastructure-blocked",
      reason: `gh repo create failed: ${message}`,
    };
  }

  const localPath = join(workDir, name);
  const repoUrl = `https://github.com/${getGhUser()}/${name}`;

  const repo: DisposableRepo = {
    repoName: name,
    repoUrl,
    localPath,
    cleanup: () => cleanupRepo(repoUrl, confirm),
  };

  return { status: "created", repo };
}

function getGhUser(): string {
  try {
    return execSync("gh api user --jq .login", {
      stdio: "pipe",
      encoding: "utf-8",
    }).trim();
  } catch {
    return "unknown";
  }
}

export function seedRepo(
  localPath: string,
  files: Record<string, string>,
): void {
  for (const [relativePath, content] of Object.entries(files)) {
    const fullPath = join(localPath, relativePath);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, content, "utf-8");
  }

  execSync("git add -A", { cwd: localPath, stdio: "pipe" });
  execSync('git commit -m "seed: initial fixture files"', {
    cwd: localPath,
    stdio: "pipe",
  });
  execSync("git push origin HEAD", { cwd: localPath, stdio: "pipe" });
}

export async function cleanupRepo(
  repoUrl: string,
  confirm: ConfirmationGate,
): Promise<CleanupResult> {
  const repoSlug = repoUrl.replace("https://github.com/", "");
  const cmd = `gh repo delete ${repoSlug} --yes`;

  const approved = await confirm(
    `Delete GitHub repository: ${repoSlug}\nCommand: ${cmd}`,
  );

  if (!approved) {
    return {
      status: "infrastructure-blocked",
      reason: "User denied repository deletion",
    };
  }

  try {
    execSync(cmd, { stdio: "pipe", encoding: "utf-8" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      status: "infrastructure-blocked",
      reason: `gh repo delete failed: ${message}`,
    };
  }

  return { status: "cleaned" };
}
