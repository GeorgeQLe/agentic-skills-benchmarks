import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { assertPublishingPrerequisites } from "./archive.js";
import { assertWithin } from "./paths.js";
import type { PublisherAsset, PublisherRemoteFile, PublisherTransport } from "./publisher.js";

interface ResultsRepository {
  owner: string;
  name: string;
  slug: string;
  localPath: string;
}

function commandOk(command: string, args: string[], cwd?: string): boolean {
  return spawnSync(command, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).status === 0;
}

function githubOrigin(repo: string): { owner: string; name: string } {
  const url = execFileSync("git", ["remote", "get-url", "origin"], { cwd: repo, encoding: "utf8" }).trim();
  const match = url.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (!match) throw new Error(`cannot derive GitHub repository from origin: ${url}`);
  return { owner: match[1], name: match[2] };
}

/** Real private-repository/release transport. Tests inject an in-memory fake. */
export class GitHubPublisherTransport implements PublisherTransport {
  private repository?: ResultsRepository;

  constructor(private readonly codeRepoRoot: string) {}

  async prepare(): Promise<void> {
    assertPublishingPrerequisites();
    const { owner } = githubOrigin(this.codeRepoRoot);
    const name = "agentic-skills-benchmark-results";
    const slug = `${owner}/${name}`;
    const visibility = spawnSync("gh", ["repo", "view", slug, "--json", "visibility", "--jq", ".visibility"], { encoding: "utf8" });
    if (visibility.status === 0 && visibility.stdout.trim().toUpperCase() !== "PRIVATE") {
      throw new Error(`results repository ${slug} exists but is not private`);
    }
    if (visibility.status !== 0) {
      execFileSync(
        "gh",
        ["repo", "create", slug, "--private", "--description", "Private raw and aggregate results for agentic-skills orchestration benchmarks"],
        { stdio: "pipe" },
      );
    }
    const localPath = resolve(this.codeRepoRoot, "..", name);
    if (!existsSync(localPath)) {
      execFileSync("git", ["clone", `https://github.com/${slug}.git`, localPath], { stdio: "pipe" });
    } else {
      const localOrigin = githubOrigin(localPath);
      if (localOrigin.owner !== owner || localOrigin.name !== name) throw new Error(`results checkout origin ownership mismatch: ${localPath}`);
    }
    if (commandOk("git", ["rev-parse", "--verify", "HEAD"], localPath)) {
      execFileSync("git", ["pull", "--ff-only"], { cwd: localPath, stdio: "pipe" });
    }
    this.repository = { owner, name, slug, localPath };
  }

  private ready(): ResultsRepository {
    if (!this.repository) throw new Error("publisher transport was not prepared");
    return this.repository;
  }

  async pushFiles(files: PublisherRemoteFile[], message: string): Promise<string> {
    const repository = this.ready();
    if (commandOk("git", ["rev-parse", "--verify", "HEAD"], repository.localPath)) {
      execFileSync("git", ["pull", "--rebase"], { cwd: repository.localPath, stdio: "pipe" });
    }
    const roots = new Set<string>();
    for (const file of files) {
      if (!existsSync(file.source)) throw new Error(`publisher metadata source is missing: ${file.source}`);
      if (file.target.startsWith("/") || file.target.split("/").includes("..")) throw new Error(`unsafe remote publisher path: ${file.target}`);
      const target = assertWithin(repository.localPath, resolve(repository.localPath, file.target));
      mkdirSync(dirname(target), { recursive: true });
      cpSync(file.source, target);
      roots.add(file.target.split("/")[0]);
    }
    execFileSync("git", ["add", "--all", "--", ...[...roots].sort()], { cwd: repository.localPath, stdio: "pipe" });
    if (!commandOk("git", ["diff", "--cached", "--quiet"], repository.localPath)) {
      execFileSync(
        "git",
        ["-c", "user.name=Sol Benchmark", "-c", "user.email=benchmark.invalid", "commit", "-m", message],
        { cwd: repository.localPath, stdio: "pipe" },
      );
    }
    execFileSync("git", ["push", "origin", "HEAD"], { cwd: repository.localPath, stdio: "pipe" });
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repository.localPath, encoding: "utf8" }).trim();
  }

  async ensureRelease(input: { tag: string; targetCommit: string; title: string; notes: string }): Promise<void> {
    const repository = this.ready();
    if (commandOk("gh", ["release", "view", input.tag, "--repo", repository.slug])) return;
    execFileSync(
      "gh",
      [
        "release", "create", input.tag,
        "--repo", repository.slug,
        "--target", input.targetCommit,
        "--title", input.title,
        "--notes", input.notes,
      ],
      { stdio: "pipe" },
    );
  }

  async listReleaseAssets(tag: string): Promise<PublisherAsset[]> {
    const repository = this.ready();
    const raw = execFileSync(
      "gh",
      ["release", "view", tag, "--repo", repository.slug, "--json", "assets"],
      { encoding: "utf8" },
    );
    const parsed = JSON.parse(raw) as { assets?: Array<{ name?: string; size?: number; digest?: string }> };
    return (parsed.assets ?? []).map((asset) => {
      if (typeof asset.name !== "string" || typeof asset.size !== "number") throw new Error("GitHub returned malformed release asset metadata");
      return { name: asset.name, bytes: asset.size, ...(asset.digest ? { sha256: asset.digest } : {}) };
    });
  }

  async uploadReleaseAsset(tag: string, source: string, name: string): Promise<void> {
    const repository = this.ready();
    if (basename(source) !== name) throw new Error(`release asset source/name mismatch: ${name}`);
    execFileSync("gh", ["release", "upload", tag, source, "--repo", repository.slug], { stdio: "pipe" });
  }

  async deleteReleaseAsset(tag: string, name: string): Promise<void> {
    const repository = this.ready();
    execFileSync("gh", ["release", "delete-asset", tag, name, "--repo", repository.slug, "--yes"], { stdio: "pipe" });
  }

  async cloneAtCommit(commit: string, target: string): Promise<void> {
    const repository = this.ready();
    execFileSync("git", ["clone", "--no-checkout", `https://github.com/${repository.slug}.git`, target], { stdio: "pipe" });
    execFileSync("git", ["checkout", commit], { cwd: target, stdio: "pipe" });
  }

  async downloadReleaseAsset(tag: string, name: string, target: string): Promise<void> {
    const repository = this.ready();
    if (basename(target) !== name) throw new Error(`release download target/name mismatch: ${name}`);
    mkdirSync(dirname(target), { recursive: true });
    execFileSync(
      "gh",
      ["release", "download", tag, "--repo", repository.slug, "--pattern", name, "--dir", dirname(target)],
      { stdio: "pipe" },
    );
    if (!existsSync(target)) throw new Error(`GitHub release download did not produce ${name}`);
  }
}
