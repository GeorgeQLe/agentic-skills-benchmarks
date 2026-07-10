import { execFileSync, spawnSync } from "node:child_process";
import { gzipSync, gunzipSync } from "node:zlib";
import {
  closeSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  openSync,
  writeSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, relative, resolve, sep } from "node:path";
import { hashFile, sha256 } from "./canonical.js";
import { CampaignStore, type CampaignState } from "./campaign.js";
import { assertWithin } from "./paths.js";
import { loadChunks, scheduleFullChunk } from "./scheduler.js";
import { verifyRunOwnership } from "./isolation.js";

export interface ScanFinding {
  path: string;
  kind: "secret" | "credential-file" | "private-path" | "oversized";
  detail: string;
}

export interface ArchiveIndex {
  schemaVersion: 1;
  chunkId: string;
  chunkOrdinal: number;
  campaignId: string;
  expectedRuns: number;
  runIds: string[];
  archive: string;
  sha256: string;
  bytes: number;
  storage: "github-release-assets";
  releaseTag: string;
  partBytes: number;
  parts: ArchivePart[];
  createdAt: string;
}

export interface ArchivePart {
  ordinal: number;
  name: string;
  sha256: string;
  bytes: number;
}

export const ARCHIVE_PART_BYTES = 64 * 1024 * 1024;

function collectFiles(root: string, filter: (relativePath: string) => boolean): string[] {
  const result: string[] = [];
  const visit = (dir: string) => {
    for (const name of readdirSync(dir).sort()) {
      const path = resolve(dir, name);
      const stats = lstatSync(path);
      const rel = relative(root, path).split(sep).join("/");
      if (stats.isSymbolicLink()) throw new Error(`refusing to archive symlink: ${rel}`);
      if (stats.isDirectory()) visit(path);
      else if (stats.isFile() && filter(rel)) result.push(path);
    }
  };
  if (existsSync(root)) visit(root);
  return result;
}

