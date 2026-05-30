import { execSync, execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
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

// Only ever delete repositories this harness created: `<owner>/agentic-skills-bench-*`.
// The owner segment must be a real GitHub login, never the `getGhUser()` "unknown"
// fallback. Restricting to `[\w.-]` also bars shell metacharacters, so the slug is
// safe to pass even through a shell — though we use execFileSync to avoid one entirely.
const BENCH_SLUG_RE = /^[\w.-]+\/agentic-skills-bench-[\w.-]+$/;

export function isSafeBenchRepoSlug(slug: string): boolean {
  if (!BENCH_SLUG_RE.test(slug)) return false;
  const owner = slug.split("/")[0];
  return owner !== "" && owner !== "unknown";
}

function removeLocalDir(dir: string | undefined): void {
  if (!dir) return;
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    // Best-effort: a leaked temp dir is not worth failing cleanup over.
  }
}

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
    cleanup: () => cleanupRepo(repoUrl, confirm, workDir),
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
  localDir?: string,
): Promise<CleanupResult> {
  // Reclaim the local clone/temp dir first — always safe, and otherwise leaked
  // since a 100-run benchmark would otherwise pile up 100+ cloned repos on disk.
  removeLocalDir(localDir);

  const repoSlug = repoUrl.replace("https://github.com/", "");

  // Refuse to delete anything that is not a repo this harness created. Guards
  // against the `getGhUser()` "unknown" fallback targeting `unknown/<name>` and
  // against any malformed/injected slug.
  if (!isSafeBenchRepoSlug(repoSlug)) {
    return {
      status: "infrastructure-blocked",
      reason: `refused: unsafe repo slug "${repoSlug}" (expected <owner>/agentic-skills-bench-*)`,
    };
  }

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
    // execFileSync (not execSync) so the slug is a single argv element, never
    // interpreted by a shell.
    execFileSync("gh", ["repo", "delete", repoSlug, "--yes"], {
      stdio: "pipe",
      encoding: "utf-8",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      status: "infrastructure-blocked",
      reason: `gh repo delete failed: ${message}`,
    };
  }

  return { status: "cleaned" };
}
