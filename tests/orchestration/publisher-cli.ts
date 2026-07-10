import { CampaignStore } from "./campaign.js";
import { GitHubPublisherTransport } from "./github-publisher-transport.js";
import { REPO_ROOT } from "./paths.js";
import { PublisherCoordinator, type PublisherTransport } from "./publisher.js";

export interface PublisherCommandIo {
  stdout: Pick<NodeJS.WriteStream, "write">;
  stderr: Pick<NodeJS.WriteStream, "write">;
}

export function publisherHelpText(): string {
  return [
    "Continuous benchmark archive publisher",
    "",
    "Usage: pnpm bench:orchestration:publish --campaign <id> [options]",
    "",
    "Options:",
    "  --campaign <id>              required explicit full campaign",
    "  --poll-seconds <n>           polling interval (default 15)",
    "  --retry-base-seconds <n>     first retry delay (default 30)",
    "  --retry-max-seconds <n>      capped retry delay (default 900)",
    "  --once                       perform one sweep and exit",
    "  --dry-run                    report eligibility without writes",
    "  --json                       emit machine-readable JSONL events",
  ].join("\n");
}

function valueFor(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index < 0) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value`);
  return value;
}

function positiveSeconds(args: string[], flag: string, fallback: number): number {
  const raw = valueFor(args, flag);
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${flag} must be a positive number`);
  return value;
}

function validateFlags(args: string[]): void {
  const values = new Set(["--campaign", "--poll-seconds", "--retry-base-seconds", "--retry-max-seconds"]);
  const switches = new Set(["--once", "--dry-run", "--json", "--help", "-h"]);
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (values.has(argument)) { index++; continue; }
    if (switches.has(argument)) continue;
    throw new Error(`unknown publisher option: ${argument}`);
  }
}

export async function runPublisherCommand(
  args: string[],
  io: PublisherCommandIo = { stdout: process.stdout, stderr: process.stderr },
  transport?: PublisherTransport,
): Promise<number> {
  try {
    validateFlags(args);
    if (args.includes("--help") || args.includes("-h")) {
      io.stdout.write(`${publisherHelpText()}\n`);
      return 0;
    }
    const campaignId = valueFor(args, "--campaign");
    if (!campaignId) throw new Error("publisher requires --campaign <id>");
    const pollSeconds = positiveSeconds(args, "--poll-seconds", 15);
    const retryBaseSeconds = positiveSeconds(args, "--retry-base-seconds", 30);
    const retryMaxSeconds = positiveSeconds(args, "--retry-max-seconds", 900);
    if (retryMaxSeconds < retryBaseSeconds) throw new Error("--retry-max-seconds must be at least --retry-base-seconds");
    const store = new CampaignStore(campaignId);
    // Fail before transport preparation or lock creation if the campaign is not
    // locally present and owned by this benchmark design.
    store.load();
    const coordinator = new PublisherCoordinator({
      store,
      transport: transport ?? new GitHubPublisherTransport(REPO_ROOT),
      pollSeconds,
      retryBaseSeconds,
      retryMaxSeconds,
      once: args.includes("--once"),
      dryRun: args.includes("--dry-run"),
      json: args.includes("--json"),
      stdout: io.stdout,
      stderr: io.stderr,
    });
    const result = await coordinator.run();
    return result.failed > 0 ? 2 : 0;
  } catch (error) {
    const message = (error as Error).message;
    if (args.includes("--json")) io.stderr.write(`${JSON.stringify({ schemaVersion: 1, type: "publisher-fatal", message })}\n`);
    else io.stderr.write(`${message}\n`);
    return 1;
  }
}