export function scanArchiveInputs(root: string, files: string[], maxFileBytes = 100 * 1024 * 1024): ScanFinding[] {
  const findings: ScanFinding[] = [];
  const secretPatterns: Array<[RegExp, string]> = [
    [/\b(?:sk|sk-proj|sk-ant)-[A-Za-z0-9_-]{16,}\b/g, "provider token pattern"],
    [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g, "private key"],
    [/(?:OPENAI_API_KEY|OPENAI_ADMIN_KEY|ANTHROPIC_API_KEY)\s*[=:]\s*["']?[A-Za-z0-9_-]{8,}/g, "credential assignment"],
    [/gh[oprsu]_[A-Za-z0-9]{20,}/g, "GitHub token pattern"],
    [/\bAKIA[A-Z0-9]{16}\b/g, "AWS access key pattern"],
  ];
  for (const path of files) {
    const rel = relative(root, path).split(sep).join("/");
    const stats = statSync(path);
    if (stats.size > maxFileBytes) findings.push({ path: rel, kind: "oversized", detail: `${stats.size} bytes` });
    if (
      basename(path) === ".release-config"
      || /(?:^|\/)\.env(?:\.|$)/.test(rel)
      || /(?:^|\/)(?:\.ssh|\.aws|\.config\/gh)(?:\/|$)/.test(rel)
      || /(?:^|\/)(?:\.npmrc|\.pypirc|\.netrc|credentials|id_rsa|id_ed25519)$/.test(rel)
    ) {
      findings.push({ path: rel, kind: "credential-file", detail: "credential-bearing filename" });
      continue;
    }
    if (stats.size > 5 * 1024 * 1024) continue;
    let text: string;
    try { text = readFileSync(path, "utf8"); } catch { continue; }
    for (const [pattern, detail] of secretPatterns) {
      pattern.lastIndex = 0;
      if (pattern.test(text)) findings.push({ path: rel, kind: "secret", detail });
    }
    if (/\/(?:Users|home)\/[A-Za-z0-9._-]+\//.test(text)) {
      findings.push({ path: rel, kind: "private-path", detail: "absolute home-directory path" });
    }
  }
  return findings;
}

function octal(value: number, width: number): Buffer {
  return Buffer.from(`${value.toString(8).padStart(width - 1, "0")}\0`, "ascii");
}

function tarHeader(name: string, size: number): Buffer {
  if (Buffer.byteLength(name) > 100) throw new Error(`archive path exceeds deterministic ustar limit: ${name}`);
  const header = Buffer.alloc(512, 0);
  header.write(name, 0, 100, "utf8");
  octal(0o644, 8).copy(header, 100);
  octal(0, 8).copy(header, 108);
  octal(0, 8).copy(header, 116);
  octal(size, 12).copy(header, 124);
  octal(0, 12).copy(header, 136);
  Buffer.from("        ").copy(header, 148);
  header[156] = "0".charCodeAt(0);
  Buffer.from("ustar\0", "ascii").copy(header, 257);
  Buffer.from("00", "ascii").copy(header, 263);
  Buffer.from("sol-benchmark", "ascii").copy(header, 265);
  Buffer.from("sol-benchmark", "ascii").copy(header, 297);
  const checksum = header.reduce((sum, byte) => sum + byte, 0);
  Buffer.from(`${checksum.toString(8).padStart(6, "0")}\0 `, "ascii").copy(header, 148);
  return header;
}

export function deterministicTarGzip(root: string, files: string[]): Buffer {
  const chunks: Buffer[] = [];
  for (const path of [...files].sort((a, b) => relative(root, a).localeCompare(relative(root, b)))) {
    const name = relative(root, path).split(sep).join("/");
    const content = readFileSync(path);
    chunks.push(tarHeader(name, content.length), content);
    const padding = (512 - content.length % 512) % 512;
    if (padding) chunks.push(Buffer.alloc(padding, 0));
  }
  chunks.push(Buffer.alloc(1024, 0));
  return gzipSync(Buffer.concat(chunks), { level: 9 });
}

export function splitArchiveBuffer(
  archive: Buffer,
  archiveDir: string,
  archiveName: string,
  partBytes = ARCHIVE_PART_BYTES,
): ArchivePart[] {
  if (!Number.isInteger(partBytes) || partBytes < 1024) throw new Error("archive part size must be at least 1024 bytes");
  const parts: ArchivePart[] = [];
  for (let offset = 0, ordinal = 0; offset < archive.length; offset += partBytes, ordinal++) {
    const content = archive.subarray(offset, Math.min(offset + partBytes, archive.length));
    const name = `${archiveName}.part-${String(ordinal).padStart(4, "0")}`;
    writeFileSync(resolve(archiveDir, name), content, { flag: "wx" });
    parts.push({ ordinal, name, sha256: sha256(content), bytes: content.length });
  }
  if (parts.length === 0) throw new Error("refusing to publish an empty archive");
  if (parts.length > 1_000) throw new Error("archive would exceed GitHub's 1000-assets-per-release limit");
  return parts;
}

/** Materialize deterministic multipart files without discarding a valid partial attempt. */
export function materializeArchiveParts(
  archive: Buffer,
  archiveDir: string,
  archiveName: string,
  partBytes = ARCHIVE_PART_BYTES,
): ArchivePart[] {
  if (!Number.isInteger(partBytes) || partBytes < 1024) throw new Error("archive part size must be at least 1024 bytes");
  const parts: ArchivePart[] = [];
  for (let offset = 0, ordinal = 0; offset < archive.length; offset += partBytes, ordinal++) {
    const content = archive.subarray(offset, Math.min(offset + partBytes, archive.length));
    const name = `${archiveName}.part-${String(ordinal).padStart(4, "0")}`;
    const path = resolve(archiveDir, name);
    const expected = { ordinal, name, sha256: sha256(content), bytes: content.length };
    if (existsSync(path)) {
      if (statSync(path).size !== expected.bytes || hashFile(path) !== expected.sha256) {
        rmSync(path, { force: true });
        writeFileSync(path, content, { flag: "wx" });
      }
    } else {
      writeFileSync(path, content, { flag: "wx" });
    }
    parts.push(expected);
  }
  if (parts.length === 0) throw new Error("refusing to publish an empty archive");
  if (parts.length > 1_000) throw new Error("archive would exceed GitHub's 1000-assets-per-release limit");
  return parts;
}

export function reassembleArchiveParts(partsRoot: string, parts: ArchivePart[], target: string): void {
  const ordered = [...parts].sort((a, b) => a.ordinal - b.ordinal);
  if (ordered.some((part, index) => part.ordinal !== index)) throw new Error("archive part ordinals are incomplete or duplicated");
  const output = openSync(target, "wx", 0o600);
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  try {
    for (const part of ordered) {
      const path = resolve(partsRoot, part.name);
      const stats = statSync(path);
      if (stats.size !== part.bytes || hashFile(path) !== part.sha256) throw new Error(`archive part checksum failed: ${part.name}`);
      const input = openSync(path, "r");
      try {
        let bytesRead = 0;
        while ((bytesRead = readSync(input, buffer, 0, buffer.length, null)) > 0) writeSync(output, buffer, 0, bytesRead);
      } finally {
        closeSync(input);
      }
    }
  } finally {
    closeSync(output);
  }
}

function compactChunkFiles(campaignRoot: string, runIds: string[]): string[] {
  const files: string[] = [];
  for (const runId of runIds) {
    const runRoot = resolve(campaignRoot, "runs", runId);
    verifyRunOwnership(runRoot, runId);
    const resultPath = resolve(runRoot, "result.json");
    if (!existsSync(resultPath)) throw new Error(`chunk run is incomplete: ${runId}`);
    files.push(...collectFiles(runRoot, (path) =>
      path === "identity.json"
      || path === "result.json"
      || /^attempts\/attempt-\d{3}\/(?:trace\.jsonl|ledger\.jsonl|fixture\.sha256)$/.test(path)
      || /^attempts\/attempt-\d{3}\/artifacts\//.test(path),
    ));
  }
  return files;
}

export function createChunkArchive(store: CampaignStore, state: CampaignState, chunkOrdinal: number): ArchiveIndex {
  const scheduled = scheduleFullChunk(chunkOrdinal);
  const runIds = scheduled.map((entry) => entry.run.id);
  const chunks = Object.values(state.chunks);
  const existing = chunks.find((chunk) => chunk.ordinal === chunkOrdinal);
  const manifestChunk = loadChunks()[chunkOrdinal];
  if (!manifestChunk) throw new Error(`unknown immutable chunk ordinal: ${chunkOrdinal}`);
  if (existing && existing.chunkId !== manifestChunk.id) throw new Error(`campaign chunk ownership mismatch at ordinal ${chunkOrdinal}`);
  const chunkId = manifestChunk.id;
  const archiveDir = resolve(store.root, "archives");
  const existingIndexPath = resolve(archiveDir, `${chunkId}.index.json`);
  const selected = compactChunkFiles(store.root, runIds);
  // Aggregate reports evolve as later chunks finish. Keep only immutable run
  // artifacts in the raw archive so interrupted creation can always be resumed
  // to the same bytes.
  const files = selected;
  const findings = scanArchiveInputs(store.root, files);
  if (findings.length > 0) throw new Error(`archive scan failed:\n${findings.map((finding) => `- ${finding.path}: ${finding.kind} (${finding.detail})`).join("\n")}`);
  mkdirSync(archiveDir, { recursive: true });
  const archiveName = `${chunkId}.tar.gz`;
  const archivePath = resolve(archiveDir, archiveName);
  const archive = deterministicTarGzip(store.root, files);
  const archiveSha256 = sha256(archive);
  if (existsSync(existingIndexPath)) {
    const existing = JSON.parse(readFileSync(existingIndexPath, "utf8")) as ArchiveIndex;
    if (
      existing.schemaVersion !== 1
      || existing.campaignId !== state.id
      || existing.chunkId !== chunkId
      || existing.chunkOrdinal !== chunkOrdinal
      || existing.expectedRuns !== runIds.length
      || existing.runIds.join("\0") !== runIds.join("\0")
      || existing.archive !== archiveName
      || existing.sha256 !== archiveSha256
      || existing.bytes !== archive.length
    ) {
      throw new Error(`existing archive index ownership or checksum mismatch for ${chunkId}`);
    }
  }
  if (existsSync(archivePath)) {
    if (statSync(archivePath).size !== archive.length || hashFile(archivePath) !== archiveSha256) {
      rmSync(archivePath, { force: true });
      writeFileSync(archivePath, archive, { flag: "wx" });
    }
  } else {
    writeFileSync(archivePath, archive, { flag: "wx" });
  }
  const parts = materializeArchiveParts(archive, archiveDir, archiveName);
  const index: ArchiveIndex = {
    schemaVersion: 1,
    chunkId,
    chunkOrdinal,
    campaignId: state.id,
    expectedRuns: runIds.length,
    runIds,
    archive: archiveName,
    sha256: archiveSha256,
    bytes: archive.length,
    storage: "github-release-assets",
    releaseTag: `archive-${state.id}-${chunkId}`,
    partBytes: ARCHIVE_PART_BYTES,
    parts,
    createdAt: existsSync(existingIndexPath)
      ? (JSON.parse(readFileSync(existingIndexPath, "utf8")) as ArchiveIndex).createdAt
      : new Date().toISOString(),
  };
  if (existsSync(existingIndexPath)) {
    const existing = JSON.parse(readFileSync(existingIndexPath, "utf8")) as ArchiveIndex;
    if (JSON.stringify(existing.parts) !== JSON.stringify(parts)) throw new Error(`existing archive part index mismatch for ${chunkId}`);
  } else {
    const temporaryIndex = resolve(archiveDir, `.${chunkId}.index-${process.pid}-${Date.now()}.tmp`);
    writeFileSync(temporaryIndex, `${JSON.stringify(index, null, 2)}\n`, { flag: "wx", mode: 0o600 });
    renameSync(temporaryIndex, existingIndexPath);
  }
  return index;
}

function commandOk(command: string, args: string[]): boolean {
  const result = spawnSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  return result.status === 0;
}

export function assertPublishingPrerequisites(): void {
  if (!commandOk("gh", ["auth", "status", "--hostname", "github.com"])) {
    throw new Error("GitHub CLI authentication is unavailable or invalid; results remain local and are not eligible for cleanup");
  }
}

function githubSlug(repo: string): { owner: string; name: string; slug: string } {
  const url = execFileSync("git", ["remote", "get-url", "origin"], { cwd: repo, encoding: "utf8" }).trim();
  const match = url.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (!match) throw new Error(`cannot derive GitHub repository from origin: ${url}`);
  const owner = match[1];
  const name = match[2];
  return { owner, name, slug: `${owner}/${name}` };
}

function downloadReleaseParts(input: {
  slug: string;
  index: ArchiveIndex;
  targetDir: string;
}): string {
  mkdirSync(input.targetDir, { recursive: true });
  execFileSync(
    "gh",
    [
      "release", "download", input.index.releaseTag,
      "--repo", input.slug,
      "--pattern", `${input.index.archive}.part-*`,
      "--dir", input.targetDir,
    ],
    { stdio: "pipe" },
  );
  const archive = resolve(input.targetDir, input.index.archive);
  reassembleArchiveParts(input.targetDir, input.index.parts, archive);
  if (statSync(archive).size !== input.index.bytes || hashFile(archive) !== input.index.sha256) {
    throw new Error("reassembled GitHub release archive checksum does not match the committed index");
  }
  return archive;
}

function parseOctal(buffer: Buffer): number {
  return Number.parseInt(buffer.toString("ascii").replace(/\0.*$/, "").trim() || "0", 8);
}

export function extractDeterministicArchive(archivePath: string, targetRoot: string): void {
  const tar = gunzipSync(readFileSync(archivePath));
  let offset = 0;
  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const name = header.subarray(0, 100).toString("utf8").replace(/\0.*$/, "");
    const size = parseOctal(header.subarray(124, 136));
    if (!name || name.startsWith("/") || name.split("/").includes("..")) throw new Error(`unsafe archive entry: ${name}`);
    const target = assertWithin(targetRoot, resolve(targetRoot, name));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, tar.subarray(offset + 512, offset + 512 + size), { flag: "wx" });
    offset += 512 + Math.ceil(size / 512) * 512;
  }
}

