import { resolve, sep } from "node:path";

export const REPO_ROOT = resolve(import.meta.dirname, "../..");
export const EXPERIMENT_ROOT = resolve(REPO_ROOT, "experiments/sol-orchestration/v1");
export const GENERATED_RESULTS_ROOT = resolve(REPO_ROOT, "generated-results/sol-orchestration");

export function assertWithin(parent: string, candidate: string): string {
  const resolvedParent = resolve(parent);
  const resolvedCandidate = resolve(candidate);
  if (resolvedCandidate !== resolvedParent && !resolvedCandidate.startsWith(`${resolvedParent}${sep}`)) {
    throw new Error(`path escapes allowlisted root: ${resolvedCandidate}`);
  }
  return resolvedCandidate;
}

export function campaignRoot(campaignId: string): string {
  if (!/^[a-z0-9][a-z0-9._-]{2,80}$/i.test(campaignId)) {
    throw new Error(`invalid campaign id: ${campaignId}`);
  }
  return assertWithin(GENERATED_RESULTS_ROOT, resolve(GENERATED_RESULTS_ROOT, "campaigns", campaignId));
}