export function retrieveArchivedRun(input: {
  resultsRepo: string;
  campaignId: string;
  runId: string;
  cacheRoot: string;
}): string {
  assertPublishingPrerequisites();
  execFileSync("git", ["pull", "--ff-only"], { cwd: input.resultsRepo, stdio: "pipe" });
  const indexesRoot = resolve(input.resultsRepo, "indexes", input.campaignId);
  if (!existsSync(indexesRoot)) throw new Error("campaign indexes are unavailable in the results repository");
  const indexPath = readdirSync(indexesRoot).sort().map((name) => resolve(indexesRoot, name)).find((path) => {
    const index = JSON.parse(readFileSync(path, "utf8")) as ArchiveIndex;
    return index.runIds.includes(input.runId);
  });
  if (!indexPath) throw new Error(`no archived chunk contains ${input.runId}`);
  const index = JSON.parse(readFileSync(indexPath, "utf8")) as ArchiveIndex;
  const target = assertWithin(input.cacheRoot, resolve(input.cacheRoot, input.campaignId, index.chunkId));
  const complete = resolve(target, ".verified");
  if (!existsSync(complete)) {
    rmSync(target, { recursive: true, force: true });
    mkdirSync(target, { recursive: true });
    const archive = downloadReleaseParts({
      slug: githubSlug(input.resultsRepo).slug,
      index,
      targetDir: resolve(target, "release-parts"),
    });
    extractDeterministicArchive(archive, target);
    rmSync(resolve(target, "release-parts"), { recursive: true, force: true });
    writeFileSync(complete, `${index.sha256}\n`, { flag: "wx" });
  }
  const result = resolve(target, "runs", input.runId);
  if (!existsSync(result)) throw new Error(`archive did not contain ${input.runId}`);
  return result;
}
